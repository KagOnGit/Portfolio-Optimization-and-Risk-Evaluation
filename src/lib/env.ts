import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    FRED_API_KEY: z.string().min(1).optional().default('demo-key'),
    ALPHAVANTAGE_API_KEY: z.string().min(1).optional().default('demo-key'),
    SEC_USER_AGENT: z.string().min(1).optional().default('Demo User demo@example.com'),
    FMP_API_KEY: z.string().min(1).optional().default('demo-key'),
  },
  client: {
    NEXT_PUBLIC_APP_NAME: z.string().default('Portfolio Optimizer'),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
});
