import { claudeHookEvents, type IClaudeHookPayload } from '@/lib/providers/claude/hook-events';
import {
  HOOK_EVENT_KINDS,
  type IWorkStateObserver,
  type TAgentWorkStateEvent,
  type THookEventKind,
} from '@/lib/providers/types';
import type { ITab } from '@/types/terminal';

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

export const attachClaudeWorkStateObserver = (
  tab: ITab,
  _panePid: number,
  emit: (event: TAgentWorkStateEvent) => void,
): IWorkStateObserver => {
  const sessionName = tab.sessionName;

  const listener = (payload: IClaudeHookPayload) => {
    if (payload.tmuxSession !== sessionName) return;
    const event = translateClaudeHookEvent(payload.event, payload.notificationType);
    if (event) emit(event);
  };

  claudeHookEvents.on('hook', listener);

  return {
    stop: () => {
      claudeHookEvents.off('hook', listener);
    },
  };
};
