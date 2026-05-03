import fs from 'fs/promises';
import type { IAgentSessionHistoryStats } from '@/lib/providers/types';

const JSONL_EXTENDED_TAIL_SIZE = 131_072;
const FILE_HEADER_RE = /^\*\*\*\s+(?:Add|Update|Delete)\s+File:\s+(.+?)\s*$/i;

const emptyStats = (): IAgentSessionHistoryStats => ({
  toolUsage: {},
  touchedFiles: [],
  lastAssistantText: null,
  lastUserText: null,
  firstUserTs: null,
  lastAssistantTs: null,
  turnDurationMs: null,
});

const safeString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const tryParseJson = (raw: string): unknown | null => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const parseDurationMs = (raw: unknown): number | null => {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    const secs = typeof obj.secs === 'number' && Number.isFinite(obj.secs) ? obj.secs : 0;
    const nanos = typeof obj.nanos === 'number' && Number.isFinite(obj.nanos) ? obj.nanos : 0;
    return secs * 1000 + nanos / 1_000_000;
  }
  return null;
};

const addTouchedFilesFromPatch = (input: unknown, touchedFiles: Set<string>) => {
  const raw = typeof input === 'string' ? input : '';
  for (const line of raw.split('\n')) {
    const match = line.match(FILE_HEADER_RE);
    if (match) touchedFiles.add(match[1]);
  }
};

const addTouchedFileFromArgs = (argsRaw: unknown, touchedFiles: Set<string>) => {
  const parsed = typeof argsRaw === 'string' ? tryParseJson(argsRaw) : argsRaw;
  if (!parsed || typeof parsed !== 'object') return;
  const obj = parsed as Record<string, unknown>;
  const filePath = safeString(obj.file_path ?? obj.path);
  if (filePath) touchedFiles.add(filePath);
};

export const readCodexSessionHistoryStats = async (
  jsonlPath: string,
): Promise<IAgentSessionHistoryStats> => {
  const empty = emptyStats();
  try {
    const stat = await fs.stat(jsonlPath);
    if (stat.size === 0) return empty;

    const handle = await fs.open(jsonlPath, 'r');
    try {
      const readSize = Math.min(stat.size, JSONL_EXTENDED_TAIL_SIZE);
      const buffer = Buffer.alloc(readSize);
      const { bytesRead } = await handle.read(buffer, 0, readSize, stat.size - readSize);
      const lines = buffer.subarray(0, bytesRead).toString('utf-8').split('\n').filter((l) => l.trim());

      const toolUsage: Record<string, number> = {};
      const touchedFiles = new Set<string>();
      let lastAssistantText: string | null = null;
      let lastUserText: string | null = null;
      let firstUserTs: number | null = null;
      let lastAssistantTs: number | null = null;
      let turnEndTs: number | null = null;
      let turnDurationMs: number | null = null;

      for (let i = lines.length - 1; i >= 0; i--) {
        const parsed = tryParseJson(lines[i]);
        if (!parsed || typeof parsed !== 'object') continue;
        const item = parsed as { timestamp?: string; type?: string; payload?: Record<string, unknown> };
        const payload = item.payload && typeof item.payload === 'object' ? item.payload : {};
        const ts = item.timestamp ? Date.parse(item.timestamp) : NaN;
        const timestamp = Number.isFinite(ts) ? ts : null;

        if (item.type === 'event_msg') {
          const eventType = safeString(payload.type);
          if (eventType === 'user_message') {
            if (timestamp) firstUserTs = timestamp;
            if (!lastUserText) {
              const message = safeString(payload.message);
              if (message) lastUserText = message;
            }
            continue;
          }
          if (eventType === 'agent_message') {
            if (timestamp && !lastAssistantTs) lastAssistantTs = timestamp;
            if (!lastAssistantText) {
              const message = safeString(payload.message);
              if (message) lastAssistantText = message;
            }
            continue;
          }
          if (eventType === 'task_complete' || eventType === 'TurnComplete') {
            if (timestamp && !turnEndTs) turnEndTs = timestamp;
            continue;
          }
          if (eventType === 'exec_command_begin' || eventType === 'ExecCommandBegin') {
            toolUsage.Bash = (toolUsage.Bash ?? 0) + 1;
            continue;
          }
          if (eventType === 'exec_command_end' || eventType === 'ExecCommandEnd') {
            if (!turnDurationMs) turnDurationMs = parseDurationMs(payload.duration);
          }
          continue;
        }

        if (item.type !== 'response_item') continue;
        const responseType = safeString(payload.type);
        if (responseType !== 'function_call' && responseType !== 'custom_tool_call') continue;

        const name = safeString(payload.name);
        if (!name || name === 'write_stdin') continue;
        toolUsage[name] = (toolUsage[name] ?? 0) + 1;
        if (name === 'apply_patch') {
          addTouchedFilesFromPatch(payload.input, touchedFiles);
        } else if (name === 'Edit' || name === 'Write' || name === 'edit' || name === 'write') {
          addTouchedFileFromArgs(payload.arguments ?? payload.input, touchedFiles);
        }
      }

      return {
        toolUsage,
        touchedFiles: [...touchedFiles],
        lastAssistantText,
        lastUserText,
        firstUserTs,
        lastAssistantTs: lastAssistantTs ?? turnEndTs,
        turnDurationMs,
      };
    } finally {
      await handle.close();
    }
  } catch {
    return empty;
  }
};
