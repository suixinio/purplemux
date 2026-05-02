import path from 'path';
import { describe, expect, it } from 'vitest';
import { parseCodexContent } from '@/lib/session-parser-codex';
import { UPLOADS_DIR } from '@/lib/uploads-store';

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
