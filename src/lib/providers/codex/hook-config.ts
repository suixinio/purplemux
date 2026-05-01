import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { parse as parseToml } from 'smol-toml';
import { CODEX_HOOK_SCRIPT_PATH } from '@/lib/hook-settings';
import { enqueueSystemToast } from '@/lib/sync-server';
import { createLogger } from '@/lib/logger';

const log = createLogger('codex');

const TOAST_KEY_CONFIG_PARSE = 'codexConfigParseFailed';
const g = globalThis as unknown as { __ptCodexConfigToastShown?: boolean };

const USER_CONFIG_PATH = path.join(os.homedir(), '.codex', 'config.toml');

const CODEX_HOOK_EVENTS = ['SessionStart', 'UserPromptSubmit', 'Stop', 'PermissionRequest'] as const;
export type TCodexHookEvent = typeof CODEX_HOOK_EVENTS[number];

interface ICodexHookCommand {
  type: 'command';
  command: string;
  timeout?: number;
}

interface ICodexHookEntry {
  matcher?: string;
  hooks: ICodexHookCommand[];
}

const isHookCommand = (v: unknown): v is ICodexHookCommand => {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return obj.type === 'command' && typeof obj.command === 'string';
};

const isHookEntry = (v: unknown): v is ICodexHookEntry => {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  if (!Array.isArray(obj.hooks)) return false;
  if (obj.matcher !== undefined && typeof obj.matcher !== 'string') return false;
  return obj.hooks.every(isHookCommand);
};

const ourEntry = (): ICodexHookEntry => ({
  matcher: '.*',
  hooks: [{ type: 'command', command: CODEX_HOOK_SCRIPT_PATH }],
});

interface IUserHookEntries {
  byEvent: Map<TCodexHookEvent, ICodexHookEntry[]>;
  parseError: boolean;
}

let cache: { mtimeMs: number; entries: IUserHookEntries } | null = null;

const readUserHookEntries = async (): Promise<IUserHookEntries> => {
  let stat: { mtimeMs: number };
  try {
    stat = await fs.stat(USER_CONFIG_PATH);
  } catch {
    cache = null;
    return { byEvent: new Map(), parseError: false };
  }

  if (cache && cache.mtimeMs === stat.mtimeMs) return cache.entries;

  const raw = await fs.readFile(USER_CONFIG_PATH, 'utf-8');
  const byEvent = new Map<TCodexHookEvent, ICodexHookEntry[]>();
  let parseError = false;

  try {
    const parsed = parseToml(raw) as Record<string, unknown>;
    const hooksSection = parsed.hooks as Record<string, unknown> | undefined;
    if (hooksSection && typeof hooksSection === 'object') {
      for (const event of CODEX_HOOK_EVENTS) {
        const list = hooksSection[event];
        if (!Array.isArray(list)) continue;
        const valid = list.filter(isHookEntry);
        if (valid.length > 0) byEvent.set(event, valid);
      }
    }
  } catch (err) {
    parseError = true;
    log.warn(
      { err: err instanceof Error ? err.message : err, path: USER_CONFIG_PATH },
      'codex config.toml parse failed — applying purplemux hook only',
    );
  }

  const result: IUserHookEntries = { byEvent, parseError };
  cache = { mtimeMs: stat.mtimeMs, entries: result };
  return result;
};

const tomlInline = (value: unknown): string => {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '0';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return `[${value.map(tomlInline).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return `{${entries.map(([k, v]) => `${k}=${tomlInline(v)}`).join(',')}}`;
  }
  return '""';
};

const serializeEntries = (entries: ICodexHookEntry[]): string => tomlInline(entries);

const shellSingleQuote = (value: string): string => `'${value.replace(/'/g, `'\\''`)}'`;

export interface ICodexHookFlagsResult {
  args: string[];
  parseError: boolean;
  userEntryCount: number;
}

export const buildCodexHookFlags = async (): Promise<ICodexHookFlagsResult> => {
  const user = await readUserHookEntries();
  const args: string[] = [];
  let userEntryCount = 0;

  for (const event of CODEX_HOOK_EVENTS) {
    const userEntries = user.byEvent.get(event) ?? [];
    userEntryCount += userEntries.length;
    const merged: ICodexHookEntry[] = [ourEntry(), ...userEntries];
    const serialized = serializeEntries(merged);
    args.push('-c', `hooks.${event}=${shellSingleQuote(serialized)}`);
  }

  log.info(`codex hooks merged: ${userEntryCount} user entries`);

  if (user.parseError && !g.__ptCodexConfigToastShown) {
    g.__ptCodexConfigToastShown = true;
    enqueueSystemToast({
      type: 'system-toast',
      key: TOAST_KEY_CONFIG_PARSE,
      variant: 'info',
      message: 'config.toml 파싱 실패, purplemux hook만 적용됨',
      durationMs: 6000,
      action: {
        kind: 'copy',
        label: 'config.toml 열기',
        text: USER_CONFIG_PATH,
        successMessage: 'config.toml 경로가 복사되었습니다',
      },
    });
  }

  return { args, parseError: user.parseError, userEntryCount };
};

export const buildCodexHookFlagsString = async (): Promise<string> => {
  const { args } = await buildCodexHookFlags();
  return args.join(' ');
};

export const __resetCodexHookConfigCache = (): void => {
  cache = null;
};
