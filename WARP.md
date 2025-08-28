# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Common Development Commands

### Package Management
- **Install dependencies**: `pnpm install`
- **Add dependency**: `pnpm add <package>`  
- **Add dev dependency**: `pnpm add -D <package>`

### Development Server
- **Start development server**: `pnpm dev` (runs on http://localhost:3000)
- **Build for production**: `pnpm build`
- **Start production server**: `pnpm start`

### Code Quality
- **Run ESLint**: `pnpm lint`
- **Type checking**: `pnpm typecheck`
- **Format code**: `prettier --write .` (Prettier config: `.prettierrc`)

### Testing & Deployment
- **Deploy to Vercel**: `vercel` (staging), `vercel --prod` (production)
- **Local Vercel preview**: `vercel dev`

## Project Architecture

### Core Stack
- **Framework**: Next.js 15 with App Router (`/src/app/`)
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS v4 with custom utilities (`.card`, `.muted`)
- **State Management**: React Query (@tanstack/react-query) + Zustand
- **Charts**: Recharts for data visualizations
- **Environment**: T3 Env for type-safe environment variables

### Directory Structure
```
src/
├── app/                 # Next.js App Router pages and layouts
├── components/          # Reusable React components
└── lib/
    ├── api/            # API client functions (fetchers.ts)
    └── env.ts          # Environment variable validation
```

### Data Sources & APIs
The application integrates with three primary financial data sources:

1. **Alpha Vantage** (`fetchAlphaVantage`): Stock market data and time series
2. **FRED API** (`fetchFRED`): Economic indicators and treasury data  
3. **SEC EDGAR** (`fetchSEC`): Company filings and regulatory documents

All API clients are centralized in `/src/lib/api/fetchers.ts` with built-in rate limiting and caching.

### Environment Variables
Required environment variables (validated via Zod schemas in `env.ts`):
- `ALPHA_VANTAGE_KEY`: API key from alphavantage.co
- `FRED_API_KEY`: API key from FRED (Federal Reserve Economic Data)
- `SEC_APP_NAME`: User identification for SEC API compliance (format: "Name email@domain.com")

### State Management Pattern
- **Server State**: React Query handles API data fetching, caching, and synchronization
- **Client State**: Zustand for local application state (when needed)
- **Query Keys**: Structured as `['source', 'identifier']` (e.g., `['fred', 'DGS10']`, `['alpha', 'SPY']`)

### Data Flow Architecture
1. Components use React Query hooks (`useQuery`) for data fetching
2. Query functions call centralized fetchers from `/lib/api/`
3. Fetchers handle API authentication, rate limiting, and error handling
4. Data flows through Recharts components for visualization

### API Route Structure
Planned API endpoints (currently implemented as client-side fetches):
- `/api/market/alpha` - Alpha Vantage market data proxy
- `/api/econ/fred` - FRED economic data proxy  
- `/api/sec/filings` - SEC filings data proxy

### Styling System
- **Tailwind CSS v4** with inline theme configuration in `globals.css`
- **Custom utilities**: `.card` (rounded white containers), `.muted` (gray text)
- **Typography**: Geist Sans and Geist Mono fonts
- **Dark mode**: Automatic based on system preference
- **Layout**: Centered max-width container with responsive padding

### Data Visualization
- **Primary library**: Recharts for financial charts and time series
- **Chart types**: LineChart with XAxis, YAxis, and Tooltip components
- **Data format**: Standardized `{ date: string, value: number }` objects
- **Responsive**: Charts use `ResponsiveContainer` for fluid sizing

## Development Notes

### API Rate Limiting
- Alpha Vantage requests include 250ms delay between calls
- All external API calls use Next.js `fetch` with revalidation caching
- FRED: 1 hour cache (`revalidate: 3600`)
- SEC: 6 hour cache (`revalidate: 21600`)

### Type Safety
- Strict TypeScript configuration with `noEmit` checking
- Zod schemas for runtime environment validation
- ESLint extends Next.js core web vitals and TypeScript rules

### Code Organization Patterns
- Client components marked with `'use client'` directive
- API logic separated from UI components  
- Environment variables centrally managed and type-safe
- Consistent naming: camelCase for variables, PascalCase for components

### Deployment Configuration
- **Platform**: Vercel with Next.js framework detection
- **Function settings**: 256MB memory, 10s timeout for API routes
- **Build output**: Static where possible, serverless functions for dynamic content
