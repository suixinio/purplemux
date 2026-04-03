import type { NextApiRequest, NextApiResponse } from 'next';
import { listSessions } from '@/lib/tmux';

const handler = async (_req: NextApiRequest, res: NextApiResponse) => {
  const sessions = await listSessions();
  res.status(200).json({ count: sessions.length });
};

export default handler;
