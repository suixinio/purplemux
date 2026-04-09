import type { NextApiRequest, NextApiResponse } from 'next';
import { getVAPIDKeys } from '@/lib/vapid-keys';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const keys = await getVAPIDKeys();
  return res.status(200).json({ publicKey: keys.publicKey });
};

export default handler;
