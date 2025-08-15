// lib/cachedFetch.ts
// A tiny fetch wrapper with optional in-memory TTL caching.
// Works in both client and server environments.

import { getCache, setCache } from './cache';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type CachedJsonOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;   // If object, we'll JSON.stringify it
  ttl?: number; // ms. 0/undefined => no cache
};

function cacheKey(url: string, method: HttpMethod, body: unknown): string {
  const b =
    body === undefined || body === null
      ? ''
      : typeof body === 'string'
      ? body
      : JSON.stringify(body);
  return `${method}:${url}:${b}`;
}

export async function cachedJson<T = any>(url: string, opts: CachedJsonOptions = {}): Promise<T> {
  const method: HttpMethod = (opts.method || 'GET').toUpperCase() as HttpMethod;
  const ttl = Number.isFinite(opts.ttl) ? Number(opts.ttl) : 0;
  const key = ttl > 0 ? cacheKey(url, method, opts.body) : '';

  if (ttl > 0) {
    const hit = getCache<T>(key);
    if (hit !== null) return hit;
  }

  const headers: Record<string, string> = { ...(opts.headers || {}) };
  const init: RequestInit = { method, headers, cache: 'no-store' };

  if (opts.body !== undefined && opts.body !== null) {
    const b = opts.body;
    if (
      typeof b === 'string' ||
      b instanceof FormData ||
      b instanceof Blob ||
      b instanceof ArrayBuffer
    ) {
      (init as any).body = b as any;
    } else {
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
      (init as any).body = JSON.stringify(b);
    }
  }

  const res = await fetch(url, init);
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch {}
    throw new Error(`HTTP ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ''}`);
  }

  const json = (await res.json()) as T;
  if (ttl > 0) setCache(key, json, ttl);
  return json;
}

export const cachedGet = <T = any>(url: string, ttl?: number, headers?: Record<string, string>) =>
  cachedJson<T>(url, { method: 'GET', ttl, headers });

export const cachedPost = <T = any>(url: string, body?: any, ttl?: number, headers?: Record<string, string>) =>
  cachedJson<T>(url, { method: 'POST', body, ttl, headers });