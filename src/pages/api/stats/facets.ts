import type { NextApiRequest, NextApiResponse } from 'next';
import { parseAllFacets, aggregateFacets } from '@/lib/stats/facets-parser';
import { parsePeriod } from '@/lib/stats/period-filter';
import { getCached, setCached } from '@/lib/stats/cache';
import type { IFacetsResponse } from '@/types/stats';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  const period = parsePeriod(req.query.period as string | undefined);
  const cacheKey = `stats:facets:${period}`;

  const cached = getCached<IFacetsResponse>(cacheKey);
  if (cached) return res.status(200).json(cached);

  const facets = await parseAllFacets(period);
  const { categoryDistribution, outcomeDistribution } = aggregateFacets(facets);

  const response: IFacetsResponse = {
    facets,
    categoryDistribution,
    outcomeDistribution,
    totalFacets: facets.length,
  };

  setCached(cacheKey, response);
  return res.status(200).json(response);
};

export default handler;
