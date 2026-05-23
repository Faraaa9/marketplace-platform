import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { load } from "cheerio";
import { chromium } from "playwright";
import { processImagesBatch, generateAIImage } from "@/lib/image-processor";
import { rateLimitAsync } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  categoryNames: string[];
  phone?: string;
  location?: string;
  services?: string;
  experienceYears?: number;
  priceFrom?: number;
  offersInvoices?: boolean;
  availableForUrgent?: boolean;
  imagePrompt?: string;
}

async function fetchAndScrape(url: string): Promise<ScrapedData> {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      channel: "chromium",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
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
    if (error instanceof Error && error.message.includes("Timeout")) {
      throw new Error(
        "Šaltinio puslapis užtruko per ilgai. Pabandykite kitą URL."
      );
    }
    throw new Error(
      `Šaltinio puslapis neatsako. Galimai puslapis blokuoja automatinį skaitymą. ${
        error instanceof Error ? error.message : ""
      }`
    );
  } finally {
    if (browser) await browser.close();
  }
}

async function generateWithClaude(
  scraped: ScrapedData,
  url: string,
  availableCategories: string[]
): Promise<AIResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const prompt = `Tu esi profesionalus copywriter'is paslaugų rinkai Lietuvoje. Analizuok puslapio turinį ir sukurk paskyrą paslaugų teikėjui.

Šaltinis: ${url}
Pavadinimas: ${scraped.title || "(nežinoma)"}
Turinys: ${scraped.text.slice(0, 4000)}

Galimos kategorijos (PARINKK TIK IŠ ŠIO SĄRAŠO, tiksli rašyba):
${availableCategories.map((c) => `- ${c}`).join("\n")}

Sukurk:
1. headline — trumpas, įsimintinas titulas (max 80 simboliu, lietuvių kalba). Pvz: "Patikimas santechnikas Vilniuje — 15 metų patirtis"
2. description — profesionalų, įtaigų aprašymą (200-300 žodžių lietuvių kalba). Aprašyk paslaugas, patirtį, kuo išsiskiria. NE generinis — naudok konkretus faktus iš šaltinio. Be klišių.
3. categories — iki 6 tinkamiausių kategorijų iš sąrašo viršuje (naudok TIKSLIUS pavadinimus)
4. phone — telefono numeris JEI rastas. Formatas: "+370XXXXXXXX" arba "8XXXXXXXX" (vienas numeris, ne array)
5. location — miestas/regionas Lietuvoje, jei nurodytas (pvz. "Vilnius", "Kaunas, Klaipėda")
6. services — konkretus paslaugų sąrašas po vieną į eilutę (markdown bullet su • simboliu), pvz: "• Vamzdžių keitimas\n• Čiaupų montavimas\n• Šildymo sistemų remontas". Sudaryk iš šaltinio teksto.
7. experienceYears — patirtis metais kaip skaičius (integer). Pvz., jei šaltinis mini "5 metų patirtis" → 5. Jei nerasta — null.
8. priceFrom — minimaliame kaina už paslaugą eurais kaip skaičius. Jei nerasta — null.
9. offersInvoices — ar išrašo PVM sąskaitas-faktūras (true/false). Pagal nutylėjimą jei mini "sutartys", "PVM", "sąskaitos-faktūros" → true.
10. availableForUrgent — ar atlieka skubius darbus (true/false). Jei mini "skubus", "tą pačią dieną", "24/7" → true.

Grąžink TIK JSON (be markdown, be code fence):
{
  "headline": "...",
  "description": "...",
  "categories": ["kategorija1", "kategorija2"],
  "phone": "+370...",
  "location": "Vilnius",
  "services": "• Paslauga 1\n• Paslauga 2",
  "experienceYears": 5,
  "priceFrom": 30,
  "offersInvoices": true,
  "availableForUrgent": false
}`;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4.5",
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
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenRouter error: ${JSON.stringify(error)}`);
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
    categoryNames: Array.isArray(parsed.categories)
      ? parsed.categories.slice(0, 6)
      : [],
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
  availableCategories: string[]
): Promise<AIResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const prompt = `Tu esi profesionalus copywriter'is paslaugų rinkai Lietuvoje. Sukurk paskyrą paslaugų teikėjui iš pateiktos bazinės informacijos.

Bazinė info:
- Vardas/įmonė: ${input.businessName}
- Teikiamos paslaugos (vartotojo aprašyme): ${input.servicesText}
${input.location ? `- Lokacija: ${input.location}` : ""}
${input.experienceYears ? `- Patirtis: ${input.experienceYears} metų` : ""}
${input.phone ? `- Telefonas: ${input.phone}` : ""}

Galimos kategorijos (PARINK TIK IŠ ŠIO SĄRAŠO, tiksli rašyba):
${availableCategories.map((c) => `- ${c}`).join("\n")}

Sukurk:
1. headline — trumpas, įsimintinas titulas (max 80 simbolių, lietuvių kalba). Naudok faktus iš vartotojo input'o.
2. description — profesionalų, įtaigų aprašymą (180-280 žodžių lietuvių k.). Išskleisk vartotojo trumpą aprašymą į pilną, įtaigų tekstą. Pabrėžk patirtį, kokybę, profesionalumą. NE generinis, NE klišės.
3. categories — iki 6 tinkamiausių kategorijų iš sąrašo (TIKSLŪS pavadinimai)
4. services — struktūrizuotas paslaugų sąrašas po bulletais (• simbolis). Iš vartotojo įvesto teksto sukurk normalų listą.
5. priceFrom — bazinė kaina eurais, jei galima išvesti iš teksto, kitaip null
6. offersInvoices — jei mini PVM/sąskaitos → true, kitaip false
7. availableForUrgent — jei mini skubų/skubūs darbai → true, kitaip false
8. imagePrompt — ANGLIŠKAI prompt'as profesionalios pagrindinės nuotraukos generavimui. Vaizduoja paslaugų teikėją realioje darbo aplinkoje. PHOTOREALISTIC, ne iliustracija, ne cartoon. Pavyzdys elektrikui: "Professional Lithuanian male electrician at work, wearing safety helmet and work uniform, holding electrical tools, installing wiring in a modern apartment, natural lighting, photorealistic, high quality, candid photo, no logos, no text". Adaptuok pagal specialybę.

Grąžink TIK JSON (be markdown):
{
  "headline": "...",
  "description": "...",
  "categories": ["..."],
  "services": "• Paslauga 1\\n• Paslauga 2",
  "priceFrom": null,
  "offersInvoices": false,
  "availableForUrgent": false,
  "imagePrompt": "Professional photo of..."
}`;

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4.5",
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
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenRouter error: ${JSON.stringify(error)}`);
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

  return {
    headline: parsed.headline || "",
    description: parsed.description || "",
    categoryNames: Array.isArray(parsed.categories)
      ? parsed.categories.slice(0, 6)
      : [],
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

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base || "meistras";
  let suffix = 0;
  while (await prisma.providerProfile.findUnique({ where: { slug } })) {
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
  return slug;
}

export async function POST(req: NextRequest) {
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

    if (!source) {
      return NextResponse.json(
        { error: "Missing source" },
        { status: 400 }
      );
    }

    const isScratchMode = source === "scratch";

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

    // 2. Generate with Claude
    const allCategories = await prisma.category.findMany({
      where: { depth: { lte: 1 } },
      select: { id: true, name: true },
      orderBy: [{ depth: "asc" }, { name: "asc" }],
      take: 80,
    });

    const aiResult = isScratchMode
      ? await generateFromScratch(
          {
            businessName: body.businessName!,
            servicesText: body.servicesText!,
            location: body.location,
            experienceYears: body.experienceYears,
            phone: body.phone,
          },
          allCategories.map((c) => c.name)
        )
      : await generateWithClaude(
          scraped,
          body.url!,
          allCategories.map((c) => c.name)
        );

    // 3. Match categories
    const selectedCategoryIds = allCategories
      .filter((cat) =>
        aiResult.categoryNames.some(
          (name) =>
            name.toLowerCase().trim() === cat.name.toLowerCase().trim()
        )
      )
      .map((c) => c.id);

    // 4. Get user and ensure PROVIDER role
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { providerProfile: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
      });
    }

    // 5. Save everything
    const baseSlug = slugify(
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
        },
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
        },
      });
    }

    // 6. Replace categories
    await prisma.providerProfileCategory.deleteMany({
      where: { providerProfileId: providerProfile.id },
    });

    for (const categoryId of selectedCategoryIds) {
      await prisma.providerProfileCategory.create({
        data: { providerProfileId: providerProfile.id, categoryId },
      });
    }

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
      },
    });
  } catch (error) {
    console.error("Profile generation error:", error);

    // Safe error messages - never leak raw error details to client
    let clientMessage = "Profilio generavimas nepavyko. Bandykite vėliau.";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes("Timeout")) {
        clientMessage = "Šaltinis per ilgai atsiliepė. Pabandykite kitą URL arba turėkite kantrybės.";
        statusCode = 408;
      } else if (error.message.includes("Invalid URL") || error.message.includes("ENOTFOUND")) {
        clientMessage = "URL'as neteisingas arba nepasiekiamas. Patikrinkite ir bandykite iš naujo.";
        statusCode = 400;
      } else if (error.message.includes("OpenRouter error")) {
        clientMessage = "Nepavyko sugeneruoti turinio. Bandykite dar kartą.";
        statusCode = 503;
      } else if (error.message.includes("Failed to fetch URL")) {
        clientMessage = "Nepavyko nuskaityti šaltinio. Gali būti, kad puslapis blokuoja automatinį skaitymą.";
        statusCode = 400;
      }
    }

    return NextResponse.json(
      { error: clientMessage },
      { status: statusCode }
    );
  }
}
