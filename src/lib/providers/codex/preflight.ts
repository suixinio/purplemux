import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import { getShellPath } from '@/lib/preflight';
import { createLogger } from '@/lib/logger';
import { parseSemanticVersion } from '@/lib/process-utils';
import type { ICodexStatus } from '@/types/preflight';

const execFile = promisify(execFileCb);
const CMD_TIMEOUT = 5000;
const TTL_MS = 60_000;

const log = createLogger('codex-preflight');

const g = globalThis as unknown as {
  __ptCodexPreflight?: { result: ICodexStatus; checkedAt: number };
};

const probe = async (): Promise<ICodexStatus> => {
  const resolvedPath = await getShellPath();
  const env = { ...process.env, PATH: resolvedPath };
  let installed = false;
  let version: string | null = null;
  let binaryPath: string | null = null;

  try {
    const { stdout } = await execFile('codex', ['--version'], { timeout: CMD_TIMEOUT, env });
    installed = true;
    version = parseSemanticVersion(stdout);
  } catch (err) {
    log.debug({ err: err instanceof Error ? err.message : err }, 'codex --version failed');
    return { installed: false, version: null, binaryPath: null };
  }

  try {
    const { stdout } = await execFile('which', ['codex'], { timeout: CMD_TIMEOUT, env });
    binaryPath = stdout.trim() || null;
  } catch {
    binaryPath = null;
  }

  return { installed, version, binaryPath };
};

export const runCodexPreflight = async (force = false): Promise<ICodexStatus> => {
  if (!force && g.__ptCodexPreflight && Date.now() - g.__ptCodexPreflight.checkedAt < TTL_MS) {
    return g.__ptCodexPreflight.result;
  }
  const result = await probe();
  g.__ptCodexPreflight = { result, checkedAt: Date.now() };
  return result;
};

export const invalidateCodexPreflight = (): void => {
  g.__ptCodexPreflight = undefined;
};
