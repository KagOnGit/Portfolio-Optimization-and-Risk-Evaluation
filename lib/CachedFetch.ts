// lib/cachedFetch.ts
// Tiny wrapper around fetch with optional TTL-based ISR, plus JSON convenience.

export type CacheArg = { ttl?: number }; // milliseconds

export type FetchJSONInit = Omit<RequestInit, 'body' | 'headers' | 'cache'> & {
  /** Plain object will be JSON.stringified */
  body?: any;
  /** Extra headers to merge (Content-Type set automatically for JSON body) */
  headers?: Record<string, string>;
  /** Optional cache TTL in milliseconds (converted to next.revalidate seconds) */
  ttl?: number;
};

// --- internal helpers --------------------------------------------------------

function buildFetchInit(init?: FetchJSONInit): RequestInit {
  const i = init ?? {};
  const headers: Record<string, string> = { ...(i.headers || {}) };

  let bodyToSend: BodyInit | null | undefined = i.body;

  // If body is a plain object/stringifiable, send JSON
  const isPlainObject =
    bodyToSend &&
    typeof bodyToSend === 'object' &&
    !(bodyToSend instanceof FormData) &&
    !(bodyToSend instanceof Blob) &&
    !(bodyToSend instanceof ArrayBuffer);

  if (isPlainObject) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    bodyToSend = JSON.stringify(bodyToSend);
  }

  const revalidateSec =
    typeof i.ttl === 'number' && i.ttl > 0 ? Math.max(1, Math.round(i.ttl / 1000)) : undefined;

  // NOTE: RequestInit in Next already has `next?: NextFetchRequestConfig`.
  // We won't narrow it; we’ll just assign to it dynamically to avoid TS clashes.
  const out: RequestInit = {
    ...i,
    headers,
    cache: 'no-store', // predictable in dev; Next will still honor next.revalidate
    body: bodyToSend as any,
  };

  if (revalidateSec) {
    (out as any).next = { ...(out as any).next, revalidate: revalidateSec };
  }

  return out;
}

async function handleJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.error) msg = `${msg}: ${j.error}`;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

// --- public API --------------------------------------------------------------

/**
 * Fetch JSON with optional TTL caching.
 * Overload 1: cachedJson(url, init?)
 * Overload 2: cachedJson(url, init?, { ttl })
 */
export function cachedJson<T>(url: string, init?: FetchJSONInit): Promise<T>;
export function cachedJson<T>(url: string, init: FetchJSONInit | undefined, cache: CacheArg): Promise<T>;
export async function cachedJson<T>(
  url: string,
  init?: FetchJSONInit,
  cache?: CacheArg
): Promise<T> {
  const merged: FetchJSONInit = { ...(init || {}) };
  if (cache && typeof cache.ttl === 'number' && merged.ttl === undefined) {
    merged.ttl = cache.ttl;
  }
  const reqInit = buildFetchInit(merged);
  const res = await fetch(url, reqInit);
  return handleJson<T>(res);
}

/**
 * Fetch (non-JSON) with TTL support; returns Response.
 */
export function cachedFetch(url: string, init?: FetchJSONInit): Promise<Response>;
export function cachedFetch(url: string, init: FetchJSONInit | undefined, cache: CacheArg): Promise<Response>;
export async function cachedFetch(
  url: string,
  init?: FetchJSONInit,
  cache?: CacheArg
): Promise<Response> {
  const merged: FetchJSONInit = { ...(init || {}) };
  if (cache && typeof cache.ttl === 'number' && merged.ttl === undefined) {
    merged.ttl = cache.ttl;
  }
  const reqInit = buildFetchInit(merged);
  return await fetch(url, reqInit);
}