export function createServerTimer(label: string) {
  const start = performance.now();
  let last = start;
  const marks: string[] = [];

  return {
    mark(step: string) {
      const now = performance.now();
      marks.push(`${step}=${Math.round(now - last)}ms`);
      last = now;
    },
    end(meta?: Record<string, string | number | boolean | null | undefined>) {
      const total = Math.round(performance.now() - start);
      const details = meta
        ? Object.entries(meta)
            .filter(([, value]) => value !== undefined && value !== null)
            .map(([key, value]) => `${key}=${String(value)}`)
        : [];
      console.info(`[perf:${label}] ${[...details, ...marks, `total=${total}ms`].join(" ")}`);
    },
  };
}
