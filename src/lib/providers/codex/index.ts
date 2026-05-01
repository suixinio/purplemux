import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { getDangerouslySkipPermissions } from '@/lib/config-store';
import { createLogger } from '@/lib/logger';
import { buildCodexHookFlags } from '@/lib/providers/codex/hook-config';
import { runCodexPreflight } from '@/lib/providers/codex/preflight';
import { getCodexPromptPath, sanitizeForTomlTripleQuote, writeCodexPromptFile } from '@/lib/providers/codex/prompt';
import {
  detectActiveSession as detectCodexSession,
  isCodexRunning,
  watchSessionsDir,
} from '@/lib/providers/codex/session-detection';
import { attachCodexWorkStateObserver } from '@/lib/providers/codex/observer';
import type { IAgentPreflight, IAgentProvider } from '@/lib/providers/types';
import type { IAgentState, ITab } from '@/types/terminal';

const log = createLogger('codex-provider');

export const CODEX_PROVIDER_ID = 'codex';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidCodexSessionId = (id: unknown): id is string =>
  typeof id === 'string' && UUID_RE.test(id);

type TAgentField = 'sessionId' | 'jsonlPath' | 'summary';

const ensureAgentState = (tab: ITab): IAgentState => {
  if (tab.agentState?.providerId === CODEX_PROVIDER_ID) return tab.agentState;
  const seeded: IAgentState = {
    providerId: CODEX_PROVIDER_ID,
    sessionId: null,
    jsonlPath: null,
    summary: null,
  };
  tab.agentState = seeded;
  return seeded;
};

const readField = (tab: ITab, field: TAgentField): string | null => {
  if (tab.agentState?.providerId !== CODEX_PROVIDER_ID) return null;
  return tab.agentState[field] ?? null;
};

const writeField = (tab: ITab, field: TAgentField, value: string | null | undefined) => {
  ensureAgentState(tab)[field] = value ?? null;
};

const sessionIdFromJsonlPath = (jsonlPath: string | null | undefined): string | null => {
  if (!jsonlPath) return null;
  const filename = path.basename(jsonlPath, '.jsonl');
  const match = filename.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  return match ? match[1] : null;
};

const parsePaneTitle = (_paneTitle: string | null): string | null => null;

const checkCodexLogin = async (): Promise<boolean> => {
  try {
    await fs.access(path.join(os.homedir(), '.codex', 'auth.json'));
    return true;
  } catch {
    return false;
  }
};

const codexAgentPreflight = async (): Promise<IAgentPreflight> => {
  const status = await runCodexPreflight();
  const loggedIn = status.installed ? await checkCodexLogin() : false;
  return {
    installed: status.installed,
    version: status.version,
    binaryPath: status.binaryPath,
    loggedIn,
  };
};

const buildDeveloperInstructionsArgs = async (workspaceId: string): Promise<string[]> => {
  const promptPath = getCodexPromptPath(workspaceId);
  let content: string;
  try {
    content = await fs.readFile(promptPath, 'utf-8');
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : err, promptPath }, 'codex-prompt read failed');
    return [];
  }
  const sanitized = sanitizeForTomlTripleQuote(content);
  const tomlValue = `'''${sanitized}'''`;
  const arg = `developer_instructions=${tomlValue}`;
  return ['-c', shellSingleQuote(arg)];
};

const shellSingleQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

const composeLaunchCommand = async (workspaceId: string | undefined, resumeSessionId?: string): Promise<string> => {
  const skipPerms = await getDangerouslySkipPermissions();
  const { args: hookArgs } = await buildCodexHookFlags();
  const devInstrArgs = workspaceId ? await buildDeveloperInstructionsArgs(workspaceId) : [];

  const parts: string[] = ['codex'];
  if (resumeSessionId) parts.push('resume', resumeSessionId);
  parts.push(...hookArgs);
  parts.push(...devInstrArgs);
  if (skipPerms) parts.push('--yolo');
  return parts.join(' ');
};

export const codexProvider: IAgentProvider = {
  id: CODEX_PROVIDER_ID,
  displayName: 'Codex',
  panelType: 'codex-cli',

  matchesProcess: (commandName, args) => {
    if (commandName === 'codex') return true;
    if (commandName === 'node' && args?.some((a) => a.endsWith('codex.js'))) return true;
    return false;
  },
  isValidSessionId: isValidCodexSessionId,

  detectActiveSession: (panePid, childPids) => detectCodexSession(panePid, childPids),
  isAgentRunning: (panePid, childPids) => isCodexRunning(panePid, childPids),
  watchSessions: (panePid, onChange, options) => watchSessionsDir(panePid, onChange, options),

  buildLaunchCommand: ({ workspaceId }) =>
    composeLaunchCommand(workspaceId ?? undefined),
  buildResumeCommand: (sessionId, { workspaceId }) => {
    if (!isValidCodexSessionId(sessionId)) {
      throw new Error(`Invalid codex session ID format: ${sessionId}`);
    }
    return composeLaunchCommand(workspaceId ?? undefined, sessionId);
  },

  readSessionId: (tab) => readField(tab, 'sessionId'),
  writeSessionId: (tab, sessionId) => writeField(tab, 'sessionId', sessionId),
  readJsonlPath: (tab) => readField(tab, 'jsonlPath'),
  writeJsonlPath: (tab, jsonlPath) => writeField(tab, 'jsonlPath', jsonlPath),
  readSummary: (tab) => readField(tab, 'summary'),
  writeSummary: (tab, summary) => writeField(tab, 'summary', summary),

  parsePaneTitle,
  sessionIdFromJsonlPath,
  preflight: codexAgentPreflight,
  writeWorkspacePrompt: writeCodexPromptFile,
  attachWorkStateObserver: attachCodexWorkStateObserver,
};
