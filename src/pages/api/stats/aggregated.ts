import type { NextApiRequest, NextApiResponse } from 'next';
import { aggregateStats } from '@/lib/stats/stats-aggregator';
import { parsePeriod } from '@/lib/stats/period-filter';
import { getCached, setCached } from '@/lib/stats/cache';
import type { IAggregatedStatsResponse } from '@/types/stats';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  const period = parsePeriod(req.query.period as string | undefined);
  const cacheKey = `stats:aggregated:${period}`;

  const cached = getCached<IAggregatedStatsResponse>(cacheKey);
  if (cached) return res.status(200).json(cached);

  const aggregated = await aggregateStats(period);
  setCached(cacheKey, aggregated);
  return res.status(200).json(aggregated satisfies IAggregatedStatsResponse);
};

export default handler;
