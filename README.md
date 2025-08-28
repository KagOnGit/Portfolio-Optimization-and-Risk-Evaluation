# Portfolio Optimizer

AI-driven portfolio optimization & risk management web app built with Next.js, TypeScript, Tailwind, and Vercel. Integrates FRED, Alpha Vantage, and SEC EDGAR data to deliver interactive dashboards, advanced risk metrics, and multi-strategy portfolio insights.

## Features

- **Real-time Market Data**: Integration with Alpha Vantage for stock market data
- **Economic Indicators**: FRED API integration for treasury yields and economic data
- **SEC Filings**: Access to SEC EDGAR database for company filings
- **Interactive Charts**: Recharts-powered visualizations
- **Type-safe Environment**: T3 Env for validated environment variables
- **Modern Stack**: Next.js 15, React Query, Tailwind CSS, TypeScript

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd portfolio-optimizer
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your API keys:
   - `ALPHA_VANTAGE_KEY`: Get from [Alpha Vantage](https://www.alphavantage.co/support/#api-key)
   - `FRED_API_KEY`: Get from [FRED](https://fred.stlouisfed.org/docs/api/api_key.html)
   - `SEC_APP_NAME`: Your name and email for SEC API compliance

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** to view the application

## Available Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Run TypeScript type checking

## API Endpoints

- `/api/market/alpha` - Alpha Vantage market data
- `/api/econ/fred` - FRED economic data
- `/api/sec/filings` - SEC filings data

## Deploy

Use Vercel CLI: `vercel`, then `vercel --prod`.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Query + Zustand
- **Charts**: Recharts
- **Environment**: T3 Env
- **Deployment**: Vercel

## Financial Modeling Prep (FMP)
- Env: `FMP_API_KEY`
- Test: `/api/fmp/profile?symbol=AAPL`
