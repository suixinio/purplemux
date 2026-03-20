import type { NextApiRequest, NextApiResponse } from 'next';
import { detectActiveSession } from '@/lib/session-detection';
import { getActiveWorkspaceId, getWorkspaceById } from '@/lib/workspace-store';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wsId = (req.query.workspace as string) || await getActiveWorkspaceId();
  if (!wsId) {
    return res.status(400).json({ error: 'workspace parameter required' });
  }

  const workspace = await getWorkspaceById(wsId);
  if (!workspace) {
    return res.status(404).json({ error: 'workspace not found' });
  }

  if (!workspace.directories.length) {
    return res.status(200).json({ status: 'none', sessionId: null, jsonlPath: null, pid: null, startedAt: null });
  }

  try {
    const sessionInfo = await detectActiveSession(workspace.directories[0]);
    return res.status(200).json(sessionInfo);
  } catch {
    return res.status(500).json({ error: 'session detection failed' });
  }
};

export default handler;
