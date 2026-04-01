import { useState, useCallback, useMemo } from 'react';
import type { ITimelineEntry, IInitMeta } from '@/types/timeline';
import { calculateCost } from '@/lib/format-tokens';

interface IModelTokens {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number | null;
}

export interface ISessionMetaData {
  title: string;
  createdAt: string | null;
  updatedAt: string | null;
  fileSize: number;
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
  fileSize: 0,
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
    fileSize: 0,
    userCount,
    assistantCount,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    totalCost,
    tokensByModel,
  };
};

const computeDelta = (entries: ITimelineEntry[], afterTimestamp: number) => {
  let userCount = 0;
  let assistantCount = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let updatedAt: string | null = null;
  const modelMap = new Map<string, {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
  }>();

  for (const entry of entries) {
    if (entry.timestamp <= afterTimestamp) continue;

    updatedAt = new Date(entry.timestamp).toISOString();

    if (entry.type === 'user-message') {
      userCount++;
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
    }));

  const totalCost = tokensByModel.reduce<number | null>((sum, m) => {
    if (m.cost === null) return sum;
    return (sum ?? 0) + m.cost;
  }, null);

  return { userCount, assistantCount, inputTokens, outputTokens, totalCost, tokensByModel, updatedAt };
};

const mergeTokensByModel = (base: IModelTokens[], delta: IModelTokens[]): IModelTokens[] => {
  const map = new Map<string, IModelTokens>();
  for (const m of base) map.set(m.model, { ...m });
  for (const d of delta) {
    const existing = map.get(d.model);
    if (existing) {
      existing.inputTokens += d.inputTokens;
      existing.outputTokens += d.outputTokens;
      existing.totalTokens += d.totalTokens;
      existing.cost = existing.cost !== null && d.cost !== null
        ? existing.cost + d.cost
        : existing.cost ?? d.cost;
    } else {
      map.set(d.model, { ...d });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalTokens - a.totalTokens);
};

const mergeWithInitMeta = (entries: ITimelineEntry[], initMeta: IInitMeta): ISessionMetaData => {
  let title = initMeta.customTitle ?? '(새 세션)';
  if (!initMeta.customTitle) {
    for (const entry of entries) {
      if (entry.type === 'user-message') {
        title = entry.text;
        break;
      }
    }
  }

  const delta = computeDelta(entries, initMeta.lastTimestamp);
  const mergedInput = initMeta.inputTokens + delta.inputTokens;
  const mergedOutput = initMeta.outputTokens + delta.outputTokens;
  const mergedCost = initMeta.totalCost !== null && delta.totalCost !== null
    ? initMeta.totalCost + delta.totalCost
    : initMeta.totalCost ?? delta.totalCost;

  return {
    title,
    createdAt: initMeta.createdAt,
    updatedAt: delta.updatedAt ?? initMeta.updatedAt,
    fileSize: initMeta.fileSize,
    userCount: initMeta.userCount + delta.userCount,
    assistantCount: initMeta.assistantCount + delta.assistantCount,
    inputTokens: mergedInput,
    outputTokens: mergedOutput,
    totalTokens: mergedInput + mergedOutput,
    totalCost: mergedCost,
    tokensByModel: mergeTokensByModel(initMeta.tokensByModel, delta.tokensByModel),
  };
};

const useSessionMeta = (entries: ITimelineEntry[], sessionSummary?: string, initMeta?: IInitMeta): IUseSessionMetaReturn => {
  const [isExpanded, setIsExpanded] = useState(false);

  const meta = useMemo(() => {
    const computed = initMeta
      ? mergeWithInitMeta(entries, initMeta)
      : computeMetaFromEntries(entries);
    if (sessionSummary) {
      return { ...computed, title: sessionSummary };
    }
    return computed;
  }, [entries, sessionSummary, initMeta]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return { meta, isExpanded, toggleExpanded, collapse };
};

export default useSessionMeta;
