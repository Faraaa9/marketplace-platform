/**
 * Conversation state-machine tests. No test framework — the project has none —
 * so this is a self-contained script: build mocked BotDeps, drive updates
 * through handleUpdate, and assert observable effects. Run via:
 *   pnpm test:telegram
 * conversation.ts only imports ./format at runtime, so this needs no DB or env.
 */
import assert from "node:assert/strict";
import { handleUpdate, type BotDeps, type SessionRow } from "../conversation";
import type { TgUpdate } from "../types";
import type { ImproveDescriptionResult } from "@/lib/ai-improve";
import type { CreateServiceRequestInput } from "@/lib/service-requests/create";

const FROM = { id: 42, first_name: "Jonas" };
const CHAT = 100;

const IMPROVE_RESULT: ImproveDescriptionResult = {
  improvedDescription:
    "Reikia patyrusio plytelių klijuotojo vonios kambariui Vilniuje. Plotas apie 6 kv. m.",
  title: "Plytelių klijavimas vonioje",
  categories: ["plyteliu-klijavimas"],
  category: "plyteliu-klijavimas",
  location: "Vilnius",
  budget: "iki 800 EUR",
  deadline: "gegužės pabaiga",
  recommendations: [],
};

interface SentMessage {
  chatId: number;
  text: string;
  opts?: Parameters<BotDeps["sendMessage"]>[2];
}

function makeDeps(overrides: Partial<BotDeps> = {}) {
  const sent: SentMessage[] = [];
  const store = new Map<string, SessionRow>();
  const calls = { improve: 0, transcribe: 0, create: 0, findOrCreate: 0, upload: 0 };
  let lastCreateInput: CreateServiceRequestInput | null = null;
  let lastPhoneArg: string | null = null;
  let lastCategoryFallbackText: string | undefined;

  const deps: BotDeps = {
    async sendMessage(chatId, text, opts) {
      sent.push({ chatId, text, opts });
    },
    async answerCallbackQuery() {},
    async downloadFile() {
      return Buffer.from("media");
    },
    async uploadPhoto() {
      calls.upload++;
      return `https://res.cloudinary.com/demo/image/upload/v1/requests/telegram/p${calls.upload}.jpg`;
    },
    async transcribe() {
      calls.transcribe++;
      return "Reikia plytelių klijuotojo vonioje Vilniuje iki 800 eurų.";
    },
    async improve() {
      calls.improve++;
      return IMPROVE_RESULT;
    },
    async resolveCategories(slugs, fallbackText) {
      lastCategoryFallbackText = fallbackText;
      return slugs.length ? [{ id: "cat1", name: "Plytelių klijavimas" }] : [];
    },
    async findOrCreateUserByPhone(phone) {
      calls.findOrCreate++;
      lastPhoneArg = phone;
      return { userId: "user1" };
    },
    async getStoredEmail() {
      return "tg-37060000000@telegram.paslaugurinka.lt";
    },
    async createServiceRequest(input) {
      calls.create++;
      lastCreateInput = input;
      return { ok: true, trackingToken: "tok123", moderationStatus: "APPROVED" };
    },
    async getSession(telegramUserId, chatId) {
      return (
        store.get(String(telegramUserId)) ?? {
          telegramUserId,
          chatId,
          userId: null,
          state: "idle",
          draft: null,
          phone: null,
        }
      );
    },
    async saveSession(session) {
      store.set(String(session.telegramUserId), session);
    },
    async rateLimit() {
      return true;
    },
    async rateLimitPhoto() {
      return true;
    },
    baseUrl: "https://paslaugurinka.lt",
    ...overrides,
  };

  return {
    deps,
    sent,
    calls,
    session: () => store.get(String(FROM.id)),
    lastCreateInput: () => lastCreateInput,
    lastPhoneArg: () => lastPhoneArg,
    lastCategoryFallbackText: () => lastCategoryFallbackText,
    last: () => sent[sent.length - 1],
  };
}

const textUpdate = (text: string): TgUpdate => ({
  update_id: 1,
  message: { message_id: 1, from: FROM, chat: { id: CHAT }, text },
});
const voiceUpdate = (): TgUpdate => ({
  update_id: 1,
  message: {
    message_id: 1,
    from: FROM,
    chat: { id: CHAT },
    voice: { file_id: "f1", duration: 3, mime_type: "audio/ogg" },
  },
});
const callbackUpdate = (data: string): TgUpdate => ({
  update_id: 1,
  callback_query: { id: "cb1", from: FROM, data, message: { message_id: 2, chat: { id: CHAT } } },
});
const photoUpdate = (caption?: string): TgUpdate => ({
  update_id: 1,
  message: {
    message_id: 9,
    from: FROM,
    chat: { id: CHAT },
    photo: [
      { file_id: "p_small", file_unique_id: "u1", width: 90, height: 90 },
      { file_id: "p_large", file_unique_id: "u2", width: 1280, height: 1280 },
    ],
    ...(caption ? { caption } : {}),
  },
});
const contactUpdate = (): TgUpdate => ({
  update_id: 1,
  message: {
    message_id: 3,
    from: FROM,
    chat: { id: CHAT },
    contact: { phone_number: "+37060000000", user_id: FROM.id, first_name: "Jonas" },
  },
});

type Test = [name: string, fn: () => Promise<void>];

const tests: Test[] = [
  [
    "full happy path: /start -> text -> confirm -> contact -> published",
    async () => {
      const t = makeDeps();
      await handleUpdate(textUpdate("/start"), t.deps);
      assert.match(t.last().text, /Sveiki/);
      assert.equal(t.session()!.state, "awaiting_input");

      await handleUpdate(
        textUpdate("Reikia plytelių klijuotojo vonioje Vilniuje, biudžetas iki 800."),
        t.deps,
      );
      assert.equal(t.calls.improve, 1);
      assert.ok(t.last().opts?.inlineKeyboard, "draft should carry inline buttons");
      assert.equal(t.session()!.state, "draft_ready");
      assert.ok(t.session()!.draft, "draft should be stored");

      await handleUpdate(callbackUpdate("confirm"), t.deps);
      assert.equal(t.session()!.state, "awaiting_contact");
      assert.ok(t.last().opts?.requestContact, "should request contact");
      assert.equal(t.calls.create, 0, "must not publish before contact");

      await handleUpdate(contactUpdate(), t.deps);
      assert.equal(t.calls.findOrCreate, 1);
      assert.equal(t.calls.create, 1);
      const input = t.lastCreateInput()!;
      assert.equal(input.contactPreVerified, true);
      assert.equal(input.clientId, "user1");
      assert.equal(input.source, "telegram");
      assert.equal(input.categoryIds.length, 1);
      assert.match(input.clientEmail, /@/);
      assert.match(t.last().text, /tok123/);
      assert.equal(t.session()!.state, "idle");
      assert.equal(t.session()!.draft, null);
    },
  ],
  [
    "voice note is transcribed then improved",
    async () => {
      const t = makeDeps();
      await handleUpdate(voiceUpdate(), t.deps);
      assert.equal(t.calls.transcribe, 1);
      assert.equal(t.calls.improve, 1);
      assert.equal(t.session()!.state, "draft_ready");
    },
  ],
  [
    "cancel clears the draft",
    async () => {
      const t = makeDeps();
      await handleUpdate(textUpdate("Reikia dažytojo dideliam kambariui Kaune."), t.deps);
      await handleUpdate(callbackUpdate("cancel"), t.deps);
      assert.equal(t.session()!.state, "idle");
      assert.equal(t.session()!.draft, null);
      assert.match(t.last().text, /Atšaukta/);
    },
  ],
  [
    "category resolution receives the original text for fallback matching",
    async () => {
      const description = "Reikia santechniko, po kriaukle bėga vanduo Vilniuje.";
      const t = makeDeps({
        async improve() {
          t.calls.improve++;
          return { ...IMPROVE_RESULT, categories: [], category: "" };
        },
        async resolveCategories(slugs, fallbackText) {
          assert.deepEqual(slugs, []);
          assert.equal(fallbackText, description);
          return [{ id: "plumbing", name: "Smulkūs santechnikos darbai" }];
        },
      });
      await handleUpdate(textUpdate(description), t.deps);
      assert.equal(t.calls.improve, 1);
      assert.equal(t.session()!.state, "draft_ready");
      assert.deepEqual(t.session()!.draft?.categoryIds, ["plumbing"]);
    },
  ],
  [
    "no resolvable category blocks the draft",
    async () => {
      const t = makeDeps({ async resolveCategories() { return []; } });
      await handleUpdate(textUpdate("Noriu kažko visai nesuprantamo ir neaiškaus."), t.deps);
      assert.match(t.last().text, /kategorij/i);
      assert.equal(t.session()!.state, "awaiting_input");
      assert.ok(!t.session()!.draft);
    },
  ],
  [
    "too-short input never calls the AI",
    async () => {
      const t = makeDeps();
      await handleUpdate(textUpdate("trumpa"), t.deps);
      assert.equal(t.calls.improve, 0);
      assert.match(t.last().text, /daugiau/);
    },
  ],
  [
    "pending moderation yields the review message",
    async () => {
      const t = makeDeps({
        async createServiceRequest() {
          return { ok: true, trackingToken: "tokP", moderationStatus: "PENDING" };
        },
      });
      await handleUpdate(textUpdate("Reikia elektriko buto remontui Klaipėdoje."), t.deps);
      await handleUpdate(callbackUpdate("confirm"), t.deps);
      await handleUpdate(contactUpdate(), t.deps);
      assert.match(t.last().text, /peržiūr/);
    },
  ],
  [
    "publish failure keeps the draft for retry",
    async () => {
      const t = makeDeps({
        async createServiceRequest() {
          return { ok: false, code: "MODERATION_REJECTED", message: "Aptikta netinkamo turinio." };
        },
      });
      await handleUpdate(textUpdate("Reikia santechniko vonios remontui Vilniuje."), t.deps);
      await handleUpdate(callbackUpdate("confirm"), t.deps);
      await handleUpdate(contactUpdate(), t.deps);
      assert.match(t.last().text, /netinkamo/);
      assert.equal(t.session()!.state, "draft_ready");
      assert.ok(t.session()!.draft, "draft retained after failure");
    },
  ],
  [
    "typing a number while awaiting contact re-prompts for the button (never trusts typed text)",
    async () => {
      const t = makeDeps();
      await handleUpdate(textUpdate("Reikia stogdengio dvišlaičiam stogui Panevėžyje."), t.deps);
      await handleUpdate(callbackUpdate("confirm"), t.deps);
      assert.equal(t.session()!.state, "awaiting_contact");

      const improveBefore = t.calls.improve;
      await handleUpdate(textUpdate("+37067188547"), t.deps);
      assert.equal(t.calls.improve, improveBefore, "typed number must not start a new draft");
      assert.equal(t.calls.create, 0, "typed number must not publish");
      assert.equal(t.session()!.state, "awaiting_contact");
      assert.ok(t.last().opts?.requestContact, "should re-show the contact button");
    },
  ],
  [
    "international contact without a leading + gets one (E164) before linking",
    async () => {
      const t = makeDeps();
      await handleUpdate(textUpdate("Reikia plytelių klijuotojo vonioje Vilniuje iki 800."), t.deps);
      await handleUpdate(callbackUpdate("confirm"), t.deps);
      const noPlus: TgUpdate = {
        update_id: 1,
        message: {
          message_id: 5,
          from: FROM,
          chat: { id: CHAT },
          contact: { phone_number: "66641923382", user_id: FROM.id, first_name: "Jonas" },
        },
      };
      await handleUpdate(noPlus, t.deps);
      assert.equal(t.lastPhoneArg(), "+66641923382", "should prepend + before normalizing");
      assert.equal(t.lastCreateInput()!.clientPhone, "+66641923382");
      assert.equal(t.calls.create, 1);
    },
  ],
  [
    "photo sent before text is uploaded, stashed, then carried into the published request",
    async () => {
      const t = makeDeps();
      await handleUpdate(photoUpdate(), t.deps);
      assert.equal(t.calls.upload, 1);
      assert.equal(t.session()!.draft?.attachmentUrls.length, 1, "photo stashed on session");
      assert.match(t.last().text, /1\/5/);

      await handleUpdate(textUpdate("Reikia plytelių klijuotojo vonioje Vilniuje iki 800."), t.deps);
      assert.equal(t.session()!.state, "draft_ready");
      assert.equal(t.session()!.draft?.attachmentUrls.length, 1, "photo carried into the draft");

      await handleUpdate(callbackUpdate("confirm"), t.deps);
      await handleUpdate(contactUpdate(), t.deps);
      assert.equal(t.lastCreateInput()!.attachmentUrls?.length, 1, "photo published with request");
    },
  ],
  [
    "photo with a caption builds the draft immediately",
    async () => {
      const t = makeDeps();
      await handleUpdate(photoUpdate("Reikia dažytojo dideliam kambariui Kaune."), t.deps);
      assert.equal(t.calls.upload, 1);
      assert.equal(t.calls.improve, 1, "caption drives the draft build");
      assert.equal(t.session()!.state, "draft_ready");
      assert.equal(t.session()!.draft?.attachmentUrls.length, 1);
    },
  ],
  [
    "photos are capped at 5",
    async () => {
      const t = makeDeps();
      for (let i = 0; i < 5; i++) await handleUpdate(photoUpdate(), t.deps);
      assert.equal(t.session()!.draft?.attachmentUrls.length, 5);
      const uploadsAfterFive = t.calls.upload;
      await handleUpdate(photoUpdate(), t.deps);
      assert.equal(t.calls.upload, uploadsAfterFive, "6th photo must not upload");
      assert.match(t.last().text, /daugiau/);
      assert.equal(t.session()!.draft?.attachmentUrls.length, 5);
    },
  ],
  [
    "a forwarded (non-own) contact is rejected",
    async () => {
      const t = makeDeps();
      await handleUpdate(textUpdate("Reikia valytojos namams Šiauliuose kartą per savaitę."), t.deps);
      await handleUpdate(callbackUpdate("confirm"), t.deps);
      const forwarded: TgUpdate = {
        update_id: 1,
        message: {
          message_id: 4,
          from: FROM,
          chat: { id: CHAT },
          contact: { phone_number: "+37061111111", user_id: 999, first_name: "Kitas" },
        },
      };
      await handleUpdate(forwarded, t.deps);
      assert.equal(t.calls.create, 0);
      assert.match(t.last().text, /savo kontaktu/);
    },
  ],
];

async function run() {
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`  ok  - ${name}`);
    } catch (error) {
      failed++;
      console.error(`  FAIL - ${name}`);
      console.error(error);
    }
  }
  console.log(`\n${tests.length - failed}/${tests.length} passed`);
  if (failed > 0) process.exitCode = 1;
}

void run();
