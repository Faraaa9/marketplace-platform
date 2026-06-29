import { prisma } from "@/lib/prisma";

const CACHE_TTL_MS = 30_000; // 30 seconds

interface PlatformSettingsData {
  storyEnabled: boolean;
  emailTestMode: boolean;
  emailAllowlist: string[];
  freeStarterCredits: number;
  profilePreviewEnabled: boolean;
}

const DEFAULT_SETTINGS: PlatformSettingsData = {
  storyEnabled: true,
  emailTestMode: false,
  emailAllowlist: [],
  freeStarterCredits: 3,
  profilePreviewEnabled: true,
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
      select: {
        storyEnabled: true,
        emailTestMode: true,
        emailAllowlist: true,
        freeStarterCredits: true,
        profilePreviewEnabled: true,
      },
    });

    const data: PlatformSettingsData = {
      storyEnabled: settings.storyEnabled,
      emailTestMode: settings.emailTestMode,
      emailAllowlist: settings.emailAllowlist,
      freeStarterCredits: settings.freeStarterCredits,
      profilePreviewEnabled: settings.profilePreviewEnabled,
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

/**
 * Number of free credits granted to a provider when they first join.
 */
export async function getFreeStarterCredits(): Promise<number> {
  return (await getSettings()).freeStarterCredits;
}

/**
 * Update the number of free starter credits new providers receive.
 */
export async function setFreeStarterCredits(count: number): Promise<void> {
  await updateSettings({ freeStarterCredits: count });
}

/**
 * Whether the provider quick-preview side drawer is shown on /meistrai. When
 * false, clicking a provider card navigates straight to the full profile.
 */
export async function isProfilePreviewEnabled(): Promise<boolean> {
  return (await getSettings()).profilePreviewEnabled;
}

/**
 * Update the provider profile preview drawer flag.
 */
export async function setProfilePreviewEnabled(enabled: boolean): Promise<void> {
  await updateSettings({ profilePreviewEnabled: enabled });
}

// ── Multi-label category pipeline kill switch ──────────────────────────────
// Read in its OWN isolated query (NOT the main getSettings select) so that
// before the DB column exists it degrades to false WITHOUT dragging every other
// setting to defaults. Default OFF: merging the PR is a no-op until flipped.
let mlCached: { value: boolean; fetchedAt: number } | null = null;

/** Whether the segment -> per-job dense+rerank multi-label categorization is live. */
export async function isMultilabelCategoriesEnabled(): Promise<boolean> {
  if (mlCached && Date.now() - mlCached.fetchedAt < CACHE_TTL_MS) {
    return mlCached.value;
  }
  try {
    const row = await prisma.platformSettings.findUnique({
      where: { id: "singleton" },
      select: { multilabelCategoriesEnabled: true },
    });
    const value = row?.multilabelCategoriesEnabled ?? false;
    mlCached = { value, fetchedAt: Date.now() };
    return value;
  } catch (error) {
    // Column not migrated yet, or a transient error -> OFF (never breaks a request).
    if (!isSchemaNotReadyError(error)) {
      console.error("[platform-settings] multilabel flag read failed:", error);
    }
    mlCached = { value: false, fetchedAt: Date.now() };
    return false;
  }
}

/** Flip the multi-label kill switch (instant off, ~30s cache, no deploy). */
export async function setMultilabelCategoriesEnabled(enabled: boolean): Promise<void> {
  // Direct upsert (not updateSettings) so the isolated flag stays out of the
  // typed PlatformSettingsData shape used by the main getSettings read.
  await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: { multilabelCategoriesEnabled: enabled },
    create: { id: "singleton", multilabelCategoriesEnabled: enabled },
  });
  mlCached = null;
}

// ---------------------------------------------------------------------------
// categorizationV2Enabled: the upgraded recognition engine (dense k50 + rerank
// WITH confidence + few-shot, high-confidence picks auto-selected). Separate
// kill switch, default OFF, so merging is a NO-OP until flipped. When this is
// ON, it supersedes the legacy multilabel behaviour. See NOTES.md.
// ---------------------------------------------------------------------------
let v2Cached: { value: boolean; fetchedAt: number } | null = null;

/** Whether the v2 (confidence + auto-select) categorization engine is live. */
export async function isCategorizationV2Enabled(): Promise<boolean> {
  if (v2Cached && Date.now() - v2Cached.fetchedAt < CACHE_TTL_MS) {
    return v2Cached.value;
  }
  try {
    const row = await prisma.platformSettings.findUnique({
      where: { id: "singleton" },
      select: { categorizationV2Enabled: true },
    });
    const value = row?.categorizationV2Enabled ?? false;
    v2Cached = { value, fetchedAt: Date.now() };
    return value;
  } catch (error) {
    // Column not migrated yet, or a transient error -> OFF (never breaks a request).
    if (!isSchemaNotReadyError(error)) {
      console.error("[platform-settings] categorizationV2 flag read failed:", error);
    }
    v2Cached = { value: false, fetchedAt: Date.now() };
    return false;
  }
}

/** Flip the v2 categorization kill switch (instant, ~30s cache, no deploy). */
export async function setCategorizationV2Enabled(enabled: boolean): Promise<void> {
  await prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: { categorizationV2Enabled: enabled },
    create: { id: "singleton", categorizationV2Enabled: enabled },
  });
  v2Cached = null;
}
