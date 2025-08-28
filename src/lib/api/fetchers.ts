// DEMO MODE fallbacks if env keys missing
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

function demoSeries(){ const now=new Date(); const arr=[]; let v=100; for(let i=0;i<120;i++){ v*= (1+ (Math.random()-0.5)/50); const d=new Date(now); d.setMonth(d.getMonth()- (120-i)); arr.push({date: d.toISOString().slice(0,10), value: Number(v.toFixed(2))}); } return arr; }

export async function demoAlpha(){ return { 'Monthly Adjusted Time Series': Object.fromEntries(demoSeries().map(p=>[p.date,{ '5. adjusted close': String(p.value)}])) }; }
export async function demoFRED(){ return { observations: demoSeries().map(p=>({date:p.date, value: String(p.value)})) }; }
