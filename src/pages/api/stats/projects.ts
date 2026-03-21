import type { NextApiRequest, NextApiResponse } from 'next';
import { parseAllProjects } from '@/lib/stats/jsonl-parser';
import { parsePeriod } from '@/lib/stats/period-filter';
import { getCached, setCached } from '@/lib/stats/cache';
import type { IProjectsResponse } from '@/types/stats';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  const period = parsePeriod(req.query.period as string | undefined);
  const cacheKey = `stats:projects:${period}`;

  const cached = getCached<IProjectsResponse>(cacheKey);
  if (cached) return res.status(200).json(cached);

  const projects = await parseAllProjects(period);
  const response: IProjectsResponse = {
    projects,
    totalProjects: projects.length,
  };

  setCached(cacheKey, response);
  return res.status(200).json(response);
};

export default handler;
