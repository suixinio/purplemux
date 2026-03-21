import { useState, useCallback, useMemo } from 'react';
import type { ITimelineEntry } from '@/types/timeline';
import { calculateCost } from '@/lib/format-tokens';

interface IModelTokens {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number | null;
}

interface ISessionMetaData {
  title: string;
  createdAt: string | null;
  updatedAt: string | null;
  userCount: number;
  assistantCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCost: number | null;
  tokensByModel: IModelTokens[];
}

interface IUseSessionMetaReturn {
  meta: ISessionMetaData;
  isExpanded: boolean;
  toggleExpanded: () => void;
  collapse: () => void;
}

const EMPTY_META: ISessionMetaData = {
  title: '(새 세션)',
  createdAt: null,
  updatedAt: null,
  userCount: 0,
  assistantCount: 0,
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  totalCost: null,
  tokensByModel: [],
};

const computeMetaFromEntries = (entries: ITimelineEntry[]): ISessionMetaData => {
  if (entries.length === 0) return EMPTY_META;

  let title = '(새 세션)';
  let createdAt: string | null = null;
  let updatedAt: string | null = null;
  let userCount = 0;
  let assistantCount = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  const modelMap = new Map<string, {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
  }>();

  for (const entry of entries) {
    if (!createdAt && entry.timestamp) {
      createdAt = new Date(entry.timestamp).toISOString();
    }
    updatedAt = new Date(entry.timestamp).toISOString();

    if (entry.type === 'user-message') {
      userCount++;
      if (title === '(새 세션)') {
        title = entry.text;
      }
    } else if (entry.type === 'assistant-message') {
      assistantCount++;
      if (entry.usage) {
        const cacheCreation = entry.usage.cache_creation_input_tokens ?? 0;
        const cacheRead = entry.usage.cache_read_input_tokens ?? 0;
        inputTokens += entry.usage.input_tokens + cacheCreation + cacheRead;
        outputTokens += entry.usage.output_tokens;

        const model = entry.model ?? 'unknown';
        const existing = modelMap.get(model) ?? {
          inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0,
        };
        existing.inputTokens += entry.usage.input_tokens;
        existing.outputTokens += entry.usage.output_tokens;
        existing.cacheCreationTokens += cacheCreation;
        existing.cacheReadTokens += cacheRead;
        modelMap.set(model, existing);
      }
    }
  }

  const tokensByModel: IModelTokens[] = Array.from(modelMap.entries())
    .map(([model, tokens]) => ({
      model,
      inputTokens: tokens.inputTokens + tokens.cacheCreationTokens + tokens.cacheReadTokens,
      outputTokens: tokens.outputTokens,
      totalTokens: tokens.inputTokens + tokens.cacheCreationTokens + tokens.cacheReadTokens + tokens.outputTokens,
      cost: calculateCost(model, tokens.inputTokens, tokens.outputTokens, tokens.cacheCreationTokens, tokens.cacheReadTokens),
    }))
    .sort((a, b) => b.totalTokens - a.totalTokens);

  const totalCost = tokensByModel.reduce<number | null>((sum, m) => {
    if (m.cost === null) return sum;
    return (sum ?? 0) + m.cost;
  }, null);

  return {
    title,
    createdAt,
    updatedAt,
    userCount,
    assistantCount,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    totalCost,
    tokensByModel,
  };
};

const useSessionMeta = (entries: ITimelineEntry[], sessionSummary?: string): IUseSessionMetaReturn => {
  const [isExpanded, setIsExpanded] = useState(false);

  const meta = useMemo(() => {
    const computed = computeMetaFromEntries(entries);
    if (sessionSummary) {
      return { ...computed, title: sessionSummary };
    }
    return computed;
  }, [entries, sessionSummary]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return { meta, isExpanded, toggleExpanded, collapse };
};

export default useSessionMeta;
