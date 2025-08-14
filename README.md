# Flagship Portfolio Optimizer (Week 1)

Live app scaffolding with mock metrics and optimizer.

## Setup
1) Copy `.env.example` to `.env.local` and fill placeholders (keys used from Week 2).
2) npm i
3) npm run dev
4) Deploy with Vercel.

## Notes for Data (upcoming weeks)
- FRED series_observations returns macro time series; requires API key and supports parameters like observation_start and file_type=json[1][2].
- Real-time/revisions can be queried via realtime_start/end[11].
- Alpha Vantage free tier allows up to 25 requests/day; design strict caching/fallbacks[15][18][9].
- SEC EDGAR endpoints require declaring a User-Agent header when accessing data.sec.gov[19][16][7].
