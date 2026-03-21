import { useState, useCallback, useMemo } from 'react';
import type { ITimelineEntry } from '@/types/timeline';

interface ISessionMetaData {
  title: string;
  createdAt: string | null;
  updatedAt: string | null;
  userCount: number;
  assistantCount: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
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
        inputTokens += entry.usage.input_tokens;
        outputTokens += entry.usage.output_tokens;
      }
    }
  }

  return {
    title,
    createdAt,
    updatedAt,
    userCount,
    assistantCount,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
  };
};

const useSessionMeta = (entries: ITimelineEntry[]): IUseSessionMetaReturn => {
  const [isExpanded, setIsExpanded] = useState(false);

  const meta = useMemo(() => computeMetaFromEntries(entries), [entries]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const collapse = useCallback(() => {
    setIsExpanded(false);
  }, []);

  return { meta, isExpanded, toggleExpanded, collapse };
};

export default useSessionMeta;
