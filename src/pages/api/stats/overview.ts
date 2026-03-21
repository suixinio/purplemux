import type { NextApiRequest, NextApiResponse } from 'next';
import { getStatsCache } from '@/lib/stats/pt-stats-cache';
import { buildOverview } from '@/lib/stats/stats-cache-parser';
import { parsePeriod } from '@/lib/stats/period-filter';
import { getCached, setCached } from '@/lib/stats/cache';
import type { IOverviewResponse } from '@/types/stats';

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
  const overview = buildOverview(statsCache, period);

  setCached(cacheKey, overview);
  return res.status(200).json(overview);
};

export default handler;
