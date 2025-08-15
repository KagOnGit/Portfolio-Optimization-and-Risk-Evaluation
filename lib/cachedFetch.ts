// lib/cachedFetch.ts
import { getCache, setCache } from './cache';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type CachedJsonOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;            // plain object OK; will JSON.stringify
  ttl?: number;          // ms; 0/undefined => no cache
  signal?: AbortSignal;  // passthrough
  credentials?: RequestCredentials; // e.g. 'include'
};

function hasHeader(headers: Record<string, string>, name: string) {
  const n = name.toLowerCase();
  return Object.keys(headers).some((k) => k.toLowerCase() === n);
}

function isDefinedCtor(name: 'FormData' | 'Blob' | 'URLSearchParams' | 'ArrayBuffer') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return typeof (globalThis as any)[name] !== 'undefined';
}

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
  const ttl = Number.isFinite(opts.ttl as number) ? Number(opts.ttl) : 0;
  const key = ttl > 0 ? cacheKey(url, method, opts.body) : '';

  if (ttl > 0) {
    const hit = getCache<T>(key);
    if (hit !== null) return hit;
  }

  const headers: Record<string, string> = { ...(opts.headers || {}) };
  const init: RequestInit = {
    method,
    headers,
    cache: 'no-store',
    signal: opts.signal,
    credentials: opts.credentials,
  };

  const b = opts.body;
  if (b !== undefined && b !== null) {
    const useFormData = isDefinedCtor('FormData') && b instanceof FormData;
    const useBlob = isDefinedCtor('Blob') && b instanceof Blob;
    const useUrlParams = isDefinedCtor('URLSearchParams') && b instanceof URLSearchParams;
    const useArrayBuffer = isDefinedCtor('ArrayBuffer') && b instanceof ArrayBuffer;

    if (typeof b === 'string' || useFormData || useBlob || useUrlParams || useArrayBuffer) {
      (init as any).body = b as any;
    } else {
      if (!hasHeader(headers, 'Content-Type')) headers['Content-Type'] = 'application/json';
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