import type { ILastEvent } from '@/types/status';
import type { TCliState } from '@/types/timeline';

export const deriveAgentCliState = (
  event: ILastEvent | null | undefined,
  fallback: TCliState,
): TCliState => {
  if (!event || fallback === 'cancelled') return fallback;
  switch (event.name) {
    case 'session-start': return 'idle';
    case 'prompt-submit': return 'busy';
    case 'notification': return 'needs-input';
    case 'stop': return 'ready-for-review';
    case 'interrupt': return 'idle';
  }
};
