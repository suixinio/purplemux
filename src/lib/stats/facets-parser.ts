import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { IFacetEntry } from '@/types/stats';

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

export const parseAllFacets = async (): Promise<IFacetEntry[]> => {
  const facets: IFacetEntry[] = [];

  try {
    const files = await fs.readdir(FACETS_DIR);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      try {
        const content = await fs.readFile(path.join(FACETS_DIR, file), 'utf-8');
        const raw = JSON.parse(content) as Record<string, unknown>;
        const sessionId = String(raw.session_id ?? file.replace('.json', ''));
        facets.push(parseSingleFacet(raw, sessionId));
      } catch {
        // skip malformed files
      }
    }
  } catch {
    // facets dir doesn't exist
  }

  return facets;
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
