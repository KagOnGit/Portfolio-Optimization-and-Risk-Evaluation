export async function fetchWithBackoff(
  input: string,
  init: RequestInit = {},
  tries = 3,
  baseMs = 500
): Promise<Response> {
  let lastErr: any = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(input, init);
      if (res.status === 429 || res.status === 503) throw new Error(`Rate/Service: ${res.status}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      lastErr = e;
      const wait = Math.min(baseMs * Math.pow(2, i), 8000);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  throw lastErr || new Error('fetchWithBackoff failed');
}
