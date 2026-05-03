import type { NextApiRequest, NextApiResponse } from 'next';
import { generateDailyReport } from '@/lib/stats/daily-report-builder';
import type { TNoteSummaryProvider } from '@/lib/config-store';

const isValidProvider = (value: unknown): value is TNoteSummaryProvider =>
  value === 'claude' || value === 'codex';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  const { date, force, locale, provider } = req.body as {
    date?: string;
    force?: boolean;
    locale?: string;
    provider?: unknown;
  };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'invalid-date', message: 'date must be YYYY-MM-DD' });
  }
  if (provider !== undefined && !isValidProvider(provider)) {
    return res.status(400).json({ error: 'invalid-provider', message: 'provider must be claude or codex' });
  }

  const resolvedLocale = typeof locale === 'string' && locale.trim() ? locale : 'en';

  try {
    const report = await generateDailyReport(date, !!force, resolvedLocale, provider);
    return res.status(200).json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return res.status(500).json({ error: 'generation-failed', message });
  }
};

export default handler;
