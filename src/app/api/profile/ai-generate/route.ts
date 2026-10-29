import { NextRequest, NextResponse, connection } from "next/server";
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
import {
  isAiTouchpointEnabled,
  resolveModel,
  resolvePrompt,
  resolvePromptVersion,
} from "@/lib/ai/prompt-config";
import { callOpenRouter, type OpenRouterUsage } from "@/lib/ai/openrouter";
import { assertPublicHttpUrl, UnsafeUrlError } from "@/lib/ssrf-guard";

export const maxDuration = 300;

const PROFILE_MODEL = "anthropic/claude-haiku-4.5";
const PROFILE_PROMPT_VERSION = "provider_profile_v1";
const PROFILE_TIMEOUT_MS = 60_000;
// image_generate is the bulk of AI spend and signups are free, so the per-user
// limit alone doesn't bound it. Over the cap the profile is saved without an
// AI hero image.
const AI_IMAGE_GLOBAL_DAILY_CAP = 20;
const SKIPPED_RESOURCE_TYPES = new Set(["image", "media", "font", "stylesheet"]);

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
  source: "services_lt" | "linkedin" | "website" | "scratch";
  // Scratch mode (new)
  businessName?: string;
  servicesText?: string;
  location?: string;
  experienceYears?: number;
  phone?: string;
  website?: string;
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
  website?: string;
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
      serviceWorkers: "block",
    });

    // Every request the page makes (navigation, redirects, XHR, scripts) goes
    // through the SSRF guard. Requests are fetched with redirects disabled and
    // the 3xx handed back to the browser, so each redirect hop re-enters this
    // handler and is checked too.
    await context.route("**/*", async (route) => {
      const request = route.request();
      if (SKIPPED_RESOURCE_TYPES.has(request.resourceType())) return route.abort();
      try {
        await assertPublicHttpUrl(request.url());
      } catch {
        return route.abort("blockedbyclient");
      }
      try {
        const response = await route.fetch({ maxRedirects: 0 });
        return route.fulfill({ response });
      } catch {
        return route.abort();
      }
    });
    await context.routeWebSocket(/.*/, (ws) => ws.close());

    const page = await context.newPage();
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    // A blocked hop leaves Chromium's own error page (or the unfollowed 3xx);
    // scraping that would turn an error message into a profile.
    if (!response?.ok() || page.url().startsWith("chrome-error:")) {
      throw new Error("Failed to fetch URL content");
    }
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

    const publicImages: string[] = [];
    for (const img of images) {
      if (publicImages.length === 8) break;
      if (await assertPublicHttpUrl(img).then(() => true, () => false)) publicImages.push(img);
    }
    const finalImages = publicImages;
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

    if (error instanceof UnsafeUrlError) throw error;

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
): Promise<{ result: AIResult; usage: OpenRouterUsage | null }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const model = await resolveModel("profile_generate", PROFILE_MODEL);
  const systemPrompt = await resolvePrompt("profile_generate", "system_url");
  const prompt = await resolvePrompt("profile_generate", "user_url", {
    url,
    title: scraped.title || "(nežinoma)",
    scrapedText: scraped.text.slice(0, 4000),
  });

  const call = await callOpenRouter({
    apiKey,
    model,
    timeoutMs: PROFILE_TIMEOUT_MS,
    temperature: 0.5,
    maxTokens: 1500,
    jsonObject: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });

  if (!call.ok) {
    console.error("OpenRouter API error (generateWithClaude):", {
      status: call.status,
      errorKind: call.errorKind,
    });
    if (call.status === 429) {
      throw new Error("AI servisas per apkrautas. Bandykite per kelias minutes.");
    }
    throw new Error(
      call.errorKind === "timeout"
        ? "AI atsakymas užtruko per ilgai. Bandykite dar kartą."
        : `OpenRouter error (${call.status})`,
    );
  }

  const content = call.content;
  if (!content) {
    throw new Error("AI grąžino netinkamą atsakymą. Bandykite dar kartą.");
  }

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

  const result: AIResult = {
    headline: parsed.headline || "",
    description: parsed.description || "",
    phone,
    location:
      typeof parsed.location === "string" ? parsed.location : undefined,
    website: normalizeWebsite(parsed.website),
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
  return { result, usage: call.usage };
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
    website?: string;
  },
): Promise<{ result: AIResult; usage: OpenRouterUsage | null }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const model = await resolveModel("profile_generate", PROFILE_MODEL);
  const systemPrompt = await resolvePrompt("profile_generate", "system_scratch");
  const prompt = await resolvePrompt("profile_generate", "user_scratch", {
    businessName: input.businessName,
    servicesText: input.servicesText,
    locationLine: input.location ? `- Lokacija: ${input.location}\n` : "",
    experienceLine: input.experienceYears ? `- Patirtis: ${input.experienceYears} metų\n` : "",
    phoneLine: input.phone ? `- Telefonas: ${input.phone}\n` : "",
    websiteLine: input.website ? `- Svetainė: ${input.website}\n` : "",
  });

  const call = await callOpenRouter({
    apiKey,
    model,
    timeoutMs: PROFILE_TIMEOUT_MS,
    temperature: 0.6,
    maxTokens: 1500,
    jsonObject: true,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt },
    ],
  });

  if (!call.ok) {
    console.error("OpenRouter API error (generateFromScratch):", {
      status: call.status,
      errorKind: call.errorKind,
    });
    if (call.status === 429) {
      throw new Error("AI servisas per apkrautas. Bandykite per kelias minutes.");
    }
    throw new Error(
      call.errorKind === "timeout"
        ? "AI atsakymas užtruko per ilgai. Bandykite dar kartą."
        : `OpenRouter error (${call.status})`,
    );
  }

  const content = call.content;
  if (!content) {
    throw new Error("AI grąžino netinkamą atsakymą");
  }

  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("AI grąžino netinkamą atsakymą");
    parsed = JSON.parse(jsonMatch[0]);
  }

  const seo = extractSeoFields(parsed);
  const result: AIResult = {
    headline: parsed.headline || "",
    description: parsed.description || "",
    phone: input.phone, // user-provided
    location: input.location, // user-provided
    // User-provided website wins; otherwise fall back to one the AI spotted in the text.
    website: normalizeWebsite(input.website) || normalizeWebsite(parsed.website),
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
  return { result, usage: call.usage };
}

// Social/aggregator domains are never the provider's own site — reject so the
// website slot doesn't get polluted with a Facebook page or a paslaugos.lt link.
const NON_WEBSITE_HOSTS =
  /(facebook|fb\.com|instagram|linkedin|paslaugos\.lt|paslaugurinka\.lt|tiktok|youtube|twitter|x\.com|t\.me|wa\.me|whatsapp|maps\.google|goo\.gl)/i;

function normalizeWebsite(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  let value = raw.trim();
  if (!value || value.toLowerCase() === "null") return undefined;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;
    if (!url.hostname.includes(".")) return undefined;
    if (NON_WEBSITE_HOSTS.test(url.hostname)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
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
  website: true,
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
  await connection();
  let isScratchMode = false;
  let sourceForAudit: AIGenerateRequest["source"] | undefined;
  let actorUserId: string | undefined;
  let profileEntityId: string | undefined;
  let aiAuditStarted = false;
  let aiAuditRecorded = false;
  let profileAuditModel = PROFILE_MODEL;
  let profileAuditVersion = PROFILE_PROMPT_VERSION;
  const started = Date.now();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!(await isAiTouchpointEnabled("profile_generate"))) {
      return NextResponse.json(
        { error: "AI profilio generavimas šiuo metu išjungtas" },
        { status: 503 }
      );
    }

    // Rate limit: max 3 generations per user per 24h
    const rl = await rateLimitAsync(
      `ai-profile:user:${session.user.id}`,
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
        await assertPublicHttpUrl(body.url!);
      } catch {
        return NextResponse.json(
          { error: "Nurodykite viešą svetainės adresą (http:// arba https://)." },
          { status: 400 }
        );
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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
    // Resolve the model/prompt version once up front so the audit records what
    // really ran (honouring any admin override), not the hardcoded default —
    // and so the error path logs the right model too.
    profileAuditModel = await resolveModel("profile_generate", PROFILE_MODEL);
    profileAuditVersion = await resolvePromptVersion("profile_generate", PROFILE_PROMPT_VERSION);
    const { result: aiResult, usage: aiUsage } = isScratchMode
      ? await generateFromScratch({
          businessName: body.businessName!,
          servicesText: body.servicesText!,
          location: body.location,
          experienceYears: body.experienceYears,
          phone: body.phone,
          website: body.website,
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

    // Become a provider, but never touch emailVerified: an unverified email
    // must stay unverified (provider guard and the Google account-linking guard
    // both rely on it).
    if (user.role !== "PROVIDER") {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: "PROVIDER" },
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
      imagesToSave.length === 0 &&
      (
        await rateLimitAsync(
          "ai-image:global",
          { maxRequests: AI_IMAGE_GLOBAL_DAILY_CAP, windowMs: 24 * 60 * 60 * 1000 },
          { failClosed: true },
        )
      ).success
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
          website: aiResult.website || null,
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
          website: aiResult.website || providerProfile.website,
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

    // 6. Replace the free categories only. Paid ones (expiresAt set) were
    // bought and must survive regeneration; skipDuplicates keeps a paid row
    // when the AI picks the same category again.
    await prisma.providerProfileCategory.deleteMany({
      where: { providerProfileId: providerProfile.id, expiresAt: null },
    });
    await prisma.providerProfileCategory.createMany({
      data: selectedCategoryIds.map((categoryId) => ({
        providerProfileId: providerProfile.id,
        categoryId,
      })),
      skipDuplicates: true,
    });

    await recordAiRun({
      feature: "profile_generate",
      status: "success",
      provider: "openrouter",
      model: profileAuditModel,
      promptVersion: profileAuditVersion,
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
        promptTokens: aiUsage?.promptTokens ?? null,
        completionTokens: aiUsage?.completionTokens ?? null,
        totalTokens: aiUsage?.totalTokens ?? null,
        costUsd: aiUsage?.costUsd ?? null,
      },
    });
    aiAuditRecorded = true;

    return NextResponse.json({
      success: true,
      profileId: providerProfile.id,
      slug: providerProfile.slug,
      // Surfaced so the onboarding UI can prefill the category confirmation step.
      categoryIds: selectedCategoryIds,
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
        model: profileAuditModel,
        promptVersion: profileAuditVersion,
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
    } else if (error instanceof UnsafeUrlError) {
      clientMessage = "Nurodykite viešą svetainės adresą (http:// arba https://).";
      statusCode = 400;
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
