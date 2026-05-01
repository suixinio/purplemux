import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyCliToken } from '@/lib/cli-token';
import { getStatusManager } from '@/lib/status-manager';
import { createLogger } from '@/lib/logger';
import { isRequestAllowed } from '@/lib/access-filter';
import { handleCodexHookEvent } from '@/lib/providers/codex/hook-handler';

const log = createLogger('hooks');

const handleClaudeHook = (req: NextApiRequest, res: NextApiResponse) => {
  const { event, session, notificationType } = req.body ?? {};
  if (typeof event === 'string' && event !== 'poll' && typeof session === 'string' && session) {
    const type = typeof notificationType === 'string' && notificationType ? notificationType : undefined;
    log.debug({ event, session, notificationType: type }, `received ${event}${type ? `(${type})` : ''}`);
    getStatusManager().updateTabFromHook(session, event, type);
  } else {
    log.debug({ body: req.body }, 'poll trigger');
    getStatusManager().poll().catch((err) => {
      log.error({ err }, 'Poll trigger failed');
    });
  }
  return res.status(204).end();
};

const handleCodexHook = (req: NextApiRequest, res: NextApiResponse) => {
  const tmuxSession = req.query.tmuxSession;
  if (typeof tmuxSession !== 'string' || !tmuxSession) {
    return res.status(400).json({ error: 'missing tmuxSession' });
  }
  const payload = req.body ?? {};
  log.debug(
    { tmuxSession, event: payload.hook_event_name, source: payload.source },
    `codex ${payload.hook_event_name ?? 'unknown'}`,
  );
  try {
    handleCodexHookEvent(tmuxSession, payload);
  } catch (err) {
    log.error({ err }, 'codex hook handling failed');
    return res.status(500).json({ error: 'internal' });
  }
  return res.status(204).end();
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  if (!verifyCliToken(req)) {
    return res.status(403).json({ error: 'forbidden' });
  }
  if (!isRequestAllowed(req.socket.remoteAddress)) {
    return res.status(403).json({ error: 'forbidden' });
  }

  const provider = typeof req.query.provider === 'string' ? req.query.provider : 'claude';
  if (provider === 'codex') return handleCodexHook(req, res);
  return handleClaudeHook(req, res);
};

export default handler;
