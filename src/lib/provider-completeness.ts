/**
 * Provider profile completeness — the seven fields the dashboard scores and the
 * progress/missing-items it derives. Shared by the dashboard work-center data
 * loader (provider-work-center-data.ts) and the ProfileCompleteness section so
 * the two never drift. Previously inlined in the now-removed /api/tiekejas/stats route.
 */
export interface CompletenessProfileInput {
  description: string | null;
  headline: string | null;
  services: string | null;
  location: string | null;
  phone: string | null;
  images: string[];
  categoryCount: number;
}

export function computeProfileCompleteness(input: CompletenessProfileInput): {
  completeness: number;
  missingItems: string[];
} {
  const items = [
    { done: !!(input.description && input.description.length >= 20), label: "Aprašymas" },
    { done: !!input.headline, label: "Antraštė" },
    { done: input.categoryCount > 0, label: "Kategorijos" },
    { done: !!input.services, label: "Paslaugos" },
    { done: !!input.location, label: "Miestas" },
    { done: !!input.phone, label: "Telefonas" },
    { done: input.images.length > 0, label: "Nuotraukos" },
  ];
  const completeness = Math.round(
    (items.filter((i) => i.done).length / items.length) * 100,
  );
  const missingItems = items.filter((i) => !i.done).map((i) => i.label);
  return { completeness, missingItems };
}
