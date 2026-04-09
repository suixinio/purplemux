import type { NextApiRequest, NextApiResponse } from 'next';
import { markVisible, markHidden } from '@/lib/push-subscriptions';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { endpoint, visible } = req.body ?? {};
  if (!endpoint || typeof visible !== 'boolean') {
    return res.status(400).json({ error: 'Invalid body' });
  }

  if (visible) {
    markVisible(endpoint);
  } else {
    markHidden(endpoint);
  }

  return res.status(200).json({ ok: true });
};

export default handler;
