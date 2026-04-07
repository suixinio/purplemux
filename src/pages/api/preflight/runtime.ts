import type { NextApiRequest, NextApiResponse } from 'next';
import { getCachedRuntimePreflight, invalidateRuntimeCache } from '@/lib/preflight';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    const status = await getCachedRuntimePreflight();
    return res.status(200).json(status);
  }

  if (req.method === 'POST') {
    invalidateRuntimeCache();
    const status = await getCachedRuntimePreflight();
    return res.status(200).json(status);
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Method not allowed' });
};

export default handler;
