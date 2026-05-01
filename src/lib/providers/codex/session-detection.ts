import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { ISessionInfo } from '@/types/timeline';
import type { ISessionWatcher } from '@/lib/providers/types';
import { runCodexPreflight } from '@/lib/providers/codex/preflight';
import {
  getChildPids,
  getProcessArgs,
  getProcessCwd,
  isProcessRunning,
} from '@/lib/process-utils';

const CODEX_DIR = path.join(os.homedir(), '.codex');
const PID_POLL_INTERVAL = 10_000;

const NOT_RUNNING: ISessionInfo = {
  status: 'not-running',
  sessionId: null,
  jsonlPath: null,
  pid: null,
  startedAt: null,
  cwd: null,
};

const matchesCodexArgs = (args: string): boolean => args.includes('codex');

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
  options?: { skipInitial?: boolean },
): ISessionWatcher => {
  let stopped = false;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let currentPid: number | null = null;

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
    },
  };
};
