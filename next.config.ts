import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

const _cfg: NextConfig = {
  /* config options here */
};

export default withSentryConfig(_cfg, { silent: true });
