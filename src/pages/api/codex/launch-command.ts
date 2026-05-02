import type { NextApiRequest, NextApiResponse } from 'next';
import { codexProvider } from '@/lib/providers/codex';
import { getActiveWorkspaceId } from '@/lib/workspace-store';
import { createLogger } from '@/lib/logger';

const log = createLogger('codex-launch-command');

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as { workspaceId?: unknown; resumeSessionId?: unknown } | undefined;
  const bodyWorkspaceId = typeof body?.workspaceId === 'string' && body.workspaceId.trim()
    ? body.workspaceId.trim()
    : null;
  const resumeSessionId = typeof body?.resumeSessionId === 'string' && body.resumeSessionId.trim()
    ? body.resumeSessionId.trim()
    : null;
  const workspaceId = bodyWorkspaceId ?? await getActiveWorkspaceId();

  try {
    const command = resumeSessionId
      ? await codexProvider.buildResumeCommand(resumeSessionId, { workspaceId: workspaceId ?? undefined })
      : await codexProvider.buildLaunchCommand({ workspaceId: workspaceId ?? undefined });
    return res.status(200).json({ command });
  } catch (err) {
    log.error(`codex launch command build failed: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: 'Failed to build Codex launch command' });
  }
};

export default handler;
