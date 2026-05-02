import type { NextApiRequest, NextApiResponse } from 'next';
import dayjs from 'dayjs';
import { getStatsCache } from '@/lib/stats/stats-cache';
import { buildOverview } from '@/lib/stats/stats-cache-parser';
import { parseCodexHistory, parseCodexJsonl, parseCodexSessions } from '@/lib/stats/jsonl-parser-codex';
import { parsePeriod } from '@/lib/stats/period-filter';
import { getCached, setCached } from '@/lib/stats/cache';
import type { IOverviewResponse, IStatsCacheDailyActivity, TPeriod } from '@/types/stats';

type TOverviewModelTokens = IOverviewResponse['modelTokens'][string];
type TOverviewDailyTokens = IOverviewResponse['dailyTokens'][number];

const mergeDailyActivity = (
  base: IStatsCacheDailyActivity[],
  additions: IStatsCacheDailyActivity[],
): IStatsCacheDailyActivity[] => {
  const map = new Map<string, IStatsCacheDailyActivity>();
  for (const day of base) {
    map.set(day.date, {
      ...day,
      claudeMessageCount: day.claudeMessageCount ?? day.messageCount,
      codexMessageCount: day.codexMessageCount ?? 0,
      claudeSessionCount: day.claudeSessionCount ?? day.sessionCount,
      codexSessionCount: day.codexSessionCount ?? 0,
    });
  }
  for (const day of additions) {
    const existing = map.get(day.date);
    if (existing) {
      existing.messageCount += day.messageCount;
      existing.sessionCount += day.sessionCount;
      existing.toolCallCount += day.toolCallCount;
      existing.claudeMessageCount = existing.claudeMessageCount ?? 0;
      existing.codexMessageCount = (existing.codexMessageCount ?? 0) + (day.codexMessageCount ?? day.messageCount);
      existing.claudeSessionCount = existing.claudeSessionCount ?? 0;
      existing.codexSessionCount = (existing.codexSessionCount ?? 0) + (day.codexSessionCount ?? day.sessionCount);
    } else {
      map.set(day.date, {
        ...day,
        claudeMessageCount: day.claudeMessageCount ?? 0,
        codexMessageCount: day.codexMessageCount ?? day.messageCount,
        claudeSessionCount: day.claudeSessionCount ?? 0,
        codexSessionCount: day.codexSessionCount ?? day.sessionCount,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
};

const getCodexDailyActivity = (
  sessions: Awaited<ReturnType<typeof parseCodexSessions>>,
  history: Awaited<ReturnType<typeof parseCodexHistory>>,
): IStatsCacheDailyActivity[] => {
  const map = new Map<string, IStatsCacheDailyActivity>();
  for (const session of sessions) {
    const date = session.startedAt.slice(0, 10);
    const day = map.get(date) ?? {
      date,
      messageCount: 0,
      sessionCount: 0,
      toolCallCount: 0,
      claudeMessageCount: 0,
      codexMessageCount: 0,
      claudeSessionCount: 0,
      codexSessionCount: 0,
    };
    day.sessionCount++;
    day.codexSessionCount = (day.codexSessionCount ?? 0) + 1;
    map.set(date, day);
  }
  for (const entry of history) {
    const date = dayjs(entry.timestamp).format('YYYY-MM-DD');
    const day = map.get(date) ?? {
      date,
      messageCount: 0,
      sessionCount: 0,
      toolCallCount: 0,
      claudeMessageCount: 0,
      codexMessageCount: 0,
      claudeSessionCount: 0,
      codexSessionCount: 0,
    };
    day.messageCount++;
    day.codexMessageCount = (day.codexMessageCount ?? 0) + 1;
    map.set(date, day);
  }
  return Array.from(map.values());
};

const mergeCounts = (base: Record<string, number>, additions: Record<string, number>): Record<string, number> => {
  const result = { ...base };
  for (const [key, value] of Object.entries(additions)) {
    result[key] = (result[key] ?? 0) + value;
  }
  return result;
};

const mergeDailyTokens = (
  base: IOverviewResponse['dailyTokens'],
  additions: IOverviewResponse['dailyTokens'],
): IOverviewResponse['dailyTokens'] => {
  const map = new Map<string, TOverviewDailyTokens>();
  for (const day of base) map.set(day.date, { ...day });
  for (const day of additions) {
    const existing = map.get(day.date);
    if (existing) {
      existing.input += day.input;
      existing.output += day.output;
      existing.cacheRead += day.cacheRead;
      existing.cacheCreation += day.cacheCreation;
    } else {
      map.set(day.date, { ...day });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
};

const mergeModelTokens = (
  base: IOverviewResponse['modelTokens'],
  additions: IOverviewResponse['modelTokens'],
): IOverviewResponse['modelTokens'] => ({ ...base, ...additions });

const getCodexTokenBreakdown = (
  sessions: Awaited<ReturnType<typeof parseCodexJsonl>>['sessions'],
): {
  modelTokens: IOverviewResponse['modelTokens'];
  dailyTokens: IOverviewResponse['dailyTokens'];
} => {
  const modelTokens: IOverviewResponse['modelTokens'] = {};
  const dailyMap = new Map<string, TOverviewDailyTokens>();

  for (const session of sessions) {
    const model = session.model ?? null;
    const key = `codex:${model ?? 'unknown'}`;
    const input = Math.max(0, session.inputTokens - session.cachedInputTokens);
    const output = session.outputTokens;
    const cachedInput = session.cachedInputTokens;

    if (!modelTokens[key]) {
      modelTokens[key] = {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheCreation: 0,
        cacheCreation5m: 0,
        cacheCreation1h: 0,
        cost: 0,
        provider: 'codex',
        model,
        cachedInput: 0,
      };
    }
    const modelEntry = modelTokens[key] as TOverviewModelTokens;
    modelEntry.input += input;
    modelEntry.output += output;
    modelEntry.cacheRead += cachedInput;
    modelEntry.cost += session.cost ?? 0;
    modelEntry.cachedInput = (modelEntry.cachedInput ?? 0) + cachedInput;

    const date = dayjs(session.startedAt).format('YYYY-MM-DD');
    const day = dailyMap.get(date) ?? { date, input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
    day.input += input;
    day.output += output;
    day.cacheRead += cachedInput;
    dailyMap.set(date, day);
  }

  return {
    modelTokens,
    dailyTokens: Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
  };
};

const getCodexHourCounts = (history: Awaited<ReturnType<typeof parseCodexHistory>>) => {
  const hourCounts: Record<string, number> = {};
  const dayHourCounts: Record<string, number> = {};
  for (const entry of history) {
    const d = dayjs(entry.timestamp);
    const hour = String(d.hour());
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
    const dayHourKey = `${d.day()}-${hour}`;
    dayHourCounts[dayHourKey] = (dayHourCounts[dayHourKey] ?? 0) + 1;
  }
  return { hourCounts, dayHourCounts };
};

const getPreviousPeriodRange = (period: TPeriod): { start: dayjs.Dayjs; end: dayjs.Dayjs } | null => {
  if (period === 'all' || period === 'today') return null;
  const days = period === '7d' ? 7 : 30;
  return {
    start: dayjs().subtract(days * 2, 'day').startOf('day'),
    end: dayjs().subtract(days, 'day').startOf('day'),
  };
};

const isInPreviousPeriod = (timestamp: string | number, period: TPeriod): boolean => {
  const range = getPreviousPeriodRange(period);
  if (!range) return false;
  const d = dayjs(timestamp);
  return (d.isAfter(range.start) || d.isSame(range.start)) && d.isBefore(range.end);
};

const mergeCodexOverview = async (
  overview: IOverviewResponse,
  period: TPeriod,
): Promise<IOverviewResponse> => {
  const needsPrevious = period === '7d' || period === '30d';
  const [codexSessions, codexHistory, codexStats, codexAllStats, codexAllSessions, codexAllHistory] = await Promise.all([
    parseCodexSessions(period),
    parseCodexHistory(period),
    parseCodexJsonl(period),
    needsPrevious ? parseCodexJsonl('all') : Promise.resolve(null),
    needsPrevious ? parseCodexSessions('all') : Promise.resolve(null),
    needsPrevious ? parseCodexHistory('all') : Promise.resolve(null),
  ]);

  const codexDailyActivity = getCodexDailyActivity(codexSessions, codexHistory);
  const codexTokenBreakdown = getCodexTokenBreakdown(codexStats.sessions);
  const { hourCounts, dayHourCounts } = getCodexHourCounts(codexHistory);
  const codexCost = codexStats.sessions.reduce((sum, session) => sum + (session.cost ?? 0), 0);
  const today = dayjs().format('YYYY-MM-DD');
  const monthStart = dayjs().startOf('month');
  const codexTodayCost = codexAllStats?.sessions
    .filter((session) => dayjs(session.startedAt).format('YYYY-MM-DD') === today)
    .reduce((sum, session) => sum + (session.cost ?? 0), 0)
    ?? codexStats.sessions
      .filter((session) => dayjs(session.startedAt).format('YYYY-MM-DD') === today)
      .reduce((sum, session) => sum + (session.cost ?? 0), 0);
  const codexThisMonthCost = (codexAllStats ?? codexStats).sessions
    .filter((session) => dayjs(session.startedAt).isAfter(monthStart) || dayjs(session.startedAt).isSame(monthStart))
    .reduce((sum, session) => sum + (session.cost ?? 0), 0);
  const codexTodayMessages = codexHistory.filter((entry) => dayjs(entry.timestamp).format('YYYY-MM-DD') === today).length;
  const codexThisMonthMessages = (codexAllHistory ?? codexHistory)
    .filter((entry) => dayjs(entry.timestamp).isAfter(monthStart) || dayjs(entry.timestamp).isSame(monthStart))
    .length;
  const codexFirstSessionDate = codexSessions
    .map((session) => session.startedAt.slice(0, 10))
    .sort()[0] ?? '';
  const firstSessionDate = [overview.firstSessionDate, codexFirstSessionDate]
    .filter(Boolean)
    .sort()[0] ?? '';

  const previousSessions = codexAllSessions?.filter((session) => isInPreviousPeriod(session.startedAt, period)).length ?? 0;
  const previousMessages = codexAllHistory?.filter((entry) => isInPreviousPeriod(entry.timestamp, period)).length ?? 0;
  const previousCost = codexAllStats?.sessions
    .filter((session) => isInPreviousPeriod(session.startedAt, period))
    .reduce((sum, session) => sum + (session.cost ?? 0), 0)
    ?? 0;

  return {
    ...overview,
    totalSessions: overview.totalSessions + codexSessions.length,
    totalMessages: overview.totalMessages + codexHistory.length,
    previousSessions: overview.previousSessions + previousSessions,
    previousMessages: overview.previousMessages + previousMessages,
    dailyActivity: mergeDailyActivity(overview.dailyActivity, codexDailyActivity),
    modelTokens: mergeModelTokens(overview.modelTokens, codexTokenBreakdown.modelTokens),
    dailyTokens: mergeDailyTokens(overview.dailyTokens, codexTokenBreakdown.dailyTokens),
    hourlyDistribution: mergeCounts(overview.hourlyDistribution, hourCounts),
    dayHourDistribution: mergeCounts(overview.dayHourDistribution, dayHourCounts),
    todayMessages: overview.todayMessages + codexTodayMessages,
    thisMonthMessages: overview.thisMonthMessages + codexThisMonthMessages,
    totalCost: overview.totalCost + codexCost,
    todayCost: overview.todayCost + codexTodayCost,
    thisMonthCost: overview.thisMonthCost + codexThisMonthCost,
    previousCost: overview.previousCost + previousCost,
    firstSessionDate,
  };
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  const period = parsePeriod(req.query.period as string | undefined);
  const cacheKey = `stats:overview:${period}`;

  const cached = getCached<IOverviewResponse>(cacheKey);
  if (cached) return res.status(200).json(cached);

  const statsCache = await getStatsCache();
  const overview = await mergeCodexOverview(buildOverview(statsCache, period), period);

  setCached(cacheKey, overview);
  return res.status(200).json(overview);
};

export default handler;
