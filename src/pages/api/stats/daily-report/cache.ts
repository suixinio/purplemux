import type { NextApiRequest, NextApiResponse } from 'next';
import { readAllCachedReports } from '@/lib/stats/daily-report-builder';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method-not-allowed' });
  }

  const days = await readAllCachedReports();
  return res.status(200).json({ days });
};

export default handler;
