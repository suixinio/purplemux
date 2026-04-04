import type { NextApiRequest, NextApiResponse } from 'next';
import { getAgentManager } from '@/lib/agent-manager';
import { createLogger } from '@/lib/logger';

const log = createLogger('api:agent-restart');

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { agentId } = req.query as { agentId: string };
  const manager = getAgentManager();
  const agent = manager.getAgent(agentId);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  try {
    const success = await manager.restartAgent(agentId);
    if (!success) {
      return res.status(500).json({ error: 'Restart failed' });
    }
    return res.status(200).json({ status: 'restarting' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    log.error(`restart agent failed: ${message}`);
    return res.status(500).json({ error: 'Failed to restart agent' });
  }
};

export default handler;
