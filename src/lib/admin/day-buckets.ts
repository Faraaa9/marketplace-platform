export type DayBucket = { date: string; label: string; count: number };

/**
 * Builds a 14-day rolling bucket of counts for the admin charts. Empty days
 * are kept so the chart line doesn't collapse on quiet days.
 */
export function buildDayBuckets(rows: { createdAt: Date }[]): DayBucket[] {
  const dayCounts = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dayCounts.set(date.toISOString().split("T")[0], 0);
  }
  for (const row of rows) {
    const key = row.createdAt.toISOString().split("T")[0];
    if (dayCounts.has(key)) {
      dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
    }
  }
  return Array.from(dayCounts.entries()).map(([date, count]) => ({
    date,
    label: new Date(date).toLocaleDateString("lt-LT", { month: "short", day: "numeric" }),
    count,
  }));
}
