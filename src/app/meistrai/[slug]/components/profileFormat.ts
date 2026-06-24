/** Human label for an average response time in hours (null = unknown). */
export function responseTimeLabel(hours: number | null): string | null {
  if (hours === null) return null;
  if (hours < 1) return "< 1 val.";
  if (hours < 24) return `~${hours} val.`;
  return `~${Math.round(hours / 24)} d.`;
}

/** Lithuanian plural for the review count. */
export function reviewsLabel(count: number): string {
  if (count === 1) return "atsiliepimas";
  if (count < 10) return "atsiliepimai";
  return "atsiliepimų";
}
