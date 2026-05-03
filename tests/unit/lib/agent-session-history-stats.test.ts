import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { readClaudeSessionHistoryStats } from '@/lib/providers/claude/session-history-stats';
import { readCodexSessionHistoryStats } from '@/lib/providers/codex/session-history-stats';

const writeJsonl = async (lines: unknown[]): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'purplemux-history-stats-'));
  const filePath = path.join(dir, 'session.jsonl');
  await fs.writeFile(filePath, lines.map((line) => JSON.stringify(line)).join('\n') + '\n', 'utf-8');
  return filePath;
};

describe('agent session history stats', () => {
  it('preserves Claude history stats parsing', async () => {
    const jsonlPath = await writeJsonl([
      {
        timestamp: '2026-05-02T07:37:01.000Z',
        type: 'user',
        message: { content: [{ type: 'text', text: 'Please edit a file' }] },
      },
      {
        timestamp: '2026-05-02T07:37:02.000Z',
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', name: 'Edit', input: { file_path: '/workspace/app.ts', old_string: 'a', new_string: 'b' } },
            { type: 'text', text: 'Updated the file.' },
          ],
        },
      },
      {
        timestamp: '2026-05-02T07:37:03.000Z',
        type: 'system',
        subtype: 'turn_duration',
        durationMs: 2000,
      },
    ]);

    const stats = await readClaudeSessionHistoryStats(jsonlPath);

    expect(stats).toMatchObject({
      lastUserText: 'Please edit a file',
      lastAssistantText: 'Updated the file.',
      firstUserTs: Date.parse('2026-05-02T07:37:01.000Z'),
      lastAssistantTs: Date.parse('2026-05-02T07:37:02.000Z'),
      turnDurationMs: 2000,
      toolUsage: { Edit: 1 },
      touchedFiles: ['/workspace/app.ts'],
    });
  });

  it('extracts Codex prompt, result, tools, and touched files', async () => {
    const jsonlPath = await writeJsonl([
      {
        timestamp: '2026-05-02T07:38:01.000Z',
        type: 'event_msg',
        payload: { type: 'user_message', message: 'Implement Codex stats' },
      },
      {
        timestamp: '2026-05-02T07:38:02.000Z',
        type: 'event_msg',
        payload: { type: 'exec_command_begin', call_id: 'exec-1', command: 'pnpm test' },
      },
      {
        timestamp: '2026-05-02T07:38:03.000Z',
        type: 'event_msg',
        payload: { type: 'exec_command_end', call_id: 'exec-1', exit_code: 0, duration: { secs: 1, nanos: 500_000_000 } },
      },
      {
        timestamp: '2026-05-02T07:38:04.000Z',
        type: 'response_item',
        payload: {
          type: 'custom_tool_call',
          call_id: 'patch-1',
          name: 'apply_patch',
          input: '*** Begin Patch\n*** Update File: src/app.ts\n@@\n-old\n+new\n*** End Patch\n',
        },
      },
      {
        timestamp: '2026-05-02T07:38:05.000Z',
        type: 'event_msg',
        payload: { type: 'agent_message', message: 'Implemented Codex stats.' },
      },
      {
        timestamp: '2026-05-02T07:38:06.000Z',
        type: 'event_msg',
        payload: { type: 'task_complete' },
      },
    ]);

    const stats = await readCodexSessionHistoryStats(jsonlPath);

    expect(stats).toMatchObject({
      lastUserText: 'Implement Codex stats',
      lastAssistantText: 'Implemented Codex stats.',
      firstUserTs: Date.parse('2026-05-02T07:38:01.000Z'),
      lastAssistantTs: Date.parse('2026-05-02T07:38:05.000Z'),
      turnDurationMs: 1500,
      toolUsage: { Bash: 1, apply_patch: 1 },
      touchedFiles: ['src/app.ts'],
    });
  });
});
