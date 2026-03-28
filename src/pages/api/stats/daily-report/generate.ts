import type { NextApiRequest, NextApiResponse } from 'next';
import { generateDailyReport } from '@/lib/stats/daily-report-builder';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  const { date } = req.body as { date?: string };
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'invalid-date', message: 'date must be YYYY-MM-DD' });
  }

  try {
    const report = await generateDailyReport(date);
    return res.status(200).json(report);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return res.status(500).json({ error: 'generation-failed', message });
  }
};

export default handler;
