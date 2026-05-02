interface IOpenAIModelPricing {
  input: number;
  cachedInput: number | null;
  output: number;
  longContext?: {
    input: number;
    cachedInput: number | null;
    output: number;
  };
}

// USD per million tokens.
// Keep this table aligned with the OpenAI API pricing page.
const MODEL_PRICING: Record<string, IOpenAIModelPricing> = {
  'gpt-5.5': {
    input: 5,
    cachedInput: 0.5,
    output: 30,
    longContext: { input: 10, cachedInput: 1, output: 45 },
  },
  'gpt-5.4': {
    input: 2.5,
    cachedInput: 0.25,
    output: 15,
    longContext: { input: 5, cachedInput: 0.5, output: 22.5 },
  },
  'gpt-5.4-mini': { input: 0.75, cachedInput: 0.075, output: 4.5 },
  'gpt-5.4-nano': { input: 0.2, cachedInput: 0.02, output: 1.25 },
  'gpt-5.2-codex': { input: 1.75, cachedInput: 0.175, output: 14 },
  'gpt-5.2-chat-latest': { input: 1.75, cachedInput: 0.175, output: 14 },
  'gpt-5.2': { input: 1.75, cachedInput: 0.175, output: 14 },
  'gpt-5.1-codex-max': { input: 1.25, cachedInput: 0.125, output: 10 },
  'gpt-5.1-codex': { input: 1.25, cachedInput: 0.125, output: 10 },
  'gpt-5.1-chat-latest': { input: 1.25, cachedInput: 0.125, output: 10 },
  'gpt-5.1': { input: 1.25, cachedInput: 0.125, output: 10 },
  'gpt-5-codex': { input: 1.25, cachedInput: 0.125, output: 10 },
  'gpt-5-chat-latest': { input: 1.25, cachedInput: 0.125, output: 10 },
  'gpt-5-mini': { input: 0.25, cachedInput: 0.025, output: 2 },
  'gpt-5-nano': { input: 0.05, cachedInput: 0.005, output: 0.4 },
  'gpt-5': { input: 1.25, cachedInput: 0.125, output: 10 },
  'gpt-4.1-mini': { input: 0.4, cachedInput: 0.1, output: 1.6 },
  'gpt-4.1-nano': { input: 0.1, cachedInput: 0.025, output: 0.4 },
  'gpt-4.1': { input: 2, cachedInput: 0.5, output: 8 },
  'gpt-4o-mini': { input: 0.15, cachedInput: 0.075, output: 0.6 },
  'gpt-4o': { input: 2.5, cachedInput: 1.25, output: 10 },
};

const normalizeModelId = (modelId: string): string => {
  const lower = modelId.toLowerCase().trim();
  return lower
    .replace(/^(openai\/|models\/)/, '')
    .replace(/-\d{4}-\d{2}-\d{2}$/, '')
    .replace(/-\d{8}$/, '');
};

const pricingForModel = (modelId: string): IOpenAIModelPricing | null => {
  const normalized = normalizeModelId(modelId);
  if (MODEL_PRICING[normalized]) return MODEL_PRICING[normalized];

  const keys = Object.keys(MODEL_PRICING).sort((a, b) => b.length - a.length);
  const match = keys.find((key) => normalized === key || normalized.startsWith(`${key}-`));
  return match ? MODEL_PRICING[match] : null;
};

export const calculateOpenAICost = (
  modelId: string | null | undefined,
  inputTokens: number,
  cachedInputTokens: number,
  outputTokens: number,
  contextWindowSize?: number | null,
): number | null => {
  if (!modelId) return null;
  const basePricing = pricingForModel(modelId);
  if (!basePricing) return null;
  const pricing = basePricing.longContext && contextWindowSize && contextWindowSize > 200_000
    ? basePricing.longContext
    : basePricing;

  const cached = Math.max(0, cachedInputTokens);
  const nonCachedInput = Math.max(0, inputTokens - cached);
  const cachedInputPrice = pricing.cachedInput ?? pricing.input;
  const mtok = 1_000_000;

  return (
    (nonCachedInput / mtok) * pricing.input +
    (cached / mtok) * cachedInputPrice +
    (Math.max(0, outputTokens) / mtok) * pricing.output
  );
};
