// lib/cachedFetch.ts
import { getCache, setCache } from './cache';

/**
 * Cached JSON fetch — avoids re-fetching for a TTL period.
 *
 * @param url The API endpoint or URL to fetch.
 * @param opts Fetch options plus optional { ttl } in milliseconds.
 */
export async function cachedJson<T = unknown>(
  url: string,
  opts?: RequestInit & { ttl?: number }
): Promise<T> {
  const ttl = opts?.ttl ?? 60_000; // default 1 min
  const key = `cf:${url}:${opts?.method || 'GET'}:${opts?.body ? JSON.stringify(opts.body) : ''}`;

  const hit = getCache<T>(key);
  if (hit !== null) return hit;

  const res = await fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.headers || {}),
    },
    body: opts?.body && typeof opts.body !== 'string'
      ? JSON.stringify(opts.body)
      : (opts?.body as any),
  });

  if (!res.ok) {
    throw new Error(`cachedFetch error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as T;
  setCache(key, data, ttl);
  return data;
}