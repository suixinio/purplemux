import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import { getSessionCwd } from '@/lib/tmux';

const execFile = promisify(execFileCb);

const CMD_TIMEOUT = 5000;

export const getGitBranch = async (tmuxSession: string): Promise<string | null> => {
  const cwd = await getSessionCwd(tmuxSession);
  if (!cwd) {
    throw new Error('tmux-session-not-found');
  }

  try {
    const { stdout } = await execFile(
      'git',
      ['-C', cwd, 'rev-parse', '--abbrev-ref', 'HEAD'],
      { timeout: CMD_TIMEOUT },
    );
    return stdout.trim() || null;
  } catch (err: unknown) {
    const exitCode = (err as { code?: number }).code;
    if (exitCode === 128) {
      return null;
    }
    throw err;
  }
};
