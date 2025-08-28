import { env } from '@/lib/env';

const withDelay = (ms:number)=> new Promise(res=>setTimeout(res, ms));

export async function fetchAlphaVantage(path: string, params: Record<string,string>) {
  const q = new URLSearchParams({ ...params, apikey: env.ALPHAVANTAGE_API_KEY }).toString();
  const url = `https://www.alphavantage.co/${path}?${q}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error('AlphaVantage error');
  // polite small delay to avoid limits in burst usage
  await withDelay(250);
  return res.json();
}

export async function fetchFRED(series: string, extra: Record<string,string> = {}) {
  const q = new URLSearchParams({ series_id: series, api_key: env.FRED_API_KEY, file_type: 'json', ...extra }).toString();
  const url = `https://api.stlouisfed.org/fred/series/observations?${q}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error('FRED error');
  return res.json();
}

export async function fetchSEC(path: string) {
  const url = `https://www.sec.gov${path}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': env.SEC_USER_AGENT },
    next: { revalidate: 21600 }
  });
  if (!res.ok) throw new Error('SEC error');
  return res.json();
}

export async function fetchFMP(path: string, params: Record<string,string> = {}) {
  const q = new URLSearchParams({ ...params, apikey: env.FMP_API_KEY }).toString();
  const url = `https://financialmodelingprep.com/api/v3/${path}?${q}`;
  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error('FMP error');
  return res.json();
}
