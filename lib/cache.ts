// lib/cache.ts
// Lightweight in-memory cache (best-effort). Ephemeral per process/instance.
// Safe across dev HMR via a singleton on globalThis.

type Entry<T = unknown> = { value: T; until: number; touched: number };

type Store = {
  map: Map<string, Entry>;
  max: number;              // soft cap; oldest entries trimmed
};

const KEY = '__MEM_CACHE_SINGLETON__';

// Reuse across HMR / multiple imports
const singleton: Store = (() => {
  const g = globalThis as any;
  if (!g[KEY]) {
    g[KEY] = { map: new Map<string, Entry>(), max: 1000 } as Store;
  }
  return g[KEY] as Store;
})();

/** Set a maximum number of entries (soft cap, default 1000). */
export function setMaxEntries(n: number) {
  singleton.max = Math.max(10, Math.floor(n));
}

/** Internal: evict a few oldest entries if we’re above max. */
function trimIfNeeded() {
  const { map, max } = singleton;
  if (map.size <= max) return;
  // Evict ~10% oldest by 'touched'
  const toDrop = Math.max(1, Math.floor(map.size * 0.1));
  const arr = Array.from(map.entries());
  arr.sort((a, b) => a[1].touched - b[1].touched);
  for (let i = 0; i < toDrop && i < arr.length; i++) {
    map.delete(arr[i][0]);
  }
}

/** Get a cached value if present & not expired; otherwise null. */
export function getCache<T>(key: string): T | null {
  const e = singleton.map.get(key);
  if (!e) return null;
  if (Date.now() > e.until) {
    singleton.map.delete(key);
    return null;
  }
  e.touched = Date.now();
  return e.value as T;
}

/** Put a value with TTL (ms). Default TTL = 60s. */
export function setCache<T>(key: string, value: T, ttlMs = 60_000): void {
  const now = Date.now();
  singleton.map.set(key, { value, until: now + Math.max(1, ttlMs), touched: now });
  trimIfNeeded();
}

/** Delete a single key, returns whether it existed. */
export function delCache(key: string): boolean {
  return singleton.map.delete(key);
}

/** Clear the entire cache. */
export function clearCache(): void {
  singleton.map.clear();
}

/**
 * Get or populate atomically: if present & fresh, returns it;
 * otherwise calls `producer()` to compute & store.
 */
export async function getOrSet<T>(
  key: string,
  ttlMs: number,
  producer: () => Promise<T> | T
): Promise<T> {
  const hit = getCache<T>(key);
  if (hit !== null) return hit;
  const val = await producer();
  setCache(key, val, ttlMs);
  return val;
}