import { afterEach, describe, expect, it, vi } from 'vitest';
import { __testing } from '@/lib/codex-rate-limits-cache';

describe('codex rate limits cache parsing', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('extracts the latest token_count rate limits in Claude-compatible shape', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-02T03:00:00.000Z'));

    const lines = [
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          rate_limits: {
            primary: { used_percent: 5, window_minutes: 300, resets_at: 1_777_000_000 },
            secondary: { used_percent: 3, window_minutes: 10_080, resets_at: 1_778_000_000 },
          },
        },
      }),
      JSON.stringify({
        type: 'event_msg',
        payload: {
          type: 'token_count',
          rate_limits: {
            primary: { used_percent: 12, window_minutes: 300, resets_at: 1_800_000_000 },
            secondary: { used_percent: 7, window_minutes: 10_080, resets_at: 1_900_000_000 },
          },
        },
      }),
    ];

    expect(__testing.extractLatestCodexRateLimits(lines)).toEqual({
      ts: Date.now() / 1000,
      five_hour: { used_percentage: 12, resets_at: 1_800_000_000 },
      seven_day: { used_percentage: 7, resets_at: 1_900_000_000 },
    });
  });

  it('falls back to primary and secondary when window_minutes is missing', () => {
    expect(__testing.normalizeRateLimits({
      primary: { used_percent: 22, resets_at: 1_800_000_000 },
      secondary: { used_percent: 9, resets_at: 1_900_000_000 },
    })).toMatchObject({
      five_hour: { used_percentage: 22, resets_at: 1_800_000_000 },
      seven_day: { used_percentage: 9, resets_at: 1_900_000_000 },
    });
  });
});
