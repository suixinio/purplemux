import {
  HOOK_EVENT_KINDS,
  type TAgentWorkStateEvent,
  type THookEventKind,
} from '@/lib/providers/types';

const HOOK_EVENT_KIND_SET: ReadonlySet<string> = new Set(HOOK_EVENT_KINDS);

const isHookEventKind = (event: string): event is THookEventKind =>
  HOOK_EVENT_KIND_SET.has(event);

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
