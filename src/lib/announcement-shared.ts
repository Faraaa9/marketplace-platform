// Pure constants shared by the admin UI (dropdowns), the API validation, and the
// render layer. No prisma / lucide / next imports so any side can use it.

export const ANNOUNCEMENT_AUDIENCES = ["PROVIDER", "CLIENT", "ALL"] as const;
export type AnnouncementAudience = (typeof ANNOUNCEMENT_AUDIENCES)[number];

export const AUDIENCE_LABELS: Record<AnnouncementAudience, string> = {
  PROVIDER: "Tiekėjams",
  CLIENT: "Klientams",
  ALL: "Visiems",
};

export const ANNOUNCEMENT_ICONS = [
  "lightbulb",
  "sparkles",
  "megaphone",
  "gift",
  "rocket",
  "info",
] as const;
export type AnnouncementIcon = (typeof ANNOUNCEMENT_ICONS)[number];

export const ICON_LABELS: Record<AnnouncementIcon, string> = {
  lightbulb: "Lemputė",
  sparkles: "Žvaigždutės",
  megaphone: "Megafonas",
  gift: "Dovana",
  rocket: "Raketa",
  info: "Informacija",
};

export function isAnnouncementAudience(v: unknown): v is AnnouncementAudience {
  return typeof v === "string" && (ANNOUNCEMENT_AUDIENCES as readonly string[]).includes(v);
}

export function isAnnouncementIcon(v: unknown): v is AnnouncementIcon {
  return typeof v === "string" && (ANNOUNCEMENT_ICONS as readonly string[]).includes(v);
}

/** Which audience values a given surface should display. */
export function audiencesForSurface(surface: "provider" | "client"): AnnouncementAudience[] {
  return surface === "provider" ? ["PROVIDER", "ALL"] : ["CLIENT", "ALL"];
}
