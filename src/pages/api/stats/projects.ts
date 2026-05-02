import type { NextApiRequest, NextApiResponse } from 'next';
import { parseAllProjects } from '@/lib/stats/jsonl-parser';
import { parseCodexProjects } from '@/lib/stats/jsonl-parser-codex';
import { parsePeriod } from '@/lib/stats/period-filter';
import { getCached, setCached } from '@/lib/stats/cache';
import type { IProjectStats, IProjectsResponse } from '@/types/stats';

const mergeProjects = (claude: IProjectStats[], codex: IProjectStats[]): IProjectStats[] => {
  const map = new Map<string, IProjectStats>();
  for (const project of [...claude, ...codex]) {
    const existing = map.get(project.project);
    if (existing) {
      existing.sessionCount += project.sessionCount;
      existing.messageCount += project.messageCount;
      existing.totalTokens += project.totalTokens;
    } else {
      map.set(project.project, { ...project });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalTokens - a.totalTokens);
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  const period = parsePeriod(req.query.period as string | undefined);
  const cacheKey = `stats:projects:${period}`;

  const cached = getCached<IProjectsResponse>(cacheKey);
  if (cached) return res.status(200).json(cached);

  const [claudeProjects, codexProjects] = await Promise.all([
    parseAllProjects(period),
    parseCodexProjects(period),
  ]);
  const projects = mergeProjects(claudeProjects, codexProjects);
  const response: IProjectsResponse = {
    projects,
    totalProjects: projects.length,
  };

  setCached(cacheKey, response);
  return res.status(200).json(response);
};

export default handler;
