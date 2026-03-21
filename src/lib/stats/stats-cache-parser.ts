import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type {
  IStatsCache,
  IStatsCacheDailyActivity,
  IStatsCacheDailyTokens,
  IStatsCacheModelUsage,
  IStatsCacheLongestSession,
  IOverviewResponse,
  TPeriod,
} from '@/types/stats';
import { isDateStringWithinPeriod } from './period-filter';

const STATS_CACHE_PATH = path.join(os.homedir(), '.claude', 'stats-cache.json');

const EMPTY_CACHE: IStatsCache = {
  version: 0,
  lastComputedDate: '',
  dailyActivity: [],
  dailyModelTokens: [],
  modelUsage: {},
  totalSessions: 0,
  totalMessages: 0,
  longestSession: { sessionId: '', duration: 0, messageCount: 0, timestamp: '' },
  firstSessionDate: '',
  hourCounts: {},
  totalSpeculationTimeSavedMs: 0,
};

const safeParseDailyActivity = (raw: unknown): IStatsCacheDailyActivity[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      date: String(item.date ?? ''),
      messageCount: Number(item.messageCount ?? 0),
      sessionCount: Number(item.sessionCount ?? 0),
      toolCallCount: Number(item.toolCallCount ?? 0),
    }));
};

const safeParseDailyTokens = (raw: unknown): IStatsCacheDailyTokens[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => ({
      date: String(item.date ?? ''),
      tokensByModel: typeof item.tokensByModel === 'object' && item.tokensByModel !== null
        ? Object.fromEntries(
            Object.entries(item.tokensByModel as Record<string, unknown>).map(([k, v]) => [k, Number(v ?? 0)]),
          )
        : {},
    }));
};

const safeParseModelUsage = (raw: unknown): Record<string, IStatsCacheModelUsage> => {
  if (typeof raw !== 'object' || raw === null) return {};
  const result: Record<string, IStatsCacheModelUsage> = {};
  for (const [model, usage] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof usage !== 'object' || usage === null) continue;
    const u = usage as Record<string, unknown>;
    result[model] = {
      inputTokens: Number(u.inputTokens ?? 0),
      outputTokens: Number(u.outputTokens ?? 0),
      cacheReadInputTokens: Number(u.cacheReadInputTokens ?? 0),
      cacheCreationInputTokens: Number(u.cacheCreationInputTokens ?? 0),
      webSearchRequests: Number(u.webSearchRequests ?? 0),
      costUSD: Number(u.costUSD ?? 0),
      contextWindow: Number(u.contextWindow ?? 0),
      maxOutputTokens: Number(u.maxOutputTokens ?? 0),
    };
  }
  return result;
};

const safeParseLongestSession = (raw: unknown): IStatsCacheLongestSession => {
  if (typeof raw !== 'object' || raw === null) {
    return { sessionId: '', duration: 0, messageCount: 0, timestamp: '' };
  }
  const r = raw as Record<string, unknown>;
  return {
    sessionId: String(r.sessionId ?? ''),
    duration: Number(r.duration ?? 0),
    messageCount: Number(r.messageCount ?? 0),
    timestamp: String(r.timestamp ?? ''),
  };
};

const safeParseHourCounts = (raw: unknown): Record<string, number> => {
  if (typeof raw !== 'object' || raw === null) return {};
  return Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).map(([k, v]) => [k, Number(v ?? 0)]),
  );
};

export const readStatsCache = async (): Promise<IStatsCache> => {
  try {
    const content = await fs.readFile(STATS_CACHE_PATH, 'utf-8');
    const raw = JSON.parse(content) as Record<string, unknown>;
    return {
      version: Number(raw.version ?? 0),
      lastComputedDate: String(raw.lastComputedDate ?? ''),
      dailyActivity: safeParseDailyActivity(raw.dailyActivity),
      dailyModelTokens: safeParseDailyTokens(raw.dailyModelTokens),
      modelUsage: safeParseModelUsage(raw.modelUsage),
      totalSessions: Number(raw.totalSessions ?? 0),
      totalMessages: Number(raw.totalMessages ?? 0),
      longestSession: safeParseLongestSession(raw.longestSession),
      firstSessionDate: String(raw.firstSessionDate ?? ''),
      hourCounts: safeParseHourCounts(raw.hourCounts),
      totalSpeculationTimeSavedMs: Number(raw.totalSpeculationTimeSavedMs ?? 0),
    };
  } catch {
    return EMPTY_CACHE;
  }
};

export const buildOverview = (cache: IStatsCache, period: TPeriod): IOverviewResponse => {
  const filteredDaily = cache.dailyActivity.filter((d) => isDateStringWithinPeriod(d.date, period));
  const filteredTokens = cache.dailyModelTokens.filter((d) => isDateStringWithinPeriod(d.date, period));

  const totalSessions = period === 'all'
    ? cache.totalSessions
    : filteredDaily.reduce((sum, d) => sum + d.sessionCount, 0);

  const totalMessages = period === 'all'
    ? cache.totalMessages
    : filteredDaily.reduce((sum, d) => sum + d.messageCount, 0);

  const modelTokens: Record<string, { input: number; output: number; cost: number }> = {};
  if (period === 'all') {
    for (const [model, usage] of Object.entries(cache.modelUsage)) {
      modelTokens[model] = {
        input: usage.inputTokens + usage.cacheReadInputTokens + usage.cacheCreationInputTokens,
        output: usage.outputTokens,
        cost: usage.costUSD,
      };
    }
  } else {
    for (const day of filteredTokens) {
      for (const [model, tokens] of Object.entries(day.tokensByModel)) {
        if (!modelTokens[model]) modelTokens[model] = { input: 0, output: 0, cost: 0 };
        modelTokens[model].input += tokens;
      }
    }
  }

  return {
    totalSessions,
    totalMessages,
    dailyActivity: filteredDaily,
    modelTokens,
    hourlyDistribution: cache.hourCounts,
    firstSessionDate: cache.firstSessionDate,
    lastComputedDate: cache.lastComputedDate,
  };
};
