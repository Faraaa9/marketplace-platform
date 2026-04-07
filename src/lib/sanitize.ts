/**
 * Sanitize user input by escaping HTML entities.
 * Prevents XSS attacks when user content is rendered.
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Sanitize an object's string fields in place.
 * Only processes specified keys.
 */
export function sanitizeFields<T extends Record<string, unknown>>(
  obj: T,
  keys: (keyof T)[]
): T {
  const result = { ...obj };
  for (const key of keys) {
    if (typeof result[key] === "string") {
      (result as Record<string, unknown>)[key as string] = sanitizeHtml(result[key] as string);
    }
  }
  return result;
}
