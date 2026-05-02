import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionPanePid, hasSession } from '@/lib/tmux';
import { getChildPids } from '@/lib/process-utils';
import { listProviders } from '@/lib/providers';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = req.query.session as string | undefined;
  if (!session) {
    return res.status(400).json({ error: 'session parameter required' });
  }

  const checkedAt = Date.now();

  const exists = await hasSession(session);
  if (!exists) {
    return res.status(200).json({ running: false, checkedAt, sessionId: null });
  }

  const panePid = await getSessionPanePid(session);
  if (!panePid) {
    return res.status(200).json({ running: false, checkedAt, sessionId: null });
  }

  const childPids = await getChildPids(panePid);
  for (const provider of listProviders()) {
    if (!await provider.isAgentRunning(panePid, childPids)) continue;

    const info = await provider.detectActiveSession(panePid, childPids);
    return res.status(200).json({
      running: true,
      checkedAt,
      sessionId: info.sessionId,
      resumable: !!info.jsonlPath,
      providerId: provider.id,
      providerDisplayName: provider.displayName,
      providerPanelType: provider.panelType,
    });
  }

  return res.status(200).json({ running: false, checkedAt, sessionId: null });
};

export default handler;
