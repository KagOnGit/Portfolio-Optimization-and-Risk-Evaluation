// lib/validation.ts
import { z } from 'zod';

/**
 * Query used by /api/prices/history to request a symbol + date range.
 * - normalizes `symbol` => TRIM + UPPERCASE
 * - validates `range` against a small enum with a default of '6mo'
 */
export const pricesHistoryQuerySchema = z.object({
  symbol: z
    .string()
    .min(1, 'symbol required')
    .transform((s) => s.trim().toUpperCase()),
  range: z
    .enum(['1d', '5d', '1mo', '6mo', '1y', '5y', 'max'])
    .default('6mo'),
});

export type PricesHistoryQuery = z.infer<typeof pricesHistoryQuerySchema>;

/** Helper if you prefer a function instead of calling schema.parse directly. */
export function validatePricesHistoryQuery(input: unknown): PricesHistoryQuery {
  return pricesHistoryQuerySchema.parse(input);
}