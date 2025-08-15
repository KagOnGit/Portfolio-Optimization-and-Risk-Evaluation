// lib/backoff.ts
export async function fetchWithBackoff(
  input: string,
  init: RequestInit = {},
  tries = 3,
  baseMs = 500
): Promise<Response> {
  const ua =
    process.env.SEC_USER_AGENT ||
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36';

  const headers = new Headers(init.headers || {});
  if (!headers.has('User-Agent')) headers.set('User-Agent', ua);

  let lastErr: any = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(input, { ...init, headers });
      if (res.status === 429 || res.status === 503) throw new Error(`Rate/Service: ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      lastErr = e;
      const wait = Math.min(baseMs * 2 ** i, 8000);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw lastErr || new Error('fetchWithBackoff failed');
}