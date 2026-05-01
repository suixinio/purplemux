import { HOOK_EVENT_KINDS, type TAgentWorkStateEvent, type THookEventKind } from '@/lib/providers/types';

const HOOK_EVENT_KIND_SET: ReadonlySet<string> = new Set(HOOK_EVENT_KINDS);

const isHookEventKind = (event: string): event is THookEventKind =>
  HOOK_EVENT_KIND_SET.has(event);

/**
 * Translate a Claude hook payload (event name + optional notificationType) into a
 * standardized TAgentWorkStateEvent. Returns null for unknown event kinds.
 *
 * Used by Phase 2 of the observer migration: the hook API route will route raw
 * payloads through the matched provider's translator before dispatching to
 * status-manager. For now, status-manager.updateTabFromHook still parses the
 * Claude-shaped event names directly.
 */
export const translateClaudeHookEvent = (
  event: string,
  notificationType?: string,
): TAgentWorkStateEvent | null => {
  if (!isHookEventKind(event)) return null;
  if (event === 'notification') {
    return notificationType ? { kind: 'notification', notificationType } : { kind: 'notification' };
  }
  return { kind: event };
};
