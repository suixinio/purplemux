import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { countMessages } from '@/pages/api/timeline/message-counts';

describe('countMessages', () => {
  it('counts Codex user and assistant event messages', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'purplemux-message-counts-'));
    const jsonlPath = path.join(dir, 'codex.jsonl');
    const lines = [
      {
        type: 'session_meta',
        payload: { id: 'session-1' },
      },
      {
        type: 'event_msg',
        payload: {
          type: 'user_message',
          message: 'hello codex',
        },
      },
      {
        type: 'event_msg',
        payload: {
          type: 'agent_message',
          message: 'hello user',
        },
      },
      {
        type: 'response_item',
        payload: {
          type: 'function_call',
          name: 'exec_command',
        },
      },
    ];

    await fs.writeFile(jsonlPath, lines.map((line) => JSON.stringify(line)).join('\n') + '\n');

    await expect(countMessages(jsonlPath)).resolves.toMatchObject({
      userCount: 1,
      assistantCount: 1,
      toolCount: 1,
      toolBreakdown: { exec_command: 1 },
    });
  });
});
