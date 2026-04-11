// USD per million tokens
// https://docs.anthropic.com/en/docs/about-claude/pricing
interface IModelPricing {
  input: number;
  output: number;
  cacheWrite: number;
  cacheRead: number;
}

const MODEL_PRICING: Record<string, IModelPricing> = {
  'opus-4-6': { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  'opus-4-5': { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  'opus-4-1': { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  'opus-4': { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  'sonnet-4-6': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  'sonnet-4-5': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  'sonnet-4': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  'sonnet-3-7': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  'sonnet-3-5': { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  'haiku-4-5': { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
  'haiku-3-5': { input: 0.8, output: 4, cacheWrite: 1, cacheRead: 0.08 },
  'haiku-3': { input: 0.25, output: 1.25, cacheWrite: 0.3, cacheRead: 0.03 },
  'opus-3': { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
};

const OPUS_46_FAST_PRICING: IModelPricing = {
  input: 30, output: 150, cacheWrite: 37.5, cacheRead: 3,
};

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'opus-4-6': 'Opus 4.6',
  'opus-4-5': 'Opus 4.5',
  'opus-4-1': 'Opus 4.1',
  'opus-4': 'Opus 4',
  'sonnet-4-6': 'Sonnet 4.6',
  'sonnet-4-5': 'Sonnet 4.5',
  'sonnet-4': 'Sonnet 4',
  'sonnet-3-7': 'Sonnet 3.7',
  'sonnet-3-5': 'Sonnet 3.5',
  'haiku-4-5': 'Haiku 4.5',
  'haiku-3-5': 'Haiku 3.5',
  'haiku-3': 'Haiku 3',
  'opus-3': 'Opus 3',
};

// --- Model key extraction ---

const extractModelKey = (modelId: string): string | null => {
  const cleaned = modelId.replace(/\[.*?\]$/, '');
  const match = cleaned.match(/claude-(\w+-[\d]+(?:-[\d]+)*)(?:-\d{8}|-v\d)?(?:\:\d)?$/);
  return match ? match[1] : null;
};

export const normalizeModelName = (modelId: string): string => {
  const key = extractModelKey(modelId);
  return key ? `claude-${key}` : modelId;
};

export const formatModelDisplayName = (modelId: string): string => {
  const key = extractModelKey(modelId);
  if (key && MODEL_DISPLAY_NAMES[key]) return MODEL_DISPLAY_NAMES[key];
  const match = modelId.match(/claude-(\w+)/);
  return match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : modelId;
};

// --- Cost calculation ---

export const calculateCost = (
  modelId: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number,
  cacheReadTokens: number,
  isFastMode = false,
): number | null => {
  const key = extractModelKey(modelId);
  if (!key) return null;

  const pricing = (isFastMode && key === 'opus-4-6')
    ? OPUS_46_FAST_PRICING
    : MODEL_PRICING[key];
  if (!pricing) return null;

  const mtok = 1_000_000;
  return (
    (inputTokens / mtok) * pricing.input +
    (cacheCreationTokens / mtok) * pricing.cacheWrite +
    (cacheReadTokens / mtok) * pricing.cacheRead +
    (outputTokens / mtok) * pricing.output
  );
};

/**
 * Full model ID (e.g. "claude-opus-4-6") 기반 비용 계산.
 * stats-cache에서 사용하는 전체 모델 ID용.
 */
export const calculateCostByFullId = (
  fullModelId: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationTokens: number,
  cacheReadTokens: number,
): number => {
  const cost = calculateCost(fullModelId, inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens);
  if (cost !== null) return cost;

  // fallback: 모델 키 추출 실패 시 이름 기반 추정
  const lower = fullModelId.toLowerCase();
  let pricing: IModelPricing;
  if (lower.includes('opus')) pricing = MODEL_PRICING['opus-4-6']!;
  else if (lower.includes('haiku')) pricing = MODEL_PRICING['haiku-4-5']!;
  else pricing = MODEL_PRICING['sonnet-4-6']!;

  const mtok = 1_000_000;
  return (
    (inputTokens / mtok) * pricing.input +
    (cacheCreationTokens / mtok) * pricing.cacheWrite +
    (cacheReadTokens / mtok) * pricing.cacheRead +
    (outputTokens / mtok) * pricing.output
  );
};

// --- Token formatting ---

export const formatTokenCount = (count: number): string => {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
};

export const formatTokenDetail = (count: number): string => {
  return count.toLocaleString();
};

export const formatCost = (cost: number): string => {
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 1) return `$${cost.toFixed(3)}`;
  if (cost >= 1_000) return `$${cost.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  return `$${cost.toFixed(2)}`;
};
