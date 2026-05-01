import { parseAllSessions } from './jsonl-parser';
import { parseCodexJsonl, type ICodexExtras, type ICodexProviderStats } from './jsonl-parser-codex';
import type { ISessionStats, TPeriod } from '@/types/stats';

export type TAggregatedProvider = 'claude' | 'codex';

export interface IAggregatedDailyEntry {
  date: string;
  claudeTokens: number;
  codexTokens: number;
  claudeSessions: number;
  codexSessions: number;
}

export interface IAggregatedTotals {
  claude: { tokens: number; sessions: number };
  codex: { tokens: number; sessions: number };
}

export interface IAggregatedError {
  provider: TAggregatedProvider;
  message: string;
}

export interface IAggregatedStats {
  period: TPeriod;
  daily: IAggregatedDailyEntry[];
  totals: IAggregatedTotals;
  codexExtras: ICodexExtras | null;
  errors: IAggregatedError[];
  computedAt: string;
}

const formatDate = (raw: string | number): string => {
  const ms = typeof raw === 'number' ? raw : Date.parse(raw);
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const claudeDaily = (sessions: ISessionStats[]): { dailyMap: Map<string, { tokens: number; sessions: number }>; totalTokens: number } => {
  const dailyMap = new Map<string, { tokens: number; sessions: number }>();
  let totalTokens = 0;
  for (const s of sessions) {
    const date = formatDate(s.startedAt);
    if (!date) continue;
    const day = dailyMap.get(date) ?? { tokens: 0, sessions: 0 };
    day.tokens += s.totalTokens;
    day.sessions += 1;
    dailyMap.set(date, day);
    totalTokens += s.totalTokens;
  }
  return { dailyMap, totalTokens };
};

const mergeStats = (
  claude: { sessions: ISessionStats[] } | null,
  codex: ICodexProviderStats | null,
  period: TPeriod,
  errors: IAggregatedError[],
): IAggregatedStats => {
  const claudeAgg = claude
    ? claudeDaily(claude.sessions)
    : { dailyMap: new Map<string, { tokens: number; sessions: number }>(), totalTokens: 0 };

  const codexDailyMap = new Map<string, { tokens: number; sessions: number }>();
  if (codex) {
    for (const d of codex.daily) codexDailyMap.set(d.date, { tokens: d.tokens, sessions: d.sessions });
  }

  const allDates = new Set<string>([...claudeAgg.dailyMap.keys(), ...codexDailyMap.keys()]);
  const daily: IAggregatedDailyEntry[] = Array.from(allDates)
    .sort()
    .map((date) => {
      const c = claudeAgg.dailyMap.get(date) ?? { tokens: 0, sessions: 0 };
      const x = codexDailyMap.get(date) ?? { tokens: 0, sessions: 0 };
      return {
        date,
        claudeTokens: c.tokens,
        codexTokens: x.tokens,
        claudeSessions: c.sessions,
        codexSessions: x.sessions,
      };
    });

  return {
    period,
    daily,
    totals: {
      claude: {
        tokens: claudeAgg.totalTokens,
        sessions: claude?.sessions.length ?? 0,
      },
      codex: codex?.totals ?? { tokens: 0, sessions: 0 },
    },
    codexExtras: codex?.extras ?? null,
    errors,
    computedAt: new Date().toISOString(),
  };
};

export const aggregateStats = async (period: TPeriod): Promise<IAggregatedStats> => {
  const [claudeResult, codexResult] = await Promise.allSettled([
    parseAllSessions(period),
    parseCodexJsonl(period),
  ]);

  const errors: IAggregatedError[] = [];
  const claude = claudeResult.status === 'fulfilled'
    ? { sessions: claudeResult.value }
    : null;
  if (claudeResult.status === 'rejected') {
    errors.push({ provider: 'claude', message: claudeResult.reason instanceof Error ? claudeResult.reason.message : String(claudeResult.reason) });
  }

  const codex = codexResult.status === 'fulfilled' ? codexResult.value : null;
  if (codexResult.status === 'rejected') {
    errors.push({ provider: 'codex', message: codexResult.reason instanceof Error ? codexResult.reason.message : String(codexResult.reason) });
  }

  return mergeStats(claude, codex, period, errors);
};
