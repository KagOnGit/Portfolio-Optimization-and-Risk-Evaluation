import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    FRED_API_KEY: z.string().min(1),
    ALPHAVANTAGE_API_KEY: z.string().min(1),
    SEC_USER_AGENT: z.string().min(1),   // e.g., 'Aditya Singh adityasingh0929@gmail.com'
    FMP_API_KEY: z.string().min(1),
  },
  client: {
    NEXT_PUBLIC_APP_NAME: z.string().default('Portfolio Optimizer'),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
});
