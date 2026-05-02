import type { NextApiRequest, NextApiResponse } from 'next';
import { parseAllSessions } from '@/lib/stats/jsonl-parser';
import { parseCodexSessions } from '@/lib/stats/jsonl-parser-codex';
import { parsePeriod } from '@/lib/stats/period-filter';
import { getCached, setCached } from '@/lib/stats/cache';
import type { IStatsCacheLongestSession, ISessionStats, ISessionsResponse } from '@/types/stats';

const getDuration = (session: ISessionStats): number =>
  new Date(session.lastActivityAt).getTime() - new Date(session.startedAt).getTime();

const getLongestSession = (sessions: ISessionStats[]): IStatsCacheLongestSession | null => {
  let longest: IStatsCacheLongestSession | null = null;
  for (const session of sessions) {
    const duration = getDuration(session);
    if (duration <= 0) continue;
    if (!longest || duration > longest.duration) {
      longest = {
        sessionId: session.sessionId,
        duration,
        messageCount: session.messageCount,
        timestamp: session.startedAt,
      };
    }
  }
  return longest;
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  const period = parsePeriod(req.query.period as string | undefined);
  const cacheKey = `stats:sessions:${period}`;

  const cached = getCached<ISessionsResponse>(cacheKey);
  if (cached) return res.status(200).json(cached);

  const [claudeSessions, codexSessions] = await Promise.all([
    parseAllSessions(period),
    parseCodexSessions(period),
  ]);
  const sessions = [...claudeSessions, ...codexSessions]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));

  const durations = sessions
    .map(getDuration)
    .filter((d) => d > 0);

  const averageDurationMs = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;

  const response: ISessionsResponse = {
    sessions,
    averageDurationMs,
    longestSession: getLongestSession(sessions),
    totalSessions: sessions.length,
  };

  setCached(cacheKey, response);
  return res.status(200).json(response);
};

export default handler;
