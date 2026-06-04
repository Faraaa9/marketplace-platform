export const INITIAL_THREAD_MESSAGE_LIMIT = 25;

export function newestWindowChronological<T>(items: T[]) {
  return [...items].reverse();
}
