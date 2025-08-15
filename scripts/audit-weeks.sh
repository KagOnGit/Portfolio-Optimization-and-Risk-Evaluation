#!/usr/bin/env bash
set -euo pipefail

echo "== Repo audit =="
root="$(pwd)"

check() {
  local label="$1"; shift
  if eval "$@" >/dev/null 2>&1; then
    printf "✅ %s\n" "$label"
  else
    printf "❌ %s\n" "$label"
  fi
}

echo
echo "# Week 1 — Scaffold & Mock APIs"
check "Next.js App Router present"          'test -d app'
check "Tailwind configured"                 'test -f tailwind.config.ts -o -f tailwind.config.js'
check "Mock metrics route"                  'test -f app/api/metrics/route.ts'
check "Mock optimizer route"                'test -f app/api/portfolio/optimize/route.ts'
check "Core UI components (KPIs/Control)"   'test -f components/KpiCard.tsx -a -f components/ControlPanel.tsx'

echo
echo "# Week 2 — Live data plumbing"
check "prices lib exists"                   'test -f lib/prices.ts'
check "quote API (prices/quote)"            'test -f app/api/prices/quote/route.ts'
check "history API (prices/history)*"       'grep -R \"app/api/prices/history/route.ts\" -n .'
check "FRED macro API"                      'test -f app/api/macro/fred/route.ts -o test -f app/api/macro/route.ts'
check "Env example provided"                'test -f .env.example'

echo
echo "# Week 3 — Caching & helpers"
check "in-memory cache helper"              'test -f lib/cache.ts'
check "cached fetch wrapper"                'test -f lib/cachedFetch.ts'
check "imports use cachedJson"              'grep -R \"cachedJson\" -n app | head -n 1'

echo
echo "# Week 4 — Charts & equity curve"
check "EquityChart component"               'test -f components/EquityChart.tsx'
check "RiskReturnChart component"           'test -f components/RiskReturnChart.tsx'
check "ChartContainer present"              'test -f components/ChartContainer.tsx'

echo
echo "# Week 5 — Ribbon & quotes"
check "TopTickerRibbon component"           'test -f components/TopTickerRibbon.tsx'
check "fetchQuoteSnapshot export"           'grep -n \"export async function fetchQuoteSnapshot\" lib/prices.ts'

echo
echo "# Week 6 — Alerts"
check "alerts API route"                    'test -f app/api/alerts/route.ts'
check "alerts lib"                          'test -f lib/alerts.ts -o grep -R \"evaluateRules\" -n lib'

echo
echo "# Week 7 — Fundamentals & News"
check "fundamentals route"                  'grep -R \"app/api/fundamentals/\" -n app || test 1 -eq 0'
check "news route"                          'grep -R \"app/api/news/\" -n app || test 1 -eq 0'
check "FundamentalsCard component"          'test -f components/FundamentalsCard.tsx'
check "NewsList component"                  'test -f components/NewsList.tsx'

echo
echo "# Week 8 — Persistence & UX"
check "persist helper"                      'test -f lib/persist.ts'
check "DateRangePicker component"           'test -f components/DateRangePicker.tsx'
check "ControlPanel dropdown checklist"     'grep -R \"checkbox\" components/ControlPanel.tsx'

echo
echo "# Week 9 — Testing"
check "Jest config exists"                  'test -f jest.config.ts -o test -f jest.config.js'
check "ts-jest config present"              'grep -R \"ts-jest\" -n jest.config.*'
check "unit tests folder"                   'test -d test/unit'
check "a11y tests folder"                   'test -d test/a11y'
check "can list test files"                 'ls test/**/*.test.* >/dev/null 2>&1'

echo
echo "# Week 10 — CI and production sanity"
check "Project builds locally"              'npm run -s build >/dev/null 2>&1'
check "Vercel deploy settings (optional)"   'test -d .vercel || test 1 -eq 0'

echo
echo "== QUICK SUGGESTIONS =="
echo "- If any Week 2 items are ❌, fix lib/prices.ts exports and /api/prices/* routes first."
echo "- If Week 3 ❌, ensure lib/cache.ts + lib/cachedFetch.ts exist (we already added cachedFetch)."
echo "- If Week 9 ❌, keep tests but pin devDeps as we did to make Vercel CI happy."