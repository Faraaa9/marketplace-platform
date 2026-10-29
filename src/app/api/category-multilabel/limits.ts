// Every multilabel call costs an embedding plus a TypeSafe or LLM call. The form
// calls it once per AI-improve run (itself capped at 15/h), so 20/h never bites
// a real customer.
export const MULTILABEL_RATE_LIMIT = { maxRequests: 20, windowMs: 60 * 60 * 1000 };
export const MULTILABEL_MAX_CHARS = 4000;

// The picker logs a handful of events per request; 60/h leaves room for edits.
export const MULTILABEL_LOG_RATE_LIMIT = { maxRequests: 60, windowMs: 60 * 60 * 1000 };
export const MULTILABEL_LOG_MAX_EVENTS = 20;

export const multilabelRateKey = (ip: string) => `ai:category-multilabel:${ip}`;
export const multilabelLogRateKey = (ip: string) => `category-multilabel-log:${ip}`;
