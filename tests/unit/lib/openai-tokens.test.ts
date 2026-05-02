import { describe, expect, it } from 'vitest';
import { calculateOpenAICost } from '@/lib/openai-tokens';

describe('calculateOpenAICost', () => {
  it('calculates standard API cost with cached input pricing', () => {
    expect(calculateOpenAICost('gpt-5.2-codex', 1_000_000, 100_000, 1_000_000))
      .toBeCloseTo(15.5925, 8);
  });

  it('normalizes provider prefixes and dated snapshots', () => {
    expect(calculateOpenAICost('openai/gpt-5.2-codex-2026-01-15', 1_000_000, 0, 0))
      .toBeCloseTo(1.75, 8);
  });

  it('uses long context API pricing when the model has a long context window', () => {
    expect(calculateOpenAICost('gpt-5.5', 1_000_000, 100_000, 1_000_000, 258_400))
      .toBeCloseTo(54.1, 8);
  });

  it('returns null when a model has no API price table entry', () => {
    expect(calculateOpenAICost('unknown-model', 1_000_000, 0, 1_000_000)).toBeNull();
  });
});
