import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { load } from "cheerio";
import { chromium as playwrightCore } from "playwright-core";
import { processImagesBatch, generateAIImage } from "@/lib/image-processor";
import { rateLimitAsync } from "@/lib/rate-limit";
import { moderateText } from "@/lib/moderation";
import { pickProviderCategoriesAI } from "@/lib/category-picker-ai";
import { recordAiRun } from "@/lib/ai/audit";

export const runtime = "nodejs";
export const maxDuration = 60;

const PROFILE_MODEL = "anthropic/claude-haiku-4.5";
const PROFILE_PROMPT_VERSION = "provider_profile_v1";

function isServerlessEnv(): boolean {
  return (
    process.env.VERCEL === "1" ||
    !!process.env.AWS_LAMBDA_FUNCTION_NAME ||
    !!process.env.LAMBDA_TASK_ROOT ||
    process.env.NODE_ENV === "production"
  );
}

async function launchBrowser() {
  const serverless = isServerlessEnv();
  console.log("Browser launch env:", {
    serverless,
    VERCEL: process.env.VERCEL,
    NODE_ENV: process.env.NODE_ENV,
    AWS_LAMBDA: !!process.env.AWS_LAMBDA_FUNCTION_NAME,
  });

  if (serverless) {
    const sparticuzChromium = (await import("@sparticuz/chromium")).default;
    const execPath = await sparticuzChromium.executablePath();
    console.log("Serverless chromium path:", execPath);
    return playwrightCore.launch({
      args: sparticuzChromium.args,
      executablePath: execPath,
      headless: true,
    });
  }
  const { chromium: playwrightFull } = await import("playwright");
  return playwrightFull.launch({
    headless: true,
    channel: "chromium",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
    ],
  });
}

interface AIGenerateRequest {
  // URL mode (existing)
  url?: string;
  source: "services_lt" | "linkedin" | "scratch";
  // Scratch mode (new)
  businessName?: string;
  servicesText?: string;
  location?: string;
  experienceYears?: number;
  phone?: string;
}

interface ScrapedData {
  text: string;
  images: string[];
  ogImage?: string;
  title?: string;
}

interface AIResult {
  description: string;
  headline: string;
  phone?: string;
  location?: string;
  services?: string;
  experienceYears?: number;
  priceFrom?: number;
  offersInvoices?: boolean;
  availableForUrgent?: boolean;
  imagePrompt?: string;
  // ── SEO-specific outputs (populate /meistrai/[slug] metadata + slug) ──
  seoTitle?: string;
  seoDescription?: string;
  primaryService?: string;
  primaryCity?: string;
  serviceArea?: string[];
  slugSuggestion?: string;
}

// Shared SEO discipline injected into both URL and scratch prompts. Keeps the
// rules in one place so they don't drift between modes.
const SEO_RULES = `SEO TAISYKLĖS (privalomos):
- seoTitle: 50–60 simbolių. Formatas "{Vardas} — {pagrindinė paslauga} {mieste} | paslaugurinka.lt". Pirmas žodis = vardas, NE raktažodis.
- seoDescription: 140–160 simbolių. Pradžioje pagrindinė paslauga + miestas, pabaigoje implicit CTA ("Kreipkitės dėl konsultacijos.", "Susisiekite šiandien." ir pan.).
- description: pirmas sakinys (~120 simb.) natūraliai turi PAGRINDINĘ paslaugą + MIESTĄ. Toliau 3 dalys: (a) ką darai konkrečiai (su sinonimais — pvz. "klijavimas, dėjimas, montavimas"), (b) kuo išsiskiri (patirtis, medžiagos, garantija), (c) kur dirbi + kaip susisiekti.
- slugSuggestion: vardas-paslauga-miestas, kebab-case, max 60 simb., BE lietuviškų raidžių (ą→a, č→c, ę→e, ė→e, į→i, š→s, ų→u, ū→u, ž→z), be metų/atributų. Pvz. "jonas-jonaitis-pliuteliu-klijavimas-kaunas".
- primaryService: VIENA frazė standartinia lietuvių paslaugų terminologija (pvz. "Plytelių klijavimas", NE "darau plyteles").
- primaryCity: vienas pagrindinis miestas iš input'o (pirmas, jei minimi keli).
- serviceArea: 1–5 tikrų Lietuvos miestų/rajonų, kuriuose dirba (string array, ne išgalvoti).
- headline: trumpas titulas UI'ui (ne SEO!) — max 80 simb., be miesto, jei jis jau seoTitle.

NORMALIZAVIMAS:
- Vartotojo input'as gali būti padrikas — ekstraktuok faktus ir VERSK į standartinius lietuviškus paslaugų terminus.
  Pvz.: "darau plyteles vonioj" → primaryService "Plytelių klijavimas"; "elektra" → "Elektros instaliacija"; "remontuoju mašinas" → "Automobilių remontas".

DRAUDŽIAMA:
- Spam'inti raktažodžiais ("pigiai geriausias profesionalus" stack'as).
- Klišės ("kokybiškai", "atsakingai", "profesionaliai") kaip pildiklis be konteksto.
- Pridėti raktažodžius į vardą — vardas = realus žmogus arba įmonės pavadinimas.
- Išgalvoti faktus (jei input'e nėra patirties metų — palik null).`;

async function fetchAndScrape(url: string): Promise<ScrapedData> {
  let browser;
  try {
    browser = await launchBrowser().catch((err: Error) => {
      throw new Error(`Browser launch failed: ${err.message}`);
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
      locale: "lt-LT",
      extraHTTPHeaders: {
        "Accept-Language": "lt-LT,lt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(2000);

    const html = await page.content();
    const $ = load(html);

    // Extract OG image
    const ogImage =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content");

    const title =
      $('meta[property="og:title"]').attr("content") || $("title").text();

    // Extract all reasonable images
    const baseUrl = new URL(url);
    const images: string[] = [];
    const seen = new Set<string>();

    if (ogImage) {
      const absUrl = new URL(ogImage, baseUrl).toString();
      images.push(absUrl);
      seen.add(absUrl);
    }

    function addImage(rawSrc: string | undefined): boolean {
      if (!rawSrc) return false;
      try {
        const absUrl = new URL(rawSrc, baseUrl).toString();
        if (seen.has(absUrl)) return false;
        if (absUrl.startsWith("data:")) return false;
        if (/icon|logo|sprite|avatar|pixel|favicon|emoji/i.test(absUrl))
          return false;
        // Skip badge/award images (paslaugos.lt patikimiausias badge etc.)
        if (/badge|patikim|certificat|seal/i.test(absUrl)) return false;
        // Skip OTHER people's review images (paslaugos.lt has reviewer photos on the page)
        if (/\/review_/i.test(absUrl)) return false;
        // Skip ad/promo banners
        if (/banner|advert|promo|sidebar/i.test(absUrl)) return false;
        seen.add(absUrl);
        images.push(absUrl);
        return true;
      } catch {
        return false;
      }
    }

    // 1. Prefer <a href> wrapping <img> — usually points to full-size image
    $("a").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;
      if (!/\.(jpe?g|png|webp|gif)(\?|$)/i.test(href)) return;
      // Only if it contains an img inside (real gallery anchor)
      if ($(el).find("img").length === 0) return;
      addImage(href);
    });

    // 2. Then try <img> with high-quality attributes
    $("img").each((_, el) => {
      // Prefer larger versions if present
      const src =
        $(el).attr("data-zoom-image") ||
        $(el).attr("data-large") ||
        $(el).attr("data-original") ||
        $(el).attr("data-full") ||
        $(el).attr("data-src") ||
        $(el).attr("src") ||
        $(el).attr("data-lazy");

      // Check srcset for the largest variant
      const srcset = $(el).attr("srcset");
      if (srcset) {
        // Pick last (usually largest) URL from srcset
        const parts = srcset.split(",").map((s) => s.trim());
        const last = parts[parts.length - 1]?.split(/\s+/)[0];
        if (last && addImage(last)) return;
      }

      addImage(src);
    });

    // 3. Heuristic: replace common thumbnail path patterns with full-size
    // paslaugos.lt uses /thumbs/ for thumbnails and /uploads/ for full size
    const upgraded = images.map((u) =>
      u
        .replace(/\/thumbs?\//g, "/uploads/")
        .replace(/_thumb\./g, ".")
        .replace(/-thumb\./g, ".")
        .replace(/_small\./g, ".")
        .replace(/-150x\d+\./g, ".")
        .replace(/-300x\d+\./g, ".")
    );
    images.length = 0;
    for (const u of upgraded) {
      if (!images.includes(u)) images.push(u);
    }

    // Remove non-content elements before text extraction
    $("script, style, nav, footer, header, noscript, iframe").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();

    const finalImages = images.slice(0, 8);
    console.log(`Scraped ${finalImages.length} images from ${url}:`);
    finalImages.forEach((img, i) => console.log(`  [${i}] ${img}`));

    return {
      text: text.slice(0, 6000),
      images: finalImages,
      ogImage,
      title,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Scrape error details:", { errorMsg, url });

    if (errorMsg.includes("Timeout")) {
      throw new Error(
        "Šaltinio puslapis užtruko per ilgai. Pabandykite kitą URL."
      );
    }
    if (errorMsg.includes("Browser launch failed")) {
      throw new Error(
        "Serverio klaida: negali paleisti naršyklės. Bandykite vėliau."
      );
    }
    if (errorMsg.includes("ENOTFOUND") || errorMsg.includes("ERR_NAME_NOT_RESOLVED")) {
      throw new Error(
        "URL'as neteisingas arba nepasiekiamas. Patikrinkite ir bandykite iš naujo."
      );
    }
    throw new Error(
      `Šaltinio puslapis neatsako. Galimai puslapis blokuoja automatinį skaitymą.`
    );
  } finally {
    if (browser) await browser.close();
  }
}

async function generateWithClaude(
  scraped: ScrapedData,
  url: string,
): Promise<AIResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const prompt = `Tu esi lietuvių paslaugų rinkos SEO copywriter'is. Analizuok puslapio turinį ir sukurk SEO-optimizuotą paskyrą.

Šaltinis: ${url}
Pavadinimas: ${scraped.title || "(nežinoma)"}
Turinys: ${scraped.text.slice(0, 4000)}

${SEO_RULES}

Grąžink TIK JSON (be markdown, be code fence) su laukais:
{
  "headline": "trumpas UI titulas, max 80 simb.",
  "description": "200–300 žodžių pagal struktūrą",
  "phone": "+370XXXXXXXX arba 8XXXXXXXX (vienas, ne array) arba null",
  "location": "Vilnius (originalus formatas iš šaltinio)",
  "services": "• Paslauga 1\\n• Paslauga 2",
  "experienceYears": 5,
  "priceFrom": 30,
  "offersInvoices": true,
  "availableForUrgent": false,
  "seoTitle": "Vardas — pagrindinė paslauga Vilniuje | paslaugurinka.lt",
  "seoDescription": "Pagrindinė paslauga Vilniuje. USP sakinys. Kreipkitės dėl konsultacijos.",
  "primaryService": "Plytelių klijavimas",
  "primaryCity": "Vilnius",
  "serviceArea": ["Vilnius", "Vilniaus r."],
  "slugSuggestion": "vardas-paslauga-vilnius"
}

Patarimai:
- experienceYears: "5 metų patirtis" → 5; jei nerasta — null.
- offersInvoices: jei mini "sutartys", "PVM", "sąskaitos-faktūros" → true.
- availableForUrgent: jei mini "skubus", "tą pačią dieną", "24/7" → true.
- Jei nerastas vardas — naudok įmonės/brand pavadinimą iš title'o.`;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: PROFILE_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Grąžini TIK galiojantį JSON. Be markdown, be code fences. Visi tekstai turi būti tinkamai escape'inti (kabutės, eilutės).",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.5,
        max_tokens: 1500,
      }),
    }
  ).catch((err: Error) => {
    throw new Error(`OpenRouter network error: ${err.message}`);
  });

  if (!response.ok) {
    let errorDetail = "";
    try {
      const error = await response.json();
      errorDetail = JSON.stringify(error).slice(0, 200);
    } catch {
      errorDetail = `HTTP ${response.status}`;
    }
    console.error("OpenRouter API error (generateWithClaude):", {
      status: response.status,
      errorDetail,
    });
    if (response.status === 429) {
      throw new Error("AI servisas per apkrautas. Bandykite per kelias minutes.");
    }
    throw new Error(`OpenRouter error (${response.status})`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Claude raw response:", content);
      throw new Error("AI grąžino netinkamą atsakymą. Bandykite dar kartą.");
    }
    parsed = JSON.parse(jsonMatch[0]);
  }

  // Normalize phone to single string
  let phone: string | undefined;
  if (Array.isArray(parsed.phone)) {
    phone = parsed.phone[0];
  } else if (typeof parsed.phone === "string" && parsed.phone.trim()) {
    phone = parsed.phone.trim();
  }

  return {
    headline: parsed.headline || "",
    description: parsed.description || "",
    phone,
    location:
      typeof parsed.location === "string" ? parsed.location : undefined,
    services:
      typeof parsed.services === "string" ? parsed.services : undefined,
    experienceYears:
      typeof parsed.experienceYears === "number"
        ? parsed.experienceYears
        : undefined,
    priceFrom:
      typeof parsed.priceFrom === "number" ? parsed.priceFrom : undefined,
    offersInvoices:
      typeof parsed.offersInvoices === "boolean"
        ? parsed.offersInvoices
        : undefined,
    availableForUrgent:
      typeof parsed.availableForUrgent === "boolean"
        ? parsed.availableForUrgent
        : undefined,
    ...extractSeoFields(parsed),
  };
}

// Shared SEO field extraction — used by both URL and scratch modes since the
// JSON contract is identical for these keys.
function extractSeoFields(parsed: Record<string, unknown>): {
  seoTitle?: string;
  seoDescription?: string;
  primaryService?: string;
  primaryCity?: string;
  serviceArea?: string[];
  slugSuggestion?: string;
} {
  const str = (v: unknown): string | undefined =>
    typeof v === "string" && v.trim() ? v.trim() : undefined;
  return {
    seoTitle: str(parsed.seoTitle),
    seoDescription: str(parsed.seoDescription),
    primaryService: str(parsed.primaryService),
    primaryCity: str(parsed.primaryCity),
    serviceArea: Array.isArray(parsed.serviceArea)
      ? parsed.serviceArea.filter((v): v is string => typeof v === "string" && !!v.trim())
      : undefined,
    slugSuggestion: str(parsed.slugSuggestion),
  };
}

async function generateFromScratch(
  input: {
    businessName: string;
    servicesText: string;
    location?: string;
    experienceYears?: number;
    phone?: string;
  },
): Promise<AIResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const prompt = `Tu esi lietuvių paslaugų rinkos SEO copywriter'is. Vartotojas pateikia padriką informaciją — tu paverti ją SEO-optimizuota paskyra.

Bazinė info nuo vartotojo:
- Vardas/įmonė: ${input.businessName}
- Teikiamos paslaugos (savais žodžiais): ${input.servicesText}
${input.location ? `- Lokacija: ${input.location}` : ""}
${input.experienceYears ? `- Patirtis: ${input.experienceYears} metų` : ""}
${input.phone ? `- Telefonas: ${input.phone}` : ""}

${SEO_RULES}

Grąžink TIK JSON (be markdown) su laukais:
{
  "headline": "trumpas UI titulas, max 80 simb.",
  "description": "180–280 žodžių pagal struktūrą",
  "services": "• Paslauga 1\\n• Paslauga 2",
  "priceFrom": null,
  "offersInvoices": false,
  "availableForUrgent": false,
  "imagePrompt": "Professional photo of...",
  "seoTitle": "Vardas — pagrindinė paslauga Vilniuje | paslaugurinka.lt",
  "seoDescription": "Pagrindinė paslauga Vilniuje. USP sakinys. Kreipkitės dėl konsultacijos.",
  "primaryService": "Plytelių klijavimas",
  "primaryCity": "Vilnius",
  "serviceArea": ["Vilnius"],
  "slugSuggestion": "vardas-paslauga-vilnius"
}

Patarimai:
- imagePrompt: ANGLIŠKAI prompt'as photorealistic darbo nuotraukai (no logos, no text, candid photo).
- Jei vartotojas miesto nenurodė — primaryCity = null, slugSuggestion = "vardas-paslauga" (be miesto).
- primaryService imk iš servicesText, normalizuok į standartinę terminologiją.`;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: PROFILE_MODEL,
        messages: [
          {
            role: "system",
            content: "Grąžini TIK galiojantį JSON. Be markdown, be code fences.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.6,
        max_tokens: 1500,
      }),
    }
  ).catch((err: Error) => {
    throw new Error(`OpenRouter network error: ${err.message}`);
  });

  if (!response.ok) {
    let errorDetail = "";
    try {
      const error = await response.json();
      errorDetail = JSON.stringify(error).slice(0, 200);
    } catch {
      errorDetail = `HTTP ${response.status}`;
    }
    console.error("OpenRouter API error (generateFromScratch):", {
      status: response.status,
      errorDetail,
    });
    if (response.status === 429) {
      throw new Error("AI servisas per apkrautas. Bandykite per kelias minutes.");
    }
    throw new Error(`OpenRouter error (${response.status})`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI grąžino netinkamą atsakymą");
    parsed = JSON.parse(jsonMatch[0]);
  }

  const seo = extractSeoFields(parsed);
  return {
    headline: parsed.headline || "",
    description: parsed.description || "",
    phone: input.phone, // user-provided
    location: input.location, // user-provided
    services: typeof parsed.services === "string" ? parsed.services : undefined,
    experienceYears: input.experienceYears, // user-provided
    priceFrom:
      typeof parsed.priceFrom === "number" ? parsed.priceFrom : undefined,
    offersInvoices:
      typeof parsed.offersInvoices === "boolean"
        ? parsed.offersInvoices
        : undefined,
    availableForUrgent:
      typeof parsed.availableForUrgent === "boolean"
        ? parsed.availableForUrgent
        : undefined,
    imagePrompt:
      typeof parsed.imagePrompt === "string" ? parsed.imagePrompt : undefined,
    ...seo,
    // Trust user-provided location over AI guess for primaryCity when both exist.
    primaryCity: input.location || seo.primaryCity,
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ąčęėįšųūž]/g, (c) => {
      const map: Record<string, string> = {
        ą: "a",
        č: "c",
        ę: "e",
        ė: "e",
        į: "i",
        š: "s",
        ų: "u",
        ū: "u",
        ž: "z",
      };
      return map[c] || c;
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const providerProfilePersistenceSelect = {
  id: true,
  slug: true,
  phone: true,
  location: true,
  services: true,
  experienceYears: true,
  priceFrom: true,
  offersInvoices: true,
  availableForUrgent: true,
  images: true,
  heroImageUrl: true,
  externalSourceUrl: true,
  displayName: true,
  moderationStatus: true,
  seoTitle: true,
  seoDescription: true,
  primaryService: true,
  primaryCity: true,
  serviceArea: true,
} as const;

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base || "meistras";
  let suffix = 0;
  while (await prisma.providerProfile.findUnique({ where: { slug }, select: { id: true } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

function getProfileGenerateErrorCode(errorMsg: string): string {
  if (errorMsg.includes("OPENROUTER_API_KEY")) return "AI_NOT_CONFIGURED";
  if (errorMsg.includes("429") || errorMsg.includes("per apkrautas")) return "AI_RATE_LIMITED";
  if (errorMsg.includes("OpenRouter")) return "AI_REQUEST_FAILED";
  if (errorMsg.includes("netinkamą atsakymą")) return "AI_INVALID_RESPONSE";
  if (errorMsg.includes("Timeout")) return "SOURCE_TIMEOUT";
  if (errorMsg.includes("Browser launch failed")) return "SCRAPE_BROWSER_FAILED";
  if (errorMsg.includes("Failed to fetch URL") || errorMsg.includes("blokuoja")) return "SCRAPE_FAILED";
  if (errorMsg.includes("network error")) return "AI_NETWORK_ERROR";
  if (errorMsg.includes("Unique constraint")) return "PROFILE_UNIQUE_CONSTRAINT";
  return "PROFILE_GENERATE_FAILED";
}

export async function POST(req: NextRequest) {
  let isScratchMode = false;
  let sourceForAudit: AIGenerateRequest["source"] | undefined;
  let actorUserId: string | undefined;
  let profileEntityId: string | undefined;
  let aiAuditStarted = false;
  let aiAuditRecorded = false;
  const started = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: max 3 generations per user per 24h
    const rl = await rateLimitAsync(
      `ai-profile:user:${session.user.email}`,
      { maxRequests: 3, windowMs: 24 * 60 * 60 * 1000 }
    );
    if (!rl.success) {
      return NextResponse.json(
        { error: "Jūs šiandien jau perdaug kartų panaudojote šią funkciją. Bandykite rytoj." },
        { status: 429 }
      );
    }

    const body = (await req.json()) as AIGenerateRequest;
    const { source } = body;
    sourceForAudit = source;

    if (!source) {
      return NextResponse.json(
        { error: "Missing source" },
        { status: 400 }
      );
    }

    isScratchMode = source === "scratch";

    if (!isScratchMode && !body.url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }

    if (isScratchMode) {
      if (!body.businessName?.trim() || !body.servicesText?.trim()) {
        return NextResponse.json(
          { error: "Trūksta privalomų laukų (vardas ir paslaugos)" },
          { status: 400 }
        );
      }
    } else {
      try {
        new URL(body.url!);
      } catch {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        role: true,
        emailVerified: true,
        name: true,
        providerProfile: {
          select: providerProfilePersistenceSelect,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    actorUserId = user.id;

    // 1. Scrape (only in URL mode)
    let scraped: ScrapedData = { text: "", images: [] };
    if (!isScratchMode) {
      console.log(`AI profile generation from ${source}: ${body.url}`);
      scraped = await fetchAndScrape(body.url!);
      if (!scraped.text) {
        return NextResponse.json(
          { error: "Failed to fetch URL content" },
          { status: 400 }
        );
      }
    } else {
      console.log(
        `AI profile generation from scratch: ${body.businessName}`
      );
    }

    // 2. Generate marketing copy with Claude (no category picking here)
    aiAuditStarted = true;
    const aiResult = isScratchMode
      ? await generateFromScratch({
          businessName: body.businessName!,
          servicesText: body.servicesText!,
          location: body.location,
          experienceYears: body.experienceYears,
          phone: body.phone,
        })
      : await generateWithClaude(scraped, body.url!);

    // 3. Pick categories with the two-pass AI picker. We feed it the
    // ORIGINAL user input (servicesText or scraped page text), not the
    // marketing rewrite — generic words like "specialistas"/"konsultacijos"
    // in the rewrite were the root cause of mismatches (e.g. herbal healer
    // getting tagged as "HR specialistas").
    const pickerText = isScratchMode
      ? body.servicesText!
      : scraped.text;
    const pickerTitle = isScratchMode
      ? body.businessName
      : scraped.title;

    const categoryPick = await pickProviderCategoriesAI({
      rawText: pickerText,
      title: pickerTitle,
    });
    const selectedCategoryIds = categoryPick.categoryIds;
    console.log("AI category pick:", {
      roots: categoryPick.pickedRootNames,
      leaves: categoryPick.pickedLeafNames,
      total: selectedCategoryIds.length,
    });

    // 4b. Moderate generated content. Mirrors src/app/api/tiekejas/profilis/route.ts:
    // ok → APPROVED, ai_fallback → keep current status (so an infra blip doesn't
    // silently hide a profile), anything else → PENDING. We avoid hard-rejecting
    // here because the content came from our own AI, not the user — if our AI
    // produces something the moderator flags as "reject", queue it for human review
    // rather than blocking the user from a profile they didn't write.
    const moderation = await moderateText({
      entityType: "ProviderProfile",
      fields: {
        description: aiResult.description,
        headline: aiResult.headline,
        services: aiResult.services,
      },
      actorUserId: user.id,
    });
    let nextModerationStatus: string;
    if (moderation.verdict === "ok") {
      nextModerationStatus = "APPROVED";
    } else if (moderation.source === "ai_fallback") {
      nextModerationStatus =
        user.providerProfile?.moderationStatus === "REJECTED"
          ? "PENDING"
          : user.providerProfile?.moderationStatus || "APPROVED";
    } else {
      nextModerationStatus = "PENDING";
    }

    // Ensure PROVIDER role + emailVerified so the public profile is visible.
    // Authenticated users with AI-generated profiles are considered verified —
    // they completed the signup auth flow.
    if (user.role !== "PROVIDER" || !user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          role: "PROVIDER",
          emailVerified: user.emailVerified ?? new Date(),
        },
        select: { id: true },
      });
    }

    // 5. Save everything
    // Prefer AI-suggested SEO slug (vardas-paslauga-miestas). Falls back to
    // the legacy name-only slug when AI didn't produce one (or returned
    // something unusable after the slugify pass). slugify() is idempotent so
    // running it on AI output is safe — it strips lt diacritics and trims.
    const aiSlug = aiResult.slugSuggestion
      ? slugify(aiResult.slugSuggestion)
      : "";
    const baseSlug =
      aiSlug ||
      slugify(
        (isScratchMode ? body.businessName : null) ||
          user.name ||
          session.user.email.split("@")[0] ||
          "meistras"
      );

    let providerProfile = user.providerProfile;

    // Crop watermarks from scraped images and upload to our Cloudinary
    const imagesToSave =
      scraped.images.length > 0
        ? await processImagesBatch(scraped.images, {
            folder: "provider-imports",
          })
        : [];
    let heroImageProcessed = scraped.ogImage
      ? (await processImagesBatch([scraped.ogImage]))[0]
      : null;

    // Scratch mode — generate a hero image with AI if Claude provided a prompt
    if (
      isScratchMode &&
      aiResult.imagePrompt &&
      imagesToSave.length === 0
    ) {
      console.log(`Generating AI image: ${aiResult.imagePrompt.slice(0, 100)}`);
      const aiImage = await generateAIImage(aiResult.imagePrompt, {
        folder: "provider-ai-generated",
        width: 1024,
        height: 768,
      });
      if (aiImage) {
        imagesToSave.push(aiImage);
        heroImageProcessed = aiImage;
      }
    }

    if (!providerProfile) {
      const slug = await ensureUniqueSlug(baseSlug);
      providerProfile = await prisma.providerProfile.create({
        data: {
          userId: user.id,
          slug,
          description: aiResult.description,
          headline: aiResult.headline,
          phone: aiResult.phone || null,
          location: aiResult.location || null,
          services: aiResult.services || null,
          experienceYears: aiResult.experienceYears ?? null,
          priceFrom: aiResult.priceFrom ?? null,
          offersInvoices: aiResult.offersInvoices ?? false,
          availableForUrgent: aiResult.availableForUrgent ?? false,
          images: imagesToSave,
          heroImageUrl: heroImageProcessed || imagesToSave[0] || null,
          externalSource: source,
          externalSourceUrl: isScratchMode ? null : body.url,
          enrichedAt: new Date(),
          isActive: true,
          status: "claimed",
          sourceType: "self_created",
          displayName: isScratchMode ? body.businessName : null,
          moderationStatus: nextModerationStatus,
          moderationReason: moderation.reason,
          moderatedAt: new Date(),
          seoTitle: aiResult.seoTitle || null,
          seoDescription: aiResult.seoDescription || null,
          primaryService: aiResult.primaryService || null,
          primaryCity: aiResult.primaryCity || null,
          serviceArea: aiResult.serviceArea || [],
        },
        select: providerProfilePersistenceSelect,
      });
    } else {
      providerProfile = await prisma.providerProfile.update({
        where: { id: providerProfile.id },
        data: {
          slug: providerProfile.slug || baseSlug,
          description: aiResult.description,
          headline: aiResult.headline,
          phone: aiResult.phone || providerProfile.phone,
          location: aiResult.location || providerProfile.location,
          services: aiResult.services || providerProfile.services,
          experienceYears:
            aiResult.experienceYears ?? providerProfile.experienceYears,
          priceFrom: aiResult.priceFrom ?? providerProfile.priceFrom,
          offersInvoices:
            aiResult.offersInvoices ?? providerProfile.offersInvoices,
          availableForUrgent:
            aiResult.availableForUrgent ?? providerProfile.availableForUrgent,
          images:
            imagesToSave.length > 0 ? imagesToSave : providerProfile.images,
          heroImageUrl: isScratchMode
            ? providerProfile.heroImageUrl
            : heroImageProcessed ||
              imagesToSave[0] ||
              providerProfile.heroImageUrl,
          externalSource: source,
          externalSourceUrl: isScratchMode
            ? providerProfile.externalSourceUrl
            : body.url,
          enrichedAt: new Date(),
          isActive: true,
          displayName: isScratchMode
            ? body.businessName || providerProfile.displayName
            : providerProfile.displayName,
          moderationStatus: nextModerationStatus,
          moderationReason: moderation.reason,
          moderatedAt: new Date(),
          seoTitle: aiResult.seoTitle ?? providerProfile.seoTitle,
          seoDescription:
            aiResult.seoDescription ?? providerProfile.seoDescription,
          primaryService:
            aiResult.primaryService ?? providerProfile.primaryService,
          primaryCity: aiResult.primaryCity ?? providerProfile.primaryCity,
          serviceArea:
            aiResult.serviceArea && aiResult.serviceArea.length > 0
              ? aiResult.serviceArea
              : providerProfile.serviceArea,
        },
        select: providerProfilePersistenceSelect,
      });
    }
    profileEntityId = providerProfile.id;

    // 6. Replace categories
    await prisma.providerProfileCategory.deleteMany({
      where: { providerProfileId: providerProfile.id },
    });

    for (const categoryId of selectedCategoryIds) {
      await prisma.providerProfileCategory.create({
        data: { providerProfileId: providerProfile.id, categoryId },
        select: { id: true },
      });
    }

    await recordAiRun({
      feature: "profile_generate",
      status: "success",
      provider: "openrouter",
      model: PROFILE_MODEL,
      promptVersion: PROFILE_PROMPT_VERSION,
      latencyMs: Date.now() - started,
      actorUserId,
      entityType: "ProviderProfile",
      entityId: providerProfile.id,
      metadata: {
        source,
        mode: isScratchMode ? "scratch" : "url",
        categoriesCount: selectedCategoryIds.length,
        imagesCount: imagesToSave.length,
        generatedImageAttempted: Boolean(isScratchMode && aiResult.imagePrompt),
      },
    });
    aiAuditRecorded = true;

    return NextResponse.json({
      success: true,
      profileId: providerProfile.id,
      slug: providerProfile.slug,
      summary: {
        headline: aiResult.headline,
        descriptionLength: aiResult.description.length,
        categoriesCount: selectedCategoryIds.length,
        imagesCount: imagesToSave.length,
        hasPhone: Boolean(aiResult.phone),
        hasLocation: Boolean(aiResult.location),
        seoTitle: aiResult.seoTitle,
        seoDescriptionLength: aiResult.seoDescription?.length ?? 0,
        primaryService: aiResult.primaryService,
        primaryCity: aiResult.primaryCity,
        serviceAreaCount: aiResult.serviceArea?.length ?? 0,
        slugFromAi: aiSlug || null,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";

    console.error("Profile generation error:", {
      message: errorMsg,
      stack: errorStack,
      mode: isScratchMode ? "scratch" : "url",
    });

    if (aiAuditStarted && !aiAuditRecorded) {
      await recordAiRun({
        feature: "profile_generate",
        status: "error",
        provider: "openrouter",
        model: PROFILE_MODEL,
        promptVersion: PROFILE_PROMPT_VERSION,
        latencyMs: Date.now() - started,
        actorUserId,
        entityType: profileEntityId ? "ProviderProfile" : undefined,
        entityId: profileEntityId,
        errorCode: getProfileGenerateErrorCode(errorMsg),
        metadata: {
          source: sourceForAudit,
          mode: isScratchMode ? "scratch" : "url",
        },
      });
    }

    // Safe error messages - never leak raw error details to client
    let clientMessage = "Profilio generavimas nepavyko. Bandykite vėliau.";
    let statusCode = 500;

    if (errorMsg.includes("Timeout")) {
      clientMessage = "Šaltinis per ilgai atsiliepė. Pabandykite kitą URL arba turėkite kantrybės.";
      statusCode = 408;
    } else if (errorMsg.includes("Invalid URL") || errorMsg.includes("ENOTFOUND") || errorMsg.includes("ERR_NAME_NOT_RESOLVED")) {
      clientMessage = "URL'as neteisingas arba nepasiekiamas. Patikrinkite ir bandykite iš naujo.";
      statusCode = 400;
    } else if (errorMsg.includes("OpenRouter error")) {
      if (errorMsg.includes("429")) {
        clientMessage = "AI servisas per apkrautas. Bandykite per kelias minutes.";
        statusCode = 429;
      } else {
        clientMessage = "Nepavyko sugeneruoti turinio. Bandykite dar kartą.";
        statusCode = 503;
      }
    } else if (errorMsg.includes("Browser launch failed")) {
      clientMessage = "Serverio klaida. Bandykite vėliau.";
      statusCode = 503;
    } else if (errorMsg.includes("Failed to fetch URL") || errorMsg.includes("blokuoja")) {
      clientMessage = "Nepavyko nuskaityti šaltinio. Gali būti, kad puslapis blokuoja automatinį skaitymą.";
      statusCode = 400;
    } else if (errorMsg.includes("network error")) {
      clientMessage = "Tinklo klaida. Patikrinkite savo interneto ryšį ir bandykite dar kartą.";
      statusCode = 502;
    } else if (errorMsg.includes("Unique constraint")) {
      clientMessage = "Profilis su tokiu vardu jau egzistuoja. Pabandykite kitą pavadinimą.";
      statusCode = 400;
    }

    return NextResponse.json(
      { error: clientMessage },
      { status: statusCode }
    );
  }
}
