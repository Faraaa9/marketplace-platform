import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 30_000; // 30 seconds

interface PlatformSettingsData {
  storyEnabled: boolean;
  emailTestMode: boolean;
  emailAllowlist: string[];
}

const DEFAULT_SETTINGS: PlatformSettingsData = {
  storyEnabled: true,
  emailTestMode: false,
  emailAllowlist: [],
};

let cached: { data: PlatformSettingsData; fetchedAt: number } | null = null;

// Recognises "schema not ready yet" errors so a settings read can degrade
// gracefully instead of crashing the page:
//  - P2021 (table missing) / P2022 (column missing): migration not applied.
//  - PrismaClientValidationError: the generated client predates a new field
//    (e.g. a dev server still running an old client). Resolves on restart.
function isSchemaNotReadyError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  if ("code" in error && (error.code === "P2021" || error.code === "P2022")) {
    return true;
  }
  return "name" in error && error.name === "PrismaClientValidationError";
}

/**
 * Get the platform settings singleton, creating it if it doesn't exist.
 * Results are cached in-memory for 30s to avoid DB hits on every request.
 */
async function getSettings(): Promise<PlatformSettingsData> {
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const settings = await prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
      select: { storyEnabled: true, emailTestMode: true, emailAllowlist: true },
    });

    const data: PlatformSettingsData = {
      storyEnabled: settings.storyEnabled,
      emailTestMode: settings.emailTestMode,
      emailAllowlist: settings.emailAllowlist,
    };
    cached = { data, fetchedAt: Date.now() };
    return data;
  } catch (error) {
    // A settings read must never break a page — isStoryEnabled() runs on
    // public routes. Degrade to defaults instead of throwing.
    if (!isSchemaNotReadyError(error)) {
      console.error("[platform-settings] Nepavyko nuskaityti nustatymų:", error);
    }
    cached = { data: DEFAULT_SETTINGS, fetchedAt: Date.now() };
    return DEFAULT_SETTINGS;
  }
}

/**
 * Patch the settings singleton and invalidate the in-memory cache.
 */
async function updateSettings(patch: Partial<PlatformSettingsData>): Promise<void> {
  try {
    await prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: patch,
      create: { id: "singleton", ...patch },
    });
  } catch (error) {
    if (isSchemaNotReadyError(error)) {
      throw new Error(
        "Duomenų bazės schema neatnaujinta — pritaikykite migraciją (prisma/manual-migrations) ir paleiskite serverį iš naujo.",
      );
    }
    throw error;
  }
  cached = null;
}

/**
 * Check if the story feature is globally enabled.
 */
export async function isStoryEnabled(): Promise<boolean> {
  return (await getSettings()).storyEnabled;
}

/**
 * Update the story enabled flag.
 */
export async function setStoryEnabled(enabled: boolean): Promise<void> {
  await updateSettings({ storyEnabled: enabled });
}

/**
 * Outbound-email gating used by sendEmail(). When emailTestMode is true, only
 * recipients in emailAllowlist receive mail — every other recipient is skipped.
 */
export async function getEmailDeliverySettings(): Promise<{
  emailTestMode: boolean;
  emailAllowlist: string[];
}> {
  const { emailTestMode, emailAllowlist } = await getSettings();
  return { emailTestMode, emailAllowlist };
}

/**
 * Update email test mode and/or the allowlist.
 */
export async function setEmailDeliverySettings(patch: {
  emailTestMode?: boolean;
  emailAllowlist?: string[];
}): Promise<void> {
  await updateSettings(patch);
}
