import type { NextApiRequest, NextApiResponse } from 'next';
import { parseHistory } from '@/lib/stats/history-parser';
import { parsePeriod } from '@/lib/stats/period-filter';
import { getCached, setCached } from '@/lib/stats/cache';
import type { IHistoryResponse } from '@/types/stats';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  const period = parsePeriod(req.query.period as string | undefined);
  const limit = Math.max(1, parseInt(req.query.limit as string, 10) || 10);
  const cacheKey = `stats:history:${period}:${limit}`;

  const cached = getCached<IHistoryResponse>(cacheKey);
  if (cached) return res.status(200).json(cached);

  const response = await parseHistory(period, limit);

  setCached(cacheKey, response);
  return res.status(200).json(response);
};

export default handler;
