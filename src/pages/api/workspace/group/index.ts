import type { NextApiRequest, NextApiResponse } from 'next';
import { createGroup } from '@/lib/workspace-store';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name } = req.body ?? {};
  const groupName = typeof name === 'string' ? name : '';
  const group = await createGroup(groupName);
  return res.status(200).json(group);
};

export default handler;
