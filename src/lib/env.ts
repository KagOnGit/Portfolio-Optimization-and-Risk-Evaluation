import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    ALPHA_VANTAGE_KEY: z.string().min(1),
    FRED_API_KEY: z.string().min(1),
    SEC_APP_NAME: z.string().min(1), // e.g. 'YourName your@email.com'
  },
  client: {
    NEXT_PUBLIC_APP_NAME: z.string().default('Portfolio Optimizer'),
  },
  experimental__runtimeEnv: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
});
