import type { NextApiRequest, NextApiResponse } from 'next';
import { detectActiveSession } from '@/lib/session-detection';
import { getSessionPanePid } from '@/lib/tmux';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionName = req.query.session as string | undefined;
  if (!sessionName) {
    return res.status(400).json({ error: 'session parameter required' });
  }

  const panePid = await getSessionPanePid(sessionName);
  if (!panePid) {
    return res.status(200).json({ status: 'none', sessionId: null, jsonlPath: null, pid: null, startedAt: null });
  }

  try {
    const sessionInfo = await detectActiveSession(panePid);
    return res.status(200).json(sessionInfo);
  } catch {
    return res.status(500).json({ error: 'session detection failed' });
  }
};

export default handler;
