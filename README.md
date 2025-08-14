Flagship Portfolio Optimizer — Week 2
Live
	•	Deployed on Vercel (root route: /)
What’s included
	•	Endless top ticker ribbon with live quotes and adaptive scroll speed
	•	Real portfolio metrics from historical returns (Sharpe, Sortino, VaR, CVaR; Max DD placeholder)
	•	Macro sparklines (CPIAUCSL, UNRATE, FEDFUNDS) with loaders and inline errors
	•	Robust serverless fetchers with retry/backoff and graceful fallbacks
Key Routes
	•	GET/POST /api/prices/quote
	•	Body: { “symbols”: “SPY”,“QQQ”,“AAPL” }
	•	Returns last price and changePct per symbol
	•	POST /api/metrics
	•	Body: { “tickers”: “SPY”,“QQQ”,“TLT” }
	•	Returns Sharpe, Sortino, VaR, CVaR, Max DD (placeholder)
	•	POST /api/macro/fred
	•	Body: { “series”: “CPIAUCSL”,“UNRATE”,“FEDFUNDS” }
	•	Requires FRED_API_KEY
Environment
	•	.env.local (and set in Vercel → Project → Settings → Environment Variables)
	•	FRED_API_KEY=
	•	ALPHAVANTAGE_API_KEY= (optional, future fallback)
	•	SEC_USER_AGENT=“Your Name your.email@example.com”
Scripts
	•	npm run dev — local dev at http://localhost:3000
	•	npm run build — production build
Tech
	•	Next.js App Router, TypeScript, Tailwind CSS
	•	Stooq CSV for prices (server-side), FRED for macro
	•	In-memory backoff/cache helpers
Tag and deploy commands
	•	Ensure local build passes:
	•	npm i
	•	npm run build
	•	Commit any pending changes:
	•	git add .
	•	git commit -m “feat(week2): seamless ticker, live metrics, macro sparklines, backoff”
	•	Push:
	•	git push origin main
	•	Tag the release:
	•	git tag v0.2.0-week2
	•	git push –tags
	•	Vercel auto-builds on push; if not linked yet, import the GitHub repo in Vercel and redeploy after setting FRED_API_KEY.
Quick validation checklist
	•	Ribbon
	•	Scrolls endlessly without a jump
	•	Prices and change% show within a couple seconds
	•	Duration adapts on resize/content length
	•	KPIs
	•	Numbers populate (not all em-dashes)
	•	No console/network errors
	•	Macro
	•	Panels show loaders while fetching
	•	If FRED key missing/invalid, panels show clear inline error
	•	With a valid key, each sparkline renders