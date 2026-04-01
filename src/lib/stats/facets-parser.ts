import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { IFacetEntry, TPeriod } from '@/types/stats';
import { isWithinPeriod } from './period-filter';

const FACETS_DIR = path.join(os.homedir(), '.claude', 'usage-data', 'facets');

const parseSingleFacet = (raw: Record<string, unknown>, sessionId: string): IFacetEntry => ({
  sessionId,
  outcome: String(raw.outcome ?? ''),
  sessionType: String(raw.session_type ?? ''),
  goalCategories: typeof raw.goal_categories === 'object' && raw.goal_categories !== null
    ? Object.fromEntries(
        Object.entries(raw.goal_categories as Record<string, unknown>).map(([k, v]) => [k, Number(v ?? 0)]),
      )
    : {},
  satisfaction: typeof raw.user_satisfaction_counts === 'object' && raw.user_satisfaction_counts !== null
    ? Object.fromEntries(
        Object.entries(raw.user_satisfaction_counts as Record<string, unknown>).map(([k, v]) => [k, Number(v ?? 0)]),
      )
    : {},
  helpfulness: String(raw.claude_helpfulness ?? ''),
  summary: String(raw.brief_summary ?? ''),
});

const runWithConcurrency = async <T>(
  tasks: (() => Promise<T>)[],
  limit: number,
): Promise<T[]> => {
  const results: T[] = [];
  let index = 0;

  const run = async () => {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => run()));
  return results;
};

export const parseAllFacets = async (period: TPeriod): Promise<IFacetEntry[]> => {
  try {
    const files = (await fs.readdir(FACETS_DIR)).filter((f) => f.endsWith('.json'));

    const results = await runWithConcurrency(
      files.map((file) => async () => {
        try {
          const filePath = path.join(FACETS_DIR, file);
          const [content, stat] = await Promise.all([
            fs.readFile(filePath, 'utf-8'),
            fs.stat(filePath),
          ]);

          if (!isWithinPeriod(stat.mtime, period)) return null;

          const raw = JSON.parse(content) as Record<string, unknown>;
          const sessionId = String(raw.session_id ?? file.replace('.json', ''));
          return parseSingleFacet(raw, sessionId);
        } catch {
          return null;
        }
      }),
      20,
    );

    return results.filter((entry): entry is IFacetEntry => entry !== null);
  } catch {
    return [];
  }
};

export const aggregateFacets = (facets: IFacetEntry[]): {
  categoryDistribution: Record<string, number>;
  outcomeDistribution: Record<string, number>;
} => {
  const categoryDistribution: Record<string, number> = {};
  const outcomeDistribution: Record<string, number> = {};

  for (const facet of facets) {
    for (const [category, count] of Object.entries(facet.goalCategories)) {
      categoryDistribution[category] = (categoryDistribution[category] ?? 0) + count;
    }

    if (facet.outcome) {
      outcomeDistribution[facet.outcome] = (outcomeDistribution[facet.outcome] ?? 0) + 1;
    }
  }

  return { categoryDistribution, outcomeDistribution };
};
