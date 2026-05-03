import fs from 'fs/promises';
import type { IAgentSessionHistoryStats } from '@/lib/providers/types';

const JSONL_EXTENDED_TAIL_SIZE = 131_072;

const emptyStats = (): IAgentSessionHistoryStats => ({
  toolUsage: {},
  touchedFiles: [],
  lastAssistantText: null,
  lastUserText: null,
  firstUserTs: null,
  lastAssistantTs: null,
  turnDurationMs: null,
});

export const readClaudeSessionHistoryStats = async (
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
      let lastAssistantTs: number | null = null;
      let firstUserTs: number | null = null;
      let turnDurationMs: number | null = null;

      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const entry = JSON.parse(lines[i]);
          if (entry.type === 'file-history-snapshot') break;
          if (entry.isSidechain) continue;

          if (entry.type === 'system' && entry.subtype === 'turn_duration' && typeof entry.durationMs === 'number' && !turnDurationMs) {
            turnDurationMs = entry.durationMs;
          }

          const ts = entry.timestamp ? new Date(entry.timestamp).getTime() : null;

          if (entry.type === 'user') {
            if (ts) firstUserTs = ts;
            if (!lastUserText && Array.isArray(entry.message?.content)) {
              for (const block of entry.message.content) {
                if (block.type === 'text' && block.text) {
                  lastUserText = block.text;
                  break;
                }
              }
            }
          }

          if (entry.type === 'assistant') {
            if (ts && !lastAssistantTs) lastAssistantTs = ts;
            if (Array.isArray(entry.message?.content)) {
              let msgLastText: string | null = null;
              for (const block of entry.message.content) {
                if (block.type === 'tool_use' && block.name) {
                  toolUsage[block.name] = (toolUsage[block.name] ?? 0) + 1;
                  if ((block.name === 'Edit' || block.name === 'Write') && block.input?.file_path) {
                    touchedFiles.add(String(block.input.file_path));
                  }
                }
                if (block.type === 'text' && block.text) {
                  msgLastText = block.text;
                }
              }
              if (!lastAssistantText && msgLastText) {
                lastAssistantText = msgLastText;
              }
            }
          }
        } catch { continue; }
      }

      return { toolUsage, touchedFiles: [...touchedFiles], lastAssistantText, lastUserText, firstUserTs, lastAssistantTs, turnDurationMs };
    } finally {
      await handle.close();
    }
  } catch {
    return empty;
  }
};
