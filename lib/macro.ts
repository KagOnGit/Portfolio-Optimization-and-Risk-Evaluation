import { fetchWithBackoff } from './backoff';

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

export type FredObs = { date: string; value: string };
export type FredSeries = { id: string; observations: FredObs[] };

export async function fetchFredSeries(seriesId: string, apiKey: string, start?: string, end?: string): Promise<FredSeries> {
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json'
  });
  if (start) params.set('observation_start', start);
  if (end) params.set('observation_end', end);

  const url = `${FRED_BASE}?${params.toString()}`;
  const res = await fetchWithBackoff(url, { cache: 'no-store' });
  const json = await res.json();
  const observations: FredObs[] = json?.observations || [];
  return { id: seriesId, observations };
}
