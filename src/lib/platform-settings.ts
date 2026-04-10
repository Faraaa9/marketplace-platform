import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 30_000; // 30 seconds
const DEFAULT_SETTINGS = { storyEnabled: true };

let cached: { storyEnabled: boolean; fetchedAt: number } | null = null;

function isMissingPlatformSettingsTable(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2021"
  );
}

/**
 * Get the platform settings singleton, creating it if it doesn't exist.
 * Results are cached in-memory for 30s to avoid DB hits on every request.
 */
async function getSettings(): Promise<{ storyEnabled: boolean }> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { storyEnabled: cached.storyEnabled };
  }

  try {
    const settings = await prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton", storyEnabled: true },
      select: { storyEnabled: true },
    });

    cached = { storyEnabled: settings.storyEnabled, fetchedAt: Date.now() };
    return { storyEnabled: settings.storyEnabled };
  } catch (error) {
    if (isMissingPlatformSettingsTable(error)) {
      cached = { storyEnabled: DEFAULT_SETTINGS.storyEnabled, fetchedAt: Date.now() };
      return DEFAULT_SETTINGS;
    }
    throw error;
  }
}

/**
 * Check if the story feature is globally enabled.
 */
export async function isStoryEnabled(): Promise<boolean> {
  const { storyEnabled } = await getSettings();
  return storyEnabled;
}

/**
 * Update the story enabled flag. Invalidates cache immediately.
 */
export async function setStoryEnabled(enabled: boolean): Promise<void> {
  try {
    await prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: { storyEnabled: enabled },
      create: { id: "singleton", storyEnabled: enabled },
    });
  } catch (error) {
    if (isMissingPlatformSettingsTable(error)) {
      throw new Error("Platform settings lentelė dar nesukurta. Paleiskite `npm run db:push`.");
    }
    throw error;
  }
  cached = { storyEnabled: enabled, fetchedAt: Date.now() };
}
