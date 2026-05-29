/**
 * User-facing Telegram copy (Lithuanian) plus the draft renderer and inline
 * keyboard builders. All bot text lives here so the conversation flow stays
 * about control flow, not wording.
 */
import type { InlineButton } from "./api";

/** A publish-ready service request draft, resolved to category IDs + names. */
export interface DraftData {
  title: string;
  description: string;
  categoryIds: string[];
  categoryNames: string[];
  location: string;
  budget: string;
  deadline: string;
  /** Cloudinary URLs of photos attached via the bot (max 5). */
  attachmentUrls: string[];
}

/** Escape the small set of characters Telegram's HTML parse mode reserves. */
function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Render a draft as an HTML message. Blank optional fields are omitted. */
export function formatDraft(d: DraftData): string {
  const field = (label: string, value: string): string | null =>
    value.trim() ? `<b>${label}:</b> ${esc(value.trim())}` : null;

  const lines = [
    `<b>${esc(d.title)}</b>`,
    field("Kategorija", d.categoryNames.join(", ")),
    field("Miestas", d.location),
    field("Biudžetas", d.budget),
    field("Terminas", d.deadline),
    d.attachmentUrls.length > 0 ? `<b>Nuotraukos:</b> ${d.attachmentUrls.length}` : null,
    "",
    esc(d.description),
  ].filter((line): line is string => line !== null);

  return lines.join("\n");
}

/** Confirm / edit / cancel buttons shown under a draft. */
export function draftButtons(): InlineButton[][] {
  return [
    [{ text: "✅ Skelbti", callback_data: "confirm" }],
    [
      { text: "✏️ Taisyti", callback_data: "edit" },
      { text: "❌ Atšaukti", callback_data: "cancel" },
    ],
  ];
}

export const MSG = {
  welcome:
    "Sveiki! Parašykite arba įrašykite balso žinutę, kokios paslaugos ieškote.\n\n" +
    "Pvz.: reikia plytelių klijuotojo vonioje, Vilnius, iki 800 EUR, gegužės pabaigoje.",
  prompt: "Parašykite arba įrašykite, kokios paslaugos ieškote.",
  thinking: "Ruošiu juodraštį...",
  listeningVoice: "Klausau įrašo...",
  voiceEmpty:
    "Nepavyko atpažinti įrašo. Pabandykite dar kartą arba parašykite tekstu.",
  tooShort:
    "Parašykite šiek tiek daugiau - bent keli sakiniai padės tiekėjams suprasti, ko reikia.",
  noCategory:
    "Nepavyko parinkti kategorijos. Patikslinkite, kokios paslaugos ieškote.",
  rateLimited: "Per daug užklausų. Pabandykite po valandos.",
  aiUnavailable: "Šiuo metu nepavyksta apdoroti. Pabandykite po kelių minučių.",
  photoFailed: "Nepavyko įkelti nuotraukos. Pabandykite dar kartą.",
  photoAdded: (n: number, max: number): string =>
    `Nuotrauka pridėta (${n}/${max}). Siųskite dar arba aprašykite, ko reikia.`,
  tooManyPhotos: (max: number): string =>
    `Jau pridėta ${max} nuotraukos - daugiau pridėti negalima.`,
  editPrompt: "Gerai - parašykite arba įrašykite naują aprašymą.",
  cancelled: "Atšaukta. Kai norėsite, parašykite iš naujo.",
  nothingToPost: "Nėra ką skelbti. Pirma aprašykite, kokios paslaugos ieškote.",
  askContact:
    "Beveik baigta. Paspauskite mygtuką, kad pasidalintumėte telefono numeriu - " +
    "jis reikalingas, kad tiekėjai galėtų su jumis susisiekti.",
  shareContactBtn: "Bendrinti kontaktą",
  useContactButton:
    "Paspauskite mygtuką „Bendrinti kontaktą“ žemiau - telefono numerio rašyti " +
    "ranka nereikia (taip jį patvirtina pats Telegram).",
  contactNotOwn: "Pasidalinkite savo kontaktu, ne kito žmogaus.",
  genericError: "Įvyko klaida. Pabandykite dar kartą.",

  postedLive: (link: string): string =>
    `Užklausa paskelbta! Tiekėjai jau gali ją matyti.\nSekite ją čia:\n${link}`,
  postedPending: (link: string): string =>
    `Užklausa gauta ir bus paskelbta po trumpos peržiūros.\nSekite ją čia:\n${link}`,
  publishError: (message: string): string =>
    message?.trim() || "Nepavyko paskelbti. Pabandykite dar kartą.",
} as const;
