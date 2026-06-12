type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (command: "event", eventName: string, params?: AnalyticsParams) => void;
    dataLayer?: unknown[];
  }
}

export function trackEvent(eventName: string, params: AnalyticsParams = {}) {
  if (typeof window === "undefined") return;

  window.gtag?.("event", eventName, params);
  window.dataLayer?.push({ event: eventName, ...params });
}
