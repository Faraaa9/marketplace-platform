export const INITIAL_THREAD_MESSAGE_LIMIT = 25;
export const THREAD_HISTORY_PAGE_SIZE = 25;

export function newestWindowChronological<T>(items: T[]) {
  return [...items].reverse();
}
