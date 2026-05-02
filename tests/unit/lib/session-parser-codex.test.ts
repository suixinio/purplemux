import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { describe, expect, it } from 'vitest';
import { parseCodexContent, readCodexEntriesBefore, readTailCodexEntries } from '@/lib/session-parser-codex';
import { UPLOADS_DIR } from '@/lib/uploads-store';

const codexUserLine = (idx: number) => JSON.stringify({
  timestamp: `2026-05-02T07:37:${String(idx).padStart(2, '0')}.000Z`,
  type: 'event_msg',
  payload: {
    type: 'user_message',
    message: `message ${idx}`,
  },
});

describe('parseCodexContent', () => {
  it('maps Codex local_images under uploads to served image URLs', () => {
    const imagePath = path.join(UPLOADS_DIR, 'ws-1', 'tab-1', 'image.png');
    const line = {
      timestamp: '2026-05-02T07:37:12.642Z',
      type: 'event_msg',
      payload: {
        type: 'user_message',
        message: '[Image #1] describe this',
        images: [],
        local_images: [imagePath, '/tmp/outside.png'],
      },
    };

    const entries = parseCodexContent(JSON.stringify(line) + '\n');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      type: 'user-message',
      text: '[Image #1] describe this',
      images: ['/api/uploads/ws-1/tab-1/image.png'],
    });
  });

  it('uses context_compacted event_msg and ignores top-level compacted records', () => {
    const compacted = {
      timestamp: '2026-05-02T11:34:43.788Z',
      type: 'compacted',
      payload: {
        replacement_history: [],
      },
    };
    const eventMsg = {
      timestamp: '2026-05-02T11:34:43.796Z',
      type: 'event_msg',
      payload: {
        type: 'context_compacted',
      },
    };

    const entries = parseCodexContent(`${JSON.stringify(compacted)}\n${JSON.stringify(eventMsg)}\n`);

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      type: 'context-compacted',
    });
  });

  it('reads Codex tail entries with byte-offset pagination', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'purplemux-codex-tail-'));
    const jsonlPath = path.join(dir, 'session.jsonl');
    try {
      await fs.writeFile(
        jsonlPath,
        Array.from({ length: 10 }, (_, i) => codexUserLine(i + 1)).join('\n') + '\n',
        'utf-8',
      );

      const initial = await readTailCodexEntries(jsonlPath, 3);
      expect(initial.hasMore).toBe(true);
      expect(initial.startByteOffset).toBeGreaterThan(0);
      expect(initial.entries.map((entry) => entry.type === 'user-message' ? entry.text : '')).toEqual([
        'message 8',
        'message 9',
        'message 10',
      ]);

      const expanded = await readCodexEntriesBefore(jsonlPath, initial.startByteOffset, 2);
      expect(expanded.hasMore).toBe(true);
      expect(expanded.entries.map((entry) => entry.type === 'user-message' ? entry.text : '')).toEqual([
        'message 6',
        'message 7',
        'message 8',
        'message 9',
        'message 10',
      ]);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('replays warmup lines when expanding a Codex page', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'purplemux-codex-warmup-'));
    const jsonlPath = path.join(dir, 'session.jsonl');
    try {
      const lines = [
        {
          timestamp: '2026-05-02T07:38:01.000Z',
          type: 'event_msg',
          payload: { type: 'exec_command_begin', call_id: 'exec-1', command: 'pnpm test' },
        },
        {
          timestamp: '2026-05-02T07:38:02.000Z',
          type: 'event_msg',
          payload: { type: 'user_message', message: 'older 1' },
        },
        {
          timestamp: '2026-05-02T07:38:03.000Z',
          type: 'event_msg',
          payload: { type: 'user_message', message: 'older 2' },
        },
        {
          timestamp: '2026-05-02T07:38:04.000Z',
          type: 'event_msg',
          payload: { type: 'exec_command_end', call_id: 'exec-1', exit_code: 0, stdout: 'ok' },
        },
      ].map((line) => JSON.stringify(line));

      await fs.writeFile(jsonlPath, lines.join('\n') + '\n', 'utf-8');

      const initial = await readTailCodexEntries(jsonlPath, 1);
      expect(initial.entries).toHaveLength(1);
      expect(initial.entries[0]).toMatchObject({
        type: 'exec-command-stream',
        command: 'pnpm test',
      });

      const expanded = await readCodexEntriesBefore(jsonlPath, initial.startByteOffset, 1);
      expect(expanded.entries).toHaveLength(2);
      expect(expanded.entries[0]).toMatchObject({ type: 'user-message', text: 'older 2' });
      expect(expanded.entries[1]).toMatchObject({
        type: 'exec-command-stream',
        command: 'pnpm test',
      });
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('suppresses Codex write_stdin tool calls and outputs', () => {
    const call = {
      timestamp: '2026-05-02T11:40:00.000Z',
      type: 'response_item',
      payload: {
        type: 'function_call',
        call_id: 'call-1',
        name: 'write_stdin',
        arguments: JSON.stringify({ session_id: 123, chars: '', yield_time_ms: 1000 }),
      },
    };
    const output = {
      timestamp: '2026-05-02T11:40:01.000Z',
      type: 'response_item',
      payload: {
        type: 'function_call_output',
        call_id: 'call-1',
        output: '456',
      },
    };

    const entries = parseCodexContent(`${JSON.stringify(call)}\n${JSON.stringify(output)}\n`);

    expect(entries).toHaveLength(0);
  });
});
