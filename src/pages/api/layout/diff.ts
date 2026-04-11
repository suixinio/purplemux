import type { NextApiRequest, NextApiResponse } from 'next';
import { execFile as execFileCb } from 'child_process';
import { createHash } from 'crypto';
import { promisify } from 'util';
import { getSessionCwd, hasSession } from '@/lib/tmux';
import { createLogger } from '@/lib/logger';

const execFile = promisify(execFileCb);
const log = createLogger('diff');
const CMD_TIMEOUT = 10000;

const computeDiffHash = async (cwd: string) => {
  const [{ stdout: headOut }, { stdout: statusOut }, { stdout: shortstatOut }] = await Promise.all([
    execFile('git', ['rev-parse', 'HEAD'], { cwd, timeout: CMD_TIMEOUT }),
    execFile('git', ['status', '--porcelain'], { cwd, timeout: CMD_TIMEOUT }),
    execFile('git', ['diff', 'HEAD', '--shortstat'], { cwd, timeout: CMD_TIMEOUT }),
  ]);
  return createHash('sha1')
    .update(`${headOut.trim()}\n${statusOut}\n${shortstatOut}`)
    .digest('hex')
    .slice(0, 16);
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = req.query.session as string | undefined;
  const hashOnly = req.query.hashOnly === 'true';

  if (!session) {
    return res.status(400).json({ error: 'session parameter required' });
  }

  const exists = await hasSession(session);
  if (!exists) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const cwd = await getSessionCwd(session);
  if (!cwd) {
    return res.status(500).json({ error: 'Failed to get CWD' });
  }

  try {
    await execFile('git', ['rev-parse', '--is-inside-work-tree'], { cwd, timeout: CMD_TIMEOUT });
  } catch {
    return res.status(200).json({ isGitRepo: false, diff: '', hash: '' });
  }

  try {
    if (hashOnly) {
      const hash = await computeDiffHash(cwd);
      return res.status(200).json({ isGitRepo: true, hash });
    }

    const [{ stdout: diff }, { stdout: statusOut }, hash] = await Promise.all([
      execFile('git', ['diff', 'HEAD'], { cwd, timeout: CMD_TIMEOUT, maxBuffer: 5 * 1024 * 1024 }),
      execFile('git', ['status', '--porcelain'], { cwd, timeout: CMD_TIMEOUT }),
      computeDiffHash(cwd),
    ]);

    const untrackedFiles = statusOut
      .split('\n')
      .filter((line) => line.startsWith('??'))
      .map((line) => line.slice(3).trim());

    let fullDiff = diff;
    for (const file of untrackedFiles) {
      try {
        const { stdout: fileDiff } = await execFile('git', ['diff', '--no-index', '/dev/null', file], { cwd, timeout: CMD_TIMEOUT });
        fullDiff += fileDiff;
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'stdout' in err) {
          fullDiff += (err as { stdout: string }).stdout;
        }
      }
    }

    return res.status(200).json({ isGitRepo: true, diff: fullDiff, hash });
  } catch (err) {
    log.error(`git diff failed: ${err instanceof Error ? err.message : err}`);
    return res.status(500).json({ error: 'Failed to get diff' });
  }
};

export default handler;
