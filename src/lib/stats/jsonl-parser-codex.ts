import fs from 'fs/promises';
import { createReadStream, type Stats } from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import { createLogger } from '@/lib/logger';
import { isWithinPeriod } from './period-filter';
import { calculateOpenAICost } from '@/lib/openai-tokens';
import type { TPeriod } from '@/types/stats';
import type { ISessionStats as ITimelineSessionStats } from '@/types/timeline';

const log = createLogger('codex-stats-parser');

const SESSIONS_ROOT = path.join(os.homedir(), '.codex', 'sessions');
const DEFAULT_DAYS_BACK = 30;
const TAIL_BYTES = 1024 * 1024;
const CACHE_TTL_MS = 30_000;

export interface ICodexRateLimitsBucket {
  usedPercent: number;
  windowMinutes?: number;
  resetsInSeconds?: number;
}

export interface ICodexRateLimits {
  primary?: ICodexRateLimitsBucket;
  secondary?: ICodexRateLimitsBucket;
}

export interface ICodexExtras {
  rateLimits: ICodexRateLimits | null;
  modelContextWindow: number | null;
  cachedInputTokens: number | null;
  reasoningOutputTokens: number | null;
  capturedAt: number;
}

export interface ICodexSessionStats {
  sessionId: string;
  jsonlPath: string;
  startedAt: number;
  cwd: string | null;
  model: string | null;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
  currentContextTokens: number;
  contextWindowSize: number;
  usedPercentage: number | null;
  cost: number | null;
  extras: ICodexExtras | null;
}

interface ICacheEntry {
  stats: ICodexSessionStats | null;
  mtimeMs: number;
  cachedAt: number;
}

const g = globalThis as unknown as { __ptCodexStatsCache?: Map<string, ICacheEntry> };
if (!g.__ptCodexStatsCache) g.__ptCodexStatsCache = new Map();
const cache = g.__ptCodexStatsCache;

const dayDirPath = (date: Date): string =>
  path.join(
    SESSIONS_ROOT,
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  );

interface ICodexTokenUsage {
  total_tokens?: number;
  input_tokens?: number;
  cached_input_tokens?: number;
  output_tokens?: number;
  reasoning_output_tokens?: number;
}

interface ITokenCountInfo {
  total_token_usage?: {
    total_tokens?: number;
    input_tokens?: number;
    cached_input_tokens?: number;
    output_tokens?: number;
    reasoning_output_tokens?: number;
  };
  last_token_usage?: ICodexTokenUsage;
  model_context_window?: number;
}

interface ITokenCountRateLimits {
  primary?: { used_percent?: number; window_minutes?: number; resets_at?: number; resets_in_seconds?: number };
  secondary?: { used_percent?: number; window_minutes?: number; resets_at?: number; resets_in_seconds?: number };
}

interface ITokenCountRecord {
  info: ITokenCountInfo;
  rateLimits: ITokenCountRateLimits | null;
}

const num = (raw: unknown): number | null =>
  typeof raw === 'number' && Number.isFinite(raw) ? raw : null;

const readSessionMetaLine = async (jsonlPath: string): Promise<{ sessionId: string | null; startedAt: number; cwd: string | null }> => {
  const stream = createReadStream(jsonlPath, { encoding: 'utf-8', start: 0 });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let result = { sessionId: null as string | null, startedAt: 0, cwd: null as string | null };
  try {
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed) as { type?: string; payload?: { id?: string; timestamp?: string; cwd?: string }; timestamp?: string };
        if (parsed.type !== 'session_meta' || !parsed.payload) break;
        result = {
          sessionId: parsed.payload.id ?? null,
          startedAt: parsed.payload.timestamp ? Date.parse(parsed.payload.timestamp) : (parsed.timestamp ? Date.parse(parsed.timestamp) : 0),
          cwd: parsed.payload.cwd ?? null,
        };
      } catch {}
      break;
    }
  } finally {
    rl.close();
    stream.destroy();
  }
  return result;
};

const readTailLines = async (jsonlPath: string, sizeBytes: number, fileSize: number): Promise<string[]> => {
  const start = Math.max(0, fileSize - sizeBytes);
  const stream = createReadStream(jsonlPath, { encoding: 'utf-8', start });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  const lines: string[] = [];
  try {
    for await (const line of rl) lines.push(line);
  } finally {
    rl.close();
    stream.destroy();
  }
  if (start > 0 && lines.length > 0) lines.shift();
  return lines;
};

const extractTailInfo = (lines: string[]): { tokenCount: ITokenCountRecord | null; model: string | null } => {
  let tokenCount: ITokenCountRecord | null = null;
  let model: string | null = null;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line) continue;
    try {
      const parsed = JSON.parse(line) as {
        type?: string;
        payload?: {
          type?: string;
          model?: string;
          info?: ITokenCountInfo;
          rate_limits?: ITokenCountRateLimits;
        };
      };
      const payload = parsed.payload;
      if (!payload) continue;
      if (!model && parsed.type === 'turn_context' && typeof payload.model === 'string') {
        model = payload.model;
      }
      if (!tokenCount && parsed.type === 'event_msg' && payload.type === 'token_count' && payload.info) {
        tokenCount = {
          info: payload.info,
          rateLimits: payload.rate_limits ?? null,
        };
      }
      if (tokenCount && model) break;
    } catch {}
  }
  return { tokenCount, model };
};

const resetSeconds = (window: { resets_at?: number; resets_in_seconds?: number } | undefined, capturedAt: number): number | undefined => {
  if (!window) return undefined;
  if (typeof window.resets_in_seconds === 'number') return window.resets_in_seconds;
  if (typeof window.resets_at === 'number') {
    return Math.max(0, Math.round(window.resets_at - capturedAt / 1000));
  }
  return undefined;
};

const buildExtras = (record: ITokenCountRecord, capturedAt: number): ICodexExtras => {
  const { info, rateLimits: rl } = record;
  const rateLimits: ICodexRateLimits | null = rl
    ? {
        primary: rl.primary && typeof rl.primary.used_percent === 'number'
          ? {
              usedPercent: rl.primary.used_percent,
              windowMinutes: rl.primary.window_minutes,
              resetsInSeconds: resetSeconds(rl.primary, capturedAt),
            }
          : undefined,
        secondary: rl.secondary && typeof rl.secondary.used_percent === 'number'
          ? {
              usedPercent: rl.secondary.used_percent,
              windowMinutes: rl.secondary.window_minutes,
              resetsInSeconds: resetSeconds(rl.secondary, capturedAt),
            }
          : undefined,
      }
    : null;

  return {
    rateLimits,
    modelContextWindow: num(info.model_context_window),
    cachedInputTokens: num(info.total_token_usage?.cached_input_tokens),
    reasoningOutputTokens: num(info.total_token_usage?.reasoning_output_tokens),
    capturedAt,
  };
};

const parseCodexJsonlFile = async (jsonlPath: string, stat: Stats): Promise<ICodexSessionStats | null> => {
  const meta = await readSessionMetaLine(jsonlPath);
  if (!meta.sessionId || !meta.startedAt) return null;

  const tailLines = await readTailLines(jsonlPath, TAIL_BYTES, stat.size);
  const { tokenCount, model } = extractTailInfo(tailLines);
  const info = tokenCount?.info;
  const usage = info?.total_token_usage ?? info?.last_token_usage;

  const inputTokens = usage?.input_tokens ?? 0;
  const cachedInputTokens = usage?.cached_input_tokens ?? 0;
  const outputTokens = usage?.output_tokens ?? 0;
  const reasoningOutputTokens = usage?.reasoning_output_tokens ?? 0;
  const totalTokens = info?.total_token_usage?.total_tokens
    ?? info?.last_token_usage?.total_tokens
    ?? 0;
  const currentContextTokens = info?.last_token_usage?.total_tokens ?? totalTokens;
  const contextWindowSize = info?.model_context_window ?? 0;
  const usedPercentage = contextWindowSize > 0
    ? Math.round((currentContextTokens / contextWindowSize) * 100)
    : null;
  const extras = tokenCount ? buildExtras(tokenCount, stat.mtimeMs) : null;
  const cost = calculateOpenAICost(model, inputTokens, cachedInputTokens, outputTokens, contextWindowSize);

  return {
    sessionId: meta.sessionId,
    jsonlPath,
    startedAt: meta.startedAt,
    cwd: meta.cwd,
    model,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    reasoningOutputTokens,
    totalTokens,
    currentContextTokens,
    contextWindowSize,
    usedPercentage,
    cost,
    extras,
  };
};

const getCachedSessionStats = async (jsonlPath: string): Promise<ICodexSessionStats | null> => {
  let stat: Stats;
  try {
    stat = await fs.stat(jsonlPath);
  } catch {
    return null;
  }

  const cached = cache.get(jsonlPath);
  if (cached && cached.mtimeMs === stat.mtimeMs && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.stats;
  }

  try {
    const stats = await parseCodexJsonlFile(jsonlPath, stat);
    cache.set(jsonlPath, { stats, mtimeMs: stat.mtimeMs, cachedAt: Date.now() });
    return stats;
  } catch (err) {
    log.warn({ err: err instanceof Error ? err.message : err, jsonlPath }, 'codex jsonl parse failed');
    cache.set(jsonlPath, { stats: null, mtimeMs: stat.mtimeMs, cachedAt: Date.now() });
    return null;
  }
};

export const readCodexTimelineSessionStats = async (jsonlPath: string): Promise<ITimelineSessionStats | null> => {
  const stats = await getCachedSessionStats(jsonlPath);
  if (!stats) return null;

  return {
    sessionId: stats.sessionId,
    transcriptPath: stats.jsonlPath,
    inputTokens: stats.inputTokens,
    cachedInputTokens: stats.cachedInputTokens,
    outputTokens: stats.outputTokens,
    reasoningOutputTokens: stats.reasoningOutputTokens,
    cost: stats.cost,
    currentContextTokens: stats.currentContextTokens,
    contextWindowSize: stats.contextWindowSize,
    usedPercentage: stats.usedPercentage,
    model: stats.model,
    exceeds200k: stats.currentContextTokens > 200_000,
    receivedAt: Date.now(),
  };
};

const collectCodexJsonlPaths = async (daysBack: number): Promise<string[]> => {
  const today = new Date();
  const dayPaths: string[] = [];
  for (let i = 0; i < daysBack; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dayPaths.push(dayDirPath(d));
  }

  const allPaths: string[] = [];
  for (const dir of dayPaths) {
    let names: string[];
    try {
      names = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.endsWith('.jsonl')) continue;
      allPaths.push(path.join(dir, name));
    }
  }
  return allPaths;
};

export interface ICodexProviderStats {
  daily: { date: string; tokens: number; sessions: number }[];
  totals: { tokens: number; sessions: number };
  extras: ICodexExtras | null;
  sessions: ICodexSessionStats[];
}

const formatDate = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const parseCodexJsonl = async (period: TPeriod): Promise<ICodexProviderStats> => {
  const daysBack = period === '7d' ? 7 : period === 'today' ? 1 : DEFAULT_DAYS_BACK;
  const jsonlPaths = await collectCodexJsonlPaths(daysBack);
  if (jsonlPaths.length === 0) {
    return { daily: [], totals: { tokens: 0, sessions: 0 }, extras: null, sessions: [] };
  }

  const results = await Promise.all(jsonlPaths.map(getCachedSessionStats));
  const sessions: ICodexSessionStats[] = [];
  for (const r of results) {
    if (!r) continue;
    if (!isWithinPeriod(r.startedAt, period)) continue;
    sessions.push(r);
  }

  const dailyMap = new Map<string, { tokens: number; sessions: number }>();
  let totalTokens = 0;
  for (const s of sessions) {
    const dateKey = formatDate(s.startedAt);
    const day = dailyMap.get(dateKey) ?? { tokens: 0, sessions: 0 };
    day.tokens += s.totalTokens;
    day.sessions += 1;
    dailyMap.set(dateKey, day);
    totalTokens += s.totalTokens;
  }

  const daily = Array.from(dailyMap.entries())
    .map(([date, v]) => ({ date, tokens: v.tokens, sessions: v.sessions }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const latest = sessions
    .filter((s) => s.extras !== null)
    .sort((a, b) => (b.extras!.capturedAt) - (a.extras!.capturedAt))[0];

  return {
    daily,
    totals: { tokens: totalTokens, sessions: sessions.length },
    extras: latest?.extras ?? null,
    sessions,
  };
};

export const clearCodexStatsCache = (): void => cache.clear();
