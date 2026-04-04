import type { NextApiRequest, NextApiResponse } from 'next';
import { getAgentManager } from '@/lib/agent-manager';
import { verifyAgentToken } from '@/lib/agent-token';
import { createLogger } from '@/lib/logger';

const log = createLogger('api:agent-rpc-tab-result');

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyAgentToken(req)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const agentId = req.query.agentId as string;
  const tabId = req.query.tabId as string;

  try {
    const result = await getAgentManager().getTabResult(agentId, tabId);
    return res.status(200).json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';

    if (msg === 'Agent not found' || msg === 'Tab not found') {
      return res.status(404).json({ error: msg });
    }
    if (msg === 'No result available') {
      return res.status(404).json({ error: msg });
    }
    if (msg === 'Tab is still working') {
      return res.status(409).json({ error: msg });
    }

    log.error(`get tab result failed: ${msg}`);
    return res.status(500).json({ error: 'Failed to get tab result' });
  }
};

export default handler;
