// Simple in-memory cache per serverless instance (best-effort).
type Entry<T> = { value: T; until: number };
const store = new Map<string, Entry<any>>();

export function getCache<T>(key: string): T | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() > e.until) { store.delete(key); return null; }
  return e.value as T;
}

export function setCache<T>(key: string, value: T, ttlMs = 60_000): void {
  store.set(key, { value, until: Date.now() + ttlMs });
}
