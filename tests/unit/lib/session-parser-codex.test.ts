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
});
