import { describe, expect, it } from 'vitest';
import { deriveAgentCliState } from '@/lib/agent-state-transition';
import type { ILastEvent } from '@/types/status';
import type { TCliState } from '@/types/timeline';

const event = (name: ILastEvent['name']): ILastEvent => ({
  name,
  at: Date.parse('2026-05-02T07:37:00.000Z'),
  seq: 1,
});

describe('deriveAgentCliState', () => {
  it.each([
    ['session-start', 'idle'],
    ['prompt-submit', 'busy'],
    ['notification', 'needs-input'],
    ['stop', 'ready-for-review'],
    ['interrupt', 'idle'],
  ] as const)('maps %s to %s', (eventName, expected) => {
    expect(deriveAgentCliState(event(eventName), 'unknown')).toBe(expected);
  });

  it('keeps fallback when no event is available', () => {
    expect(deriveAgentCliState(null, 'unknown')).toBe('unknown');
    expect(deriveAgentCliState(undefined, 'busy')).toBe('busy');
  });

  it('preserves cancelled state for every hook event', () => {
    const events: ILastEvent['name'][] = ['session-start', 'prompt-submit', 'notification', 'stop', 'interrupt'];
    for (const eventName of events) {
      expect(deriveAgentCliState(event(eventName), 'cancelled' satisfies TCliState)).toBe('cancelled');
    }
  });
});
