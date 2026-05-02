import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearCodexStatsCache,
  readCodexTimelineSessionStats,
} from '@/lib/stats/jsonl-parser-codex';

describe('readCodexTimelineSessionStats', () => {
  beforeEach(() => {
    clearCodexStatsCache();
  });

  it('extracts tokens, model, context, and API cost from Codex token_count events', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'purplemux-codex-jsonl-'));
    const sessionId = '55555555-5555-4555-8555-555555555555';
    const jsonlPath = path.join(dir, `rollout-2026-05-02T03-00-00-${sessionId}.jsonl`);
    const lines = [
      {
        type: 'session_meta',
        timestamp: '2026-05-02T03:00:00.000Z',
        payload: {
          id: sessionId,
          timestamp: '2026-05-02T03:00:00.000Z',
          cwd: '/tmp/project',
          base_instructions: { text: 'x'.repeat(20_000) },
        },
      },
      {
        type: 'turn_context',
        payload: { model: 'gpt-5.2-codex' },
      },
      {
        type: 'event_msg',
        payload: {
          type: 'token_count',
          info: {
            total_token_usage: {
              input_tokens: 1_000_000,
              cached_input_tokens: 100_000,
              output_tokens: 1_000_000,
              reasoning_output_tokens: 123_456,
              total_tokens: 2_000_000,
            },
            last_token_usage: {
              input_tokens: 120_000,
              cached_input_tokens: 20_000,
              output_tokens: 80_000,
              reasoning_output_tokens: 10_000,
              total_tokens: 200_000,
            },
            model_context_window: 400_000,
          },
          rate_limits: {
            primary: {
              used_percent: 12,
              window_minutes: 300,
              resets_at: 1_800_000_000,
            },
          },
        },
      },
    ];

    await fs.writeFile(jsonlPath, lines.map((line) => JSON.stringify(line)).join('\n') + '\n');

    const stats = await readCodexTimelineSessionStats(jsonlPath);

    expect(stats?.sessionId).toBe(sessionId);
    expect(stats?.model).toBe('gpt-5.2-codex');
    expect(stats?.inputTokens).toBe(1_000_000);
    expect(stats?.cachedInputTokens).toBe(100_000);
    expect(stats?.outputTokens).toBe(1_000_000);
    expect(stats?.reasoningOutputTokens).toBe(123_456);
    expect(stats?.currentContextTokens).toBe(200_000);
    expect(stats?.contextWindowSize).toBe(400_000);
    expect(stats?.usedPercentage).toBe(50);
    expect(stats?.cost).toBeCloseTo(15.5925, 8);
  });
});
