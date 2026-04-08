// Cost per token in USD — input / output
// Updated: 2026-04-08
type ModelPricing = {
  input: number;   // cost per 1 token
  output: number;  // cost per 1 token
  provider: string;
};

const PRICING: Record<string, ModelPricing> = {
  // ── Anthropic ─────────────────────────────────────
  'claude-opus-4':          { input: 15 / 1e6,  output: 75 / 1e6,  provider: 'anthropic' },
  'claude-opus-4-0514':     { input: 15 / 1e6,  output: 75 / 1e6,  provider: 'anthropic' },
  'claude-sonnet-4':        { input: 3 / 1e6,   output: 15 / 1e6,  provider: 'anthropic' },
  'claude-sonnet-4-0514':   { input: 3 / 1e6,   output: 15 / 1e6,  provider: 'anthropic' },
  'claude-haiku-4':         { input: 0.80 / 1e6, output: 4 / 1e6,  provider: 'anthropic' },
  'claude-haiku-4-0514':    { input: 0.80 / 1e6, output: 4 / 1e6,  provider: 'anthropic' },
  'claude-sonnet-4-5':      { input: 3 / 1e6,   output: 15 / 1e6,  provider: 'anthropic' },
  'claude-opus-4-6':        { input: 15 / 1e6,  output: 75 / 1e6,  provider: 'anthropic' },
  'claude-sonnet-4-6':      { input: 3 / 1e6,   output: 15 / 1e6,  provider: 'anthropic' },
  'claude-haiku-4-5':       { input: 0.80 / 1e6, output: 4 / 1e6,  provider: 'anthropic' },

  // ── OpenAI ────────────────────────────────────────
  'gpt-4o':                 { input: 2.50 / 1e6, output: 10 / 1e6,  provider: 'openai' },
  'gpt-4o-2024-11-20':      { input: 2.50 / 1e6, output: 10 / 1e6,  provider: 'openai' },
  'gpt-4o-mini':            { input: 0.15 / 1e6, output: 0.60 / 1e6, provider: 'openai' },
  'gpt-4-turbo':            { input: 10 / 1e6,   output: 30 / 1e6,   provider: 'openai' },
  'o3':                     { input: 10 / 1e6,   output: 40 / 1e6,   provider: 'openai' },
  'o3-mini':                { input: 1.10 / 1e6, output: 4.40 / 1e6, provider: 'openai' },
  'o4-mini':                { input: 1.10 / 1e6, output: 4.40 / 1e6, provider: 'openai' },

  // ── Google ────────────────────────────────────────
  'gemini-2.5-pro':         { input: 1.25 / 1e6, output: 10 / 1e6,  provider: 'google' },
  'gemini-2.5-flash':       { input: 0.15 / 1e6, output: 0.60 / 1e6, provider: 'google' },
  'gemini-2.0-flash':       { input: 0.10 / 1e6, output: 0.40 / 1e6, provider: 'google' },

  // ── DeepSeek ──────────────────────────────────────
  'deepseek-chat':          { input: 0.27 / 1e6, output: 1.10 / 1e6, provider: 'deepseek' },
  'deepseek-reasoner':      { input: 0.55 / 1e6, output: 2.19 / 1e6, provider: 'deepseek' },
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
): { costUsd: number; provider: string } | null {
  const pricing = PRICING[model];
  if (!pricing) return null;

  const costUsd = (inputTokens * pricing.input) + (outputTokens * pricing.output);
  return { costUsd, provider: pricing.provider };
}

export function getProvider(model: string): string {
  const pricing = PRICING[model];
  if (pricing) return pricing.provider;

  // Heuristics for unknown models
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gpt-') || model.startsWith('o3') || model.startsWith('o4')) return 'openai';
  if (model.startsWith('gemini-')) return 'google';
  if (model.startsWith('deepseek-')) return 'deepseek';
  if (model.includes(':')) return 'ollama'; // ollama format: model:tag

  return 'unknown';
}

export function listModels(): Array<{ model: string; provider: string; inputPer1k: number; outputPer1k: number }> {
  return Object.entries(PRICING).map(([model, p]) => ({
    model,
    provider: p.provider,
    inputPer1k: p.input * 1000,
    outputPer1k: p.output * 1000,
  }));
}
