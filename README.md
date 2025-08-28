# 📈 Portfolio Optimizer (Flagship)

AI-driven portfolio optimization & risk management web app.  
Built with **Next.js 15**, **TypeScript**, **Tailwind**, deployed on **Vercel**.

---

## ✨ Features
- **Market Data** (Alpha Vantage: daily/weekly/monthly OHLCV)
- **Economic Data** (FRED: CPI, GDP, Unemployment, Yields, Fed Funds)
- **Factors** (FMP: P/E, Beta, Sector, Market Cap)
- **Optimizer** (Efficient frontier, constraints, risk-parity, CSV/PDF export)
- **Dark/Light Theme** toggle
- **Responsive** modern UI

---

## 🚀 Quick Start
```bash
cp .env.example .env.local   # fill keys
pnpm i && pnpm dev
```

**Environment Variables:**
- `FRED_API_KEY`: [Get from FRED](https://fred.stlouisfed.org/docs/api/api_key.html)
- `ALPHAVANTAGE_API_KEY`: [Get from Alpha Vantage](https://www.alphavantage.co/support/#api-key)
- `FMP_API_KEY`: [Get from Financial Modeling Prep](https://financialmodelingprep.com/developer/docs)
- `SEC_USER_AGENT`: Your name and email for SEC API compliance

---

## 📊 Pages & Features

### 🏠 **Dashboard** (`/`)
- Tabbed interface for all modules
- Embedded views: Market, Economic, Optimizer, Factors
- Seamless navigation between data sources

### 📈 **Market Data** (`/market`)
- Real-time stock prices from Alpha Vantage
- Daily/Weekly/Monthly frequency toggle
- Interactive charts with Recharts
- Symbol search and historical data

### 🏛️ **Economic Data** (`/econ`)
- Federal Reserve Economic Data (FRED)
- Key indicators: CPI, GDP, Unemployment, Treasury Yields
- Fed Funds Rate tracking
- Time series visualizations

### ⚡ **Portfolio Optimizer** (`/optimize`)
- **Constrained optimization** with min/max weight bounds
- **Efficient frontier** visualization (3000+ portfolio samples)
- **Short selling** support (negative min weights)
- **Risk metrics**: Sharpe ratio, volatility, returns
- **Export capabilities**: CSV weights, PDF reports
- Real-time optimization with scatter plot visualization

### 🔍 **Factors Analysis** (`/factors`)
- Company fundamentals from Financial Modeling Prep
- Beta, P/E ratios, sector classification, market cap
- Multi-symbol analysis (up to 25 symbols)
- Decision support for portfolio construction

---

## 🎨 Design & UX
- **Dark/Light Theme** with system preference detection
- **Responsive layout** optimized for all screen sizes
- **Modern UI** with Tailwind CSS and custom components
- **Navigation**: Clean header with tabbed dashboard interface
- **Typography**: Optimized for financial data readability

---

## 🛠️ Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript with strict type checking
- **Styling**: Tailwind CSS v4 + next-themes
- **State**: React Query (@tanstack/react-query) for server state
- **Charts**: Recharts for financial visualizations
- **UI Components**: Headless UI, Heroicons
- **PDF Export**: jsPDF for report generation
- **Environment**: T3 Env for type-safe config
- **Deployment**: Vercel with automatic deployments

---

## 🔧 API Architecture
- **Alpha Vantage**: `/api/market/alpha` - Stock market data
- **FRED**: `/api/econ/fred` - Economic indicators
- **FMP**: `/api/fmp/factors` - Company fundamentals
- **SEC**: `/api/sec/filings` - Regulatory filings
- **Caching**: Built-in revalidation with Next.js
- **Rate Limiting**: Optimized API call patterns

---

## 📦 Scripts
```bash
pnpm dev          # Development server
pnpm build        # Production build
pnpm start        # Production server
pnpm lint         # ESLint checking
pnpm typecheck    # TypeScript validation
```

---

## 🚀 Deployment
**Live Demo**: Deployed on Vercel

```bash
vercel --prod     # Deploy to production
```

**Features**:
- Automatic deployments from Git
- Environment variable management
- Serverless functions for API routes
- Global CDN for optimal performance

---

## 📈 Portfolio Optimization Features

### **Constrained Optimization**
- Set individual asset weight bounds (min/max)
- Support for **short selling** (negative minimum weights)
- **3000+ random portfolios** for robust frontier generation
- Real-time constraint validation and feasibility checking

### **Risk Analysis**
- **Sharpe ratio optimization** for risk-adjusted returns
- **Efficient frontier** visualization with scatter plots
- **Correlation analysis** via covariance matrix calculations
- **Monte Carlo sampling** for portfolio weight generation

### **Export & Reporting**
- **CSV export**: Portfolio weights and allocations
- **PDF reports**: Complete optimization summary with jsPDF
- **Interactive charts**: Hover tooltips and zoom capabilities
- **Real-time updates**: Instant recalculation on parameter changes

---

*Built with ❤️ using modern web technologies*
