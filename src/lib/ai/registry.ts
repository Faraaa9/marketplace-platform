/**
 * AI touchpoint registry — the human-readable catalog of every place the
 * platform calls an LLM (or logs an AI-adjacent run). The admin AI page
 * (/admin/ai) renders this so an admin can inspect, for each path: the full
 * workflow, the exact AI moment, the prompt text, the model and the params.
 *
 * Prompt text + default model are NOT duplicated here — they come from
 * PROMPT_DEFAULTS in ./prompt-config, which is also what the AI modules resolve
 * at runtime and what the admin editor overrides. This file only adds the
 * narrative metadata (workflow, trigger, params, source refs, …).
 *
 * Server-only (PROMPT_DEFAULTS lives in a prisma-touching module). Import from
 * route handlers / server components, never from a client component.
 */

import { PROMPT_DEFAULTS } from "@/lib/ai/prompt-config";

export interface AiWorkflowStep {
  label: string;
  ai?: boolean;
}

export interface AiPromptBlock {
  /** Stable key within the touchpoint — used to save overrides. */
  key: string;
  label: string;
  /** Token names (without braces) filled from runtime data. */
  tokens: string[];
  /** Default template text from PROMPT_DEFAULTS. */
  text: string;
}

export interface AiCallParams {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  reasoning?: boolean;
  notes?: string;
}

export interface AiSourceRef {
  file: string;
  lines?: string;
  symbol?: string;
}

export type AiKind = "llm" | "rule-based";

interface AiTouchpointMeta {
  id: string;
  area: string;
  title: string;
  kind: AiKind;
  audience: string;
  trigger: string;
  summary: string;
  workflow: AiWorkflowStep[];
  provider: string;
  modelEnvOverride?: string;
  promptVersion?: string;
  auditFeature?: string;
  params: AiCallParams;
  output: string;
  endpoint?: string;
  source: AiSourceRef[];
}

export interface AiTouchpoint extends AiTouchpointMeta {
  /** Base default model from PROMPT_DEFAULTS. */
  model: string;
  /** Whether the model can be overridden by the admin (kind "none" cannot). */
  modelKind: "text" | "image" | "none";
  /** Default prompt blocks, derived from PROMPT_DEFAULTS. */
  prompts: AiPromptBlock[];
}

const TOUCHPOINT_META: AiTouchpointMeta[] = [
  {
    id: "request_improve",
    area: "Užklausos (klientams)",
    title: "Užklausos sutvarkymas ir praturtinimas",
    kind: "llm",
    audience: "Klientas",
    trigger:
      "Klientas užklausos kūrimo formoje paspaudžia „Sutvarkyti su AI“ (arba po balso įrašo gauto teksto).",
    summary:
      "Sutvarko kliento aprašymą į taisyklingą lietuvių kalbą, pasiūlo pavadinimą, 1–3 kategorijas, vietovę, biudžetą, terminą ir 2–4 TAIP/NE patikslinimo klausimus, kad tiekėjas galėtų tiksliai įkainoti.",
    workflow: [
      { label: "Klientas surašo (ar padiktuoja) ko jam reikia" },
      { label: "Iš DB sudaromas kandidatų kategorijų sąrašas (deterministinis token scoring)" },
      { label: "Kviečiamas LLM su sisteminiu promptu + kliento tekstu", ai: true },
      { label: "Atsakymas validuojamas (tik leistini kategorijų slug'ai), pritaikomi override'ai" },
      { label: "Forma užpildoma pasiūlytais laukais; klientas gali redaguoti prieš skelbdamas" },
    ],
    provider: "OpenRouter",
    modelEnvOverride: "OPENROUTER_MODEL",
    promptVersion: "request-improve-v1",
    auditFeature: "request_improve",
    params: {
      temperature: 0.3,
      maxTokens: 1400,
      timeoutMs: 30_000,
      reasoning: false,
      notes: "response_format: JSON object",
    },
    output:
      "JSON: improvedDescription, title, categories[], category, location, budget, deadline, recommendations[] (TAIP/NE klausimai su yes/no tekstais).",
    endpoint: "POST /api/requests/improve",
    source: [
      { file: "src/lib/ai-improve.ts", symbol: "improveDescription" },
      { file: "src/app/api/requests/improve/route.ts" },
    ],
  },
  {
    id: "audio_transcribe",
    area: "Užklausos (klientams)",
    title: "Balso įrašo transkripcija",
    kind: "llm",
    audience: "Klientas (web) ir Telegram botas",
    trigger:
      "Klientas įrašo balso žinutę užklausos formoje, arba Telegram'e atsiunčia voice note.",
    summary:
      "Paverčia lietuvišką garso įrašą tiksliu tekstu (be perfrazavimo), kuris toliau keliauja į užklausos sutvarkymą.",
    workflow: [
      { label: "Įrašomas garsas (web: WAV, Telegram: OGG/Opus)" },
      { label: "Base64 garsas siunčiamas LLM su transkripcijos promptu", ai: true },
      { label: "Grąžintas tekstas įdedamas į aprašymo lauką" },
      { label: "Klientas gali iškart spausti „Sutvarkyti su AI“ (request_improve)" },
    ],
    provider: "OpenRouter",
    promptVersion: "audio-transcribe-v1",
    auditFeature: "audio_transcribe",
    params: {
      temperature: 0,
      maxTokens: 2000,
      timeoutMs: 45_000,
      reasoning: false,
      notes: "Multimodalus įvestis: input_audio (wav/ogg/mp3)",
    },
    output: "Grynas transkribuotas tekstas (arba tuščia eilutė, jei nieko nesigirdi).",
    endpoint: "POST /api/requests/transcribe",
    source: [
      { file: "src/lib/ai-transcribe.ts", symbol: "transcribeAudio" },
      { file: "src/app/api/requests/transcribe/route.ts" },
    ],
  },
  {
    id: "category_suggest",
    area: "Kategorijos",
    title: "Kategorijų parinkimas (deterministinis + AI rerank)",
    kind: "llm",
    audience: "Klientas ir tiekėjas",
    trigger:
      "Vartotojas rašo tekstą kategorijų laukelyje (užklausoje arba pildant profilį).",
    summary:
      "Pirma deterministinis token scoring atrenka kandidatus; jei sukonfigūruotas OpenRouter, LLM perrūšiuoja top 30 kandidatų ir gali užduoti patikslinimo klausimą. Jei AI nepavyksta — tyliai grąžinami deterministiniai rezultatai.",
    workflow: [
      { label: "Tekstas tokenizuojamas, kandidatai įvertinami balais (be LLM)" },
      { label: "Top 30 kandidatų perduodami LLM perrūšiavimui", ai: true },
      { label: "Validuojama: tik slug'ai iš kandidatų sąrašo; sujungiama su deterministiniu balu" },
      { label: "Vartotojui rodomi geriausi pasiūlymai (+ galimas patikslinimo klausimas)" },
    ],
    provider: "OpenRouter (arba „deterministic“ kai AI neprieinamas)",
    modelEnvOverride: "OPENROUTER_MODEL",
    promptVersion: "category-suggest-v1",
    auditFeature: "category_suggest",
    params: {
      temperature: 0.2,
      maxTokens: 600,
      timeoutMs: 12_000,
      reasoning: false,
      notes: "response_format: JSON object; fallback į deterministinius rezultatus",
    },
    output:
      "JSON: suggestions[] (slug, confidence, reason) + clarificationQuestion. Sujungiama su deterministiniu balu prieš rodant.",
    endpoint: "POST /api/category-suggestions",
    source: [
      { file: "src/lib/category-suggestions.ts", symbol: "aiRerank" },
      { file: "src/app/api/category-suggestions/route.ts" },
    ],
  },
  {
    id: "proposal_draft",
    area: "Tiekėjų pasiūlymai",
    title: "Pasiūlymo juodraščio generavimas",
    kind: "llm",
    audience: "Tiekėjas",
    trigger:
      "Tiekėjas atsakydamas į kliento užklausą paspaudžia „Sugeneruoti juodraštį“.",
    summary:
      "Tiekėjo vardu (pirmu asmeniu) parašo profesionalų, šiltą pasiūlymo tekstą remiantis tiekėjo profiliu ir kliento užklausa. Be kainų, be išgalvotų faktų; jei trūksta info — pridedami 1–3 patikslinimo klausimai.",
    workflow: [
      { label: "Surenkamas tiekėjo kontekstas (profilis, paslaugos, atsiliepimai) + kliento užklausa" },
      { label: "Kviečiamas LLM su sisteminiu promptu + dviem info blokais", ai: true },
      { label: "Tekstas apkarpomas iki saugaus ilgio ir validuojamas" },
      { label: "Juodraštis įkeliamas į atsakymo laukelį; tiekėjas redaguoja ir siunčia" },
    ],
    provider: "OpenRouter",
    modelEnvOverride: "OPENROUTER_MODEL",
    promptVersion: "proposal-draft-v1",
    auditFeature: "proposal_draft",
    params: {
      temperature: 0.4,
      maxTokens: 1500,
      timeoutMs: 30_000,
      reasoning: false,
      notes: "response_format: JSON object; vartotojo blokai surenkami kode",
    },
    output: "JSON: { message } — paruoštas siųsti pasiūlymo tekstas (≤ ~1900 simb.).",
    endpoint: "POST /api/tiekejas/uzklausos/[id]/juodrastis",
    source: [
      { file: "src/lib/ai-proposal.ts", symbol: "generateProposalDraft" },
      { file: "src/app/api/tiekejas/uzklausos/[id]/juodrastis/route.ts" },
    ],
  },
  {
    id: "lead_copilot",
    area: "Tiekėjų pasiūlymai",
    title: "Lead co-pilot (sprendimų pagalba)",
    kind: "llm",
    audience: "Tiekėjas",
    trigger:
      "Tiekėjas peržiūrėdamas užklausą atidaro co-pilot kortelę prieš nuspręsdamas, ar atrakinti kontaktus.",
    summary:
      "Patarėjas — įvertina, ar lead'as tinka tiekėjui: santrauka, atitikimo priežastys, ką paklausti, rizikos signalai, kitas žingsnis ir pasitikėjimo įvertis. Niekada neatlieka veiksmų pats (nesiunčia, neatrakina).",
    workflow: [
      { label: "Surenkamas tiekėjo profilis + užklausos kontekstas (su būsena: atrakinta/ne)" },
      { label: "Kviečiamas LLM su co-pilot promptu", ai: true },
      { label: "Atsakymas apkarpomas (sąrašų ilgiai, confidence 0–1) ir validuojamas" },
      { label: "Rodomi patarimai; bet koks veiksmas lieka tiekėjo rankose" },
    ],
    provider: "OpenRouter",
    modelEnvOverride: "OPENROUTER_MODEL",
    promptVersion: "lead-copilot-v1",
    auditFeature: "lead_copilot",
    params: {
      temperature: 0.25,
      maxTokens: 900,
      timeoutMs: 18_000,
      reasoning: false,
      notes: "response_format: JSON object; vartotojo blokas surenkamas kode",
    },
    output:
      "JSON: fitSummary, fitReasons[], questions[], riskSignals[], nextStep, confidence (0–1).",
    endpoint: "POST /api/tiekejas/uzklausos/[id]/copilot",
    source: [
      { file: "src/lib/ai/lead-copilot.ts", symbol: "generateLeadCopilot" },
      { file: "src/app/api/tiekejas/uzklausos/[id]/copilot/route.ts" },
    ],
  },
  {
    id: "profile_generate",
    area: "Tiekėjų profiliai",
    title: "Profilio automatinis generavimas (URL / nuo nulio)",
    kind: "llm",
    audience: "Tiekėjas",
    trigger:
      "Tiekėjas registruodamasis pateikia savo svetainės nuorodą arba trumpą aprašymą ir paspaudžia „Generuoti profilį“.",
    summary:
      "SEO copywriter'is sukuria pilną tiekėjo profilį (antraštė, aprašymas, paslaugos, SEO meta, slug, miestas). URL režimu papildomai nuskaitoma svetainė; „nuo nulio“ režimu gali būti sugeneruota ir AI nuotrauka. Po to kviečiamas kategorijų parinkimas ir teksto moderacija.",
    workflow: [
      { label: "URL režimas: Playwright nuskaito svetainę (tekstas + nuotraukos)" },
      { label: "Kviečiamas LLM su SEO promptu (URL arba scratch variantas)", ai: true },
      { label: "Scratch režimas: jei reikia, generuojama AI nuotrauka (žr. image_generate)", ai: true },
      { label: "Kviečiamas kategorijų parinkimas (žr. category_picker)" },
      { label: "Tekstas moderuojamas (žr. moderation_text)" },
      { label: "Profilis užpildomas; tiekėjas peržiūri ir patvirtina" },
    ],
    provider: "OpenRouter",
    promptVersion: "provider_profile_v1",
    auditFeature: "profile_generate",
    params: {
      temperature: 0.5,
      maxTokens: 1500,
      notes: "URL režimas temp 0.5, scratch režimas temp 0.6; response_format: JSON object",
    },
    output:
      "JSON: headline, description, services, SEO laukai (seoTitle, seoDescription, primaryService, primaryCity, serviceArea, slugSuggestion), kontaktai, imagePrompt (scratch).",
    endpoint: "POST /api/profile/ai-generate",
    source: [{ file: "src/app/api/profile/ai-generate/route.ts", symbol: "generateWithClaude / generateFromScratch" }],
  },
  {
    id: "category_picker",
    area: "Tiekėjų profiliai",
    title: "Profilio kategorijų parinkimas (dviejų žingsnių)",
    kind: "llm",
    audience: "Sistema (profilio generavimo metu)",
    trigger:
      "Iškviečiama automatiškai per profilio generavimą su tiekėjo originaliu tekstu.",
    summary:
      "Dviejų žingsnių parinkimas: 1) modelis iš 26 šaknų parenka 1–3 tinkamiausias grupes; 2) iš tų šaknų po-kategorijų parenka 1–4 TIKSLIAS. Saugomos tik konkrečios po-kategorijos; šaknys naudojamos tik kaip atsarginis variantas, kad profilis neliktų be kategorijų.",
    workflow: [
      { label: "Iš DB užkraunamos 26 šaknys su pavyzdiniais vaikais" },
      { label: "1 žingsnis: modelis parenka 1–3 šaknis (confidence ≥ 0.6)", ai: true },
      { label: "Užkraunamos parinktų šaknų depth-1 po-kategorijos" },
      { label: "2 žingsnis: modelis parenka 1–4 tikslias po-kategorijas", ai: true },
      { label: "Validuojama prieš DB slug'us; rašoma į provider_profile_categories" },
    ],
    provider: "OpenRouter",
    params: {
      temperature: 0.2,
      maxTokens: 800,
      notes: "Pass 1 max_tokens 500, Pass 2 max_tokens 800; response_format: JSON object; min confidence 0.6",
    },
    output:
      "JSON: roots[] (name, confidence, reason) → leaves[] (slug, confidence, reason). Rezultatas: konkrečių po-kategorijų ID sąrašas.",
    source: [
      { file: "src/lib/category-picker-ai.ts", symbol: "pickProviderCategoriesAI / pickRoots / pickLeaves" },
    ],
  },
  {
    id: "moderation_text",
    area: "Moderacija",
    title: "Teksto moderacija",
    kind: "llm",
    audience: "Sistema (automatiškai)",
    trigger:
      "Vartotojui paskelbus turinį — užklausos aprašymą, profilį, atsiliepimą ar žinutę.",
    summary:
      "Įvertina, ar tekstas tinkamas viešai platformai: verdiktas ok / review / reject + kategorijos + trumpa priežastis. Bet kokia klaida (timeout, nėra rakto) → null → orchestratorius traktuoja kaip „review“ (žmogaus peržiūra).",
    workflow: [
      { label: "Vartotojas pateikia tekstą" },
      { label: "Kviečiamas LLM moderatorius (tekstas traktuojamas tik kaip duomenys)", ai: true },
      { label: "Verdiktas validuojamas; klaida → review fallback" },
      { label: "ok → skelbiama; review → admin moderacijos eilė; reject → blokuojama" },
    ],
    provider: "OpenRouter",
    modelEnvOverride: "OPENROUTER_MODEL",
    auditFeature: "moderation",
    params: {
      temperature: 0,
      maxTokens: 300,
      timeoutMs: 10_000,
      reasoning: false,
      notes: "response_format: JSON object; niekada nemeta klaidos (grąžina null)",
    },
    output: "JSON: { verdict: ok|review|reject, categories[], reason }.",
    source: [{ file: "src/lib/moderation/ai.ts", symbol: "moderateWithAi" }],
  },
  {
    id: "moderation_image",
    area: "Moderacija",
    title: "Nuotraukų moderacija",
    kind: "llm",
    audience: "Sistema (automatiškai)",
    trigger: "Vartotojui įkėlus nuotraukas prie skelbimo, profilio ar story.",
    summary:
      "Multimodalus modelis įvertina iki 10 nuotraukų vienu kvietimu: ok / review / reject. Klaida → null → „review“ fallback.",
    workflow: [
      { label: "Vartotojas įkelia nuotraukas (URL'ai)" },
      { label: "Iki 10 URL'ų perduodami multimodaliam LLM", ai: true },
      { label: "Verdiktas validuojamas; klaida → review fallback" },
      { label: "ok → skelbiama; review → moderacijos eilė; reject → blokuojama" },
    ],
    provider: "OpenRouter",
    modelEnvOverride: "OPENROUTER_MODEL",
    auditFeature: "moderation",
    params: {
      temperature: 0,
      maxTokens: 300,
      timeoutMs: 12_000,
      reasoning: false,
      notes: "Multimodalus įvestis: image_url (≤ 10); response_format: JSON object",
    },
    output: "JSON: { verdict: ok|review|reject, categories[], reason }.",
    source: [{ file: "src/lib/moderation/ai.ts", symbol: "moderateImagesWithAi" }],
  },
  {
    id: "image_generate",
    area: "Tiekėjų profiliai",
    title: "AI nuotraukos generavimas",
    kind: "llm",
    audience: "Sistema (profilio generavimo „nuo nulio“ metu)",
    trigger:
      "Profilio generavimas scratch režimu, kai nėra nuskaitytų nuotraukų ir modelis pasiūlė imagePrompt.",
    summary:
      "Iš angliško prompto sugeneruoja photorealistišką darbo nuotrauką (be logotipų/teksto), kuri įkeliama į Cloudinary ir naudojama profilyje.",
    workflow: [
      { label: "Profilio generatorius grąžina imagePrompt (anglų k.)" },
      { label: "Kviečiamas image modelis su prompt + aspect ratio", ai: true },
      { label: "Base64 nuotrauka dekoduojama ir įkeliama į Cloudinary" },
      { label: "Cloudinary URL įrašomas į profilį" },
    ],
    provider: "OpenRouter",
    modelEnvOverride: "OPENROUTER_IMAGE_MODEL",
    params: {
      notes: "modalities: [image, text]; numatytas dydis 1024x768",
    },
    output: "Cloudinary nuotraukos URL (arba base64 data URL, jei Cloudinary nesukonfigūruotas).",
    source: [{ file: "src/lib/image-processor.ts", symbol: "generateAIImage" }],
  },
  {
    id: "follow_up_scan",
    area: "Vidiniai agentai",
    title: "Follow-up skenavimas (be LLM)",
    kind: "rule-based",
    audience: "Sistema / admin suvestinė",
    trigger:
      "Periodinis arba admin suvestinės skenavimas užstrigusių pokalbių/lead'ų.",
    summary:
      "Taisyklėmis pagrįstas (NE LLM) detektorius: aptinka užstrigusius pokalbius ir pasiūlo saugius žmogaus veiksmus (išsiųsti priminimą, atnaujinti aprašymą, praplėsti kategoriją). Logged ai_runs lentelėje kaip „follow_up_scan“, kad būtų vienoje vietoje su AI kvietimais. Nelogina jokio žinučių teksto.",
    workflow: [
      { label: "Skaičiuojami pokalbių/lead'ų signalai pagal laiko tarpus" },
      { label: "Pritaikomos deterministinės taisyklės (jokio LLM kvietimo)" },
      { label: "Generuojamos rekomendacijos; rezultatas logged auditui" },
    ],
    provider: "Vidinis (be modelio)",
    promptVersion: "follow-up-detector-v1",
    auditFeature: "follow_up_scan",
    params: { notes: "Jokio LLM kvietimo — gryna logika" },
    output: "Signalai pagal bucket'us + saugių veiksmų rekomendacijos.",
    source: [{ file: "src/lib/ai/follow-up.ts" }],
  },
];

/** Touchpoints with prompt blocks + default model merged in from PROMPT_DEFAULTS. */
export const AI_TOUCHPOINTS: AiTouchpoint[] = TOUCHPOINT_META.map((meta) => {
  const def = PROMPT_DEFAULTS[meta.id];
  return {
    ...meta,
    model: def?.defaultModel ?? "—",
    modelKind: def?.modelKind ?? "none",
    prompts: (def?.prompts ?? []).map((p) => ({
      key: p.key,
      label: p.label,
      tokens: p.tokens,
      text: p.template,
    })),
  };
});

/** Distinct areas in declared order, for grouping in the UI. */
export function aiTouchpointAreas(): string[] {
  const seen = new Set<string>();
  const areas: string[] = [];
  for (const t of AI_TOUCHPOINTS) {
    if (!seen.has(t.area)) {
      seen.add(t.area);
      areas.push(t.area);
    }
  }
  return areas;
}
