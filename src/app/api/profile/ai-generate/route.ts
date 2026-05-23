import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { load } from "cheerio";

interface AIGenerateRequest {
  url: string;
  source: "services_lt" | "linkedin";
}

interface AIGenerateResponse {
  description: string;
  categories: Array<{ id: string; name: string; selected: boolean }>;
  phone?: string;
  avatarUrl: string;
  sourceData: {
    title?: string;
    companyName?: string;
    rawText: string;
  };
}

async function fetchAndScrape(url: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const $ = load(html);

    $("script, style, nav, footer").remove();
    const text = $.text();

    return text.split(/\s+/).slice(0, 3000).join(" ");
  } finally {
    clearTimeout(timeoutId);
  }
}

async function generateWithClaude(
  scraped: string,
  url: string
): Promise<{
  description: string;
  categoryNames: string[];
  phone?: string;
}> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const prompt = `You are a profile writer for a Lithuanian service marketplace. Based on the following website content, generate a professional profile for a service provider.

Website: ${url}
Content: ${scraped.slice(0, 2000)}

Generate:
1. A compelling profile description (150-250 words in Lithuanian) that summarizes their services and expertise
2. Up to 6 relevant service categories from this list: "Konstruktyvinės paslaugos", "Santechnika", "Elektrika", "Dažymas", "Stogo darbai", "Langai ir durys", "Aplinkos sutvarkymas", "Nekilnojamojo turto paslaugos", "Lyginimas", "Baldų gamyba", "Medžio darbai", "Statyba", "Teisės paslaugos", "Mokymas ir konsultavimas", "Dizainas", "Fotografija", "Vertimas", "IT paslaugos", "Buhalterija ir apskaita", "Marketingas ir reklama"
3. Any phone number found (Lithuanian format: +370XXXXXXXXX or local 6-8 digits)

Return as JSON:
{
  "description": "...",
  "categories": ["category1", "category2"],
  "phone": "+370..."
}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "anthropic/claude-haiku-4.5",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenRouter error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to extract JSON from response");

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    description: parsed.description || "",
    categoryNames: Array.isArray(parsed.categories)
      ? parsed.categories.slice(0, 6)
      : [],
    phone: parsed.phone,
  };
}

async function generateAvatar(
  name: string,
  _description: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not configured");

  const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/dall-e-3",
      prompt: `Professional avatar for ${name}. Clean, trustworthy, premium marketplace style. Simple background.`,
      size: "256x256",
      quality: "standard",
      n: 1,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Avatar generation failed:", error);
    return "";
  }

  const data = await response.json();
  return data.data[0]?.url || "";
}

async function getAllCategories(): Promise<
  Array<{ id: string; name: string }>
> {
  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
      },
      take: 100,
    });
    return categories;
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as AIGenerateRequest;
    const { url, source } = body;

    if (!url || !source) {
      return NextResponse.json(
        { error: "Missing url or source" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    console.log(`Generating profile from ${source}: ${url}`);

    // Scrape content
    const scraped = await fetchAndScrape(url);
    if (!scraped) {
      return NextResponse.json(
        { error: "Failed to fetch URL content" },
        { status: 400 }
      );
    }

    // Generate with Claude
    const claudeResult = await generateWithClaude(scraped, url);

    // Get all categories from DB
    const allCategories = await getAllCategories();

    // Match category names to IDs
    const selectedCategories = allCategories.filter((cat) =>
      claudeResult.categoryNames.some(
        (name) => name.toLowerCase() === cat.name.toLowerCase()
      )
    );

    // Generate avatar
    const userName = session.user.name || "Service Provider";
    const avatarUrl = await generateAvatar(userName, claudeResult.description);

    const categoriesWithSelection = allCategories.map((cat) => ({
      ...cat,
      selected: selectedCategories.some((sel) => sel.id === cat.id),
    }));

    const result: AIGenerateResponse = {
      description: claudeResult.description,
      categories: categoriesWithSelection,
      phone: claudeResult.phone,
      avatarUrl: avatarUrl || "",
      sourceData: {
        rawText: scraped.slice(0, 500),
      },
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Profile generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Profile generation failed",
      },
      { status: 500 }
    );
  }
}
