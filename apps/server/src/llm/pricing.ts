/**
 * Pricing lookup: cents per million tokens (input / output).
 * Used to compute estimatedCostCents (hundredths of a cent) for token_usage table.
 */
export const MODEL_PRICING: Record<
  string,
  { inputPerMTok: number; outputPerMTok: number }
> = {
  "claude-sonnet-4-20250514": { inputPerMTok: 300, outputPerMTok: 1500 },
  "claude-haiku-3-20250414": { inputPerMTok: 25, outputPerMTok: 125 },
  "claude-sonnet-4": { inputPerMTok: 300, outputPerMTok: 1500 },
  "claude-haiku-4.5": { inputPerMTok: 100, outputPerMTok: 500 },
  "claude-opus-4.6": { inputPerMTok: 500, outputPerMTok: 2500 },
  "gpt-4o": { inputPerMTok: 250, outputPerMTok: 1000 },
  "gpt-4o-mini": { inputPerMTok: 15, outputPerMTok: 60 },
  "gemini-2.0-flash": { inputPerMTok: 10, outputPerMTok: 40 },
  "gemini-1.5-pro": { inputPerMTok: 125, outputPerMTok: 500 },
  "gemini-1.5-flash": { inputPerMTok: 15, outputPerMTok: 60 },
};

/**
 * Estimated cost in hundredths of a cent (e.g. $0.01 = 1000).
 * Returns 0 for unknown models.
 */
export function calculateCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMTok;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMTok;
  return Math.round((inputCost + outputCost) * 100);
}
