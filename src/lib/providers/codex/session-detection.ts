import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import type { ISessionInfo } from '@/types/timeline';
import type { IAgentSessionWatchOptions, ISessionWatcher } from '@/lib/providers/types';
import { codexHookEvents } from '@/lib/providers/codex/hook-events';
import { runCodexPreflight } from '@/lib/providers/codex/preflight';
import {
  getChildPids,
  getProcessArgs,
  getProcessCwd,
  isProcessRunning,
} from '@/lib/process-utils';

const CODEX_DIR = path.join(os.homedir(), '.codex');
const SESSIONS_ROOT = path.join(CODEX_DIR, 'sessions');
const PID_POLL_INTERVAL = 10_000;
const SESSION_SCAN_DAYS = 30;

const NOT_RUNNING: ISessionInfo = {
  status: 'not-running',
  sessionId: null,
  jsonlPath: null,
  pid: null,
  startedAt: null,
  cwd: null,
};

const matchesCodexArgs = (args: string): boolean => args.includes('codex');

interface ICodexSessionMeta {
  sessionId: string;
  jsonlPath: string;
  cwd: string | null;
  startedAt: number | null;
}

interface IFindLatestCodexSessionOptions {
  sessionsRoot?: string;
  daysBack?: number;
  now?: Date;
}

const dayDirPath = (sessionsRoot: string, date: Date): string =>
  path.join(
    sessionsRoot,
    String(date.getFullYear()),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  );

const readFirstLine = async (jsonlPath: string): Promise<string | null> => {
  const stream = createReadStream(jsonlPath, { encoding: 'utf-8' });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      return line;
    }
    return null;
  } finally {
    rl.close();
    stream.destroy();
  }
};

const readCodexSessionMeta = async (jsonlPath: string): Promise<ICodexSessionMeta | null> => {
  const firstLine = await readFirstLine(jsonlPath);
  if (!firstLine) return null;

  try {
    const parsed = JSON.parse(firstLine) as {
      type?: string;
      timestamp?: string;
      payload?: {
        id?: string;
        cwd?: string;
        timestamp?: string;
      };
    };
    if (parsed.type !== 'session_meta' || !parsed.payload?.id) return null;

    const startedRaw = parsed.payload.timestamp ?? parsed.timestamp;
    const startedAt = startedRaw ? new Date(startedRaw).getTime() : null;
    return {
      sessionId: parsed.payload.id,
      jsonlPath,
      cwd: parsed.payload.cwd ?? null,
      startedAt: startedAt !== null && Number.isFinite(startedAt) ? startedAt : null,
    };
  } catch {
    return null;
  }
};

export const findLatestCodexSessionForCwd = async (
  cwd: string,
  {
    sessionsRoot = SESSIONS_ROOT,
    daysBack = SESSION_SCAN_DAYS,
    now = new Date(),
  }: IFindLatestCodexSessionOptions = {},
): Promise<ICodexSessionMeta | null> => {
  const candidates: { jsonlPath: string; mtimeMs: number }[] = [];

  for (let i = 0; i < daysBack; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const dir = dayDirPath(sessionsRoot, date);

    let names: string[];
    try {
      names = await fs.readdir(dir);
    } catch {
      continue;
    }

    await Promise.all(names.filter((name) => name.endsWith('.jsonl')).map(async (name) => {
      const jsonlPath = path.join(dir, name);
      try {
        const stat = await fs.stat(jsonlPath);
        candidates.push({ jsonlPath, mtimeMs: stat.mtimeMs });
      } catch {
        // Ignore files that disappeared while scanning.
      }
    }));
  }

  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const candidate of candidates) {
    const meta = await readCodexSessionMeta(candidate.jsonlPath);
    if (meta?.cwd === cwd) return meta;
  }

  return null;
};

export const findCodexSessionById = async (
  sessionId: string,
  {
    sessionsRoot = SESSIONS_ROOT,
    daysBack = SESSION_SCAN_DAYS,
    now = new Date(),
  }: IFindLatestCodexSessionOptions = {},
): Promise<ICodexSessionMeta | null> => {
  for (let i = 0; i < daysBack; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const dir = dayDirPath(sessionsRoot, date);

    let names: string[];
    try {
      names = await fs.readdir(dir);
    } catch {
      continue;
    }

    const matchingNames = names.filter((name) => name.endsWith('.jsonl') && name.includes(sessionId));
    for (const name of matchingNames) {
      const meta = await readCodexSessionMeta(path.join(dir, name));
      if (meta?.sessionId === sessionId) return meta;
    }
  }

  return null;
};

const collectDescendants = async (
  panePid: number,
  preloaded?: number[],
): Promise<number[]> => {
  const direct = preloaded ?? await getChildPids(panePid);
  if (direct.length === 0) return [];
  const grand = (await Promise.all(direct.map(getChildPids))).flat();
  return [...direct, ...grand];
};

const findCodexProcess = async (
  pids: number[],
): Promise<{ pid: number; cwd: string | null } | null> => {
  for (const pid of pids) {
    const args = await getProcessArgs(pid);
    if (!args || !matchesCodexArgs(args)) continue;
    const cwd = await getProcessCwd(pid);
    return { pid, cwd };
  }
  return null;
};

export const isCodexRunning = async (
  panePid: number,
  preloadedChildPids?: number[],
): Promise<boolean> => {
  const all = await collectDescendants(panePid, preloadedChildPids);
  for (const pid of all) {
    const args = await getProcessArgs(pid);
    if (args && matchesCodexArgs(args)) return true;
  }
  return false;
};

export const detectActiveSession = async (
  panePid: number,
  preloadedChildPids?: number[],
): Promise<ISessionInfo> => {
  try {
    await fs.access(CODEX_DIR);
  } catch {
    const { installed } = await runCodexPreflight();
    const status = installed ? 'not-initialized' : 'not-installed';
    return { status, sessionId: null, jsonlPath: null, pid: null, startedAt: null, cwd: null };
  }

  const all = await collectDescendants(panePid, preloadedChildPids);
  if (all.length === 0) return NOT_RUNNING;

  const found = await findCodexProcess(all);
  if (!found) return NOT_RUNNING;

  return {
    status: 'running',
    sessionId: null,
    jsonlPath: null,
    pid: found.pid,
    startedAt: null,
    cwd: found.cwd,
  };
};

export const watchSessionsDir = (
  panePid: number,
  onChange: (info: ISessionInfo) => void,
  options?: IAgentSessionWatchOptions,
): ISessionWatcher => {
  let stopped = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let currentPid: number | null = null;
  const watchedSession = options?.tmuxSession;

  const handleSessionInfo = (tmuxSession: string, info: ISessionInfo) => {
    if (stopped || !watchedSession || tmuxSession !== watchedSession) return;
    if (info.pid) currentPid = info.pid;
    onChange(info);
  };

  if (watchedSession) {
    codexHookEvents.on('session-info', handleSessionInfo);
  }

  const poll = async () => {
    if (stopped) return;
    if (!currentPid) {
      const info = await detectActiveSession(panePid);
      if (info.pid) currentPid = info.pid;
      return;
    }
    const alive = await isProcessRunning(currentPid);
    if (!alive && !stopped) {
      currentPid = null;
      const info = await detectActiveSession(panePid);
      onChange(info);
    }
  };

  pollTimer = setInterval(poll, PID_POLL_INTERVAL);

  if (!options?.skipInitial) {
    detectActiveSession(panePid).then((info) => {
      if (stopped) return;
      if (info.pid) currentPid = info.pid;
      onChange(info);
    });
  }

  return {
    stop: () => {
      stopped = true;
      if (pollTimer) clearInterval(pollTimer);
      if (watchedSession) {
        codexHookEvents.off('session-info', handleSessionInfo);
      }
    },
  };
};
