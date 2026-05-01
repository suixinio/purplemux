import { getStatusManager } from '@/lib/status-manager';
import { createLogger } from '@/lib/logger';
import { codexHookEvents } from '@/lib/providers/codex/hook-events';
import {
  isCodexSessionSource,
  translateCodexHookEvent,
  type ICodexHookPayload,
} from '@/lib/providers/codex/work-state-observer';
import type { ISessionInfo } from '@/types/timeline';

const log = createLogger('codex');

const SUMMARY_LIMIT = 80;

export interface IHandleCodexHookResult {
  ok: boolean;
  reason?: 'unknown-session' | 'unknown-event';
}

export const handleCodexHookEvent = (
  tmuxSession: string,
  payload: ICodexHookPayload,
): IHandleCodexHookResult => {
  const statusManager = getStatusManager();
  const event = translateCodexHookEvent(payload);

  const meta: Parameters<typeof statusManager.applyCodexHookMeta>[1] = {
    sessionId: payload.session_id ?? null,
  };
  if (payload.transcript_path) meta.jsonlPath = payload.transcript_path;

  if (payload.hook_event_name === 'UserPromptSubmit' && typeof payload.prompt === 'string' && payload.prompt) {
    meta.lastUserMessage = payload.prompt;
    meta.agentSummary = payload.prompt.slice(0, SUMMARY_LIMIT);
  }

  const isClear = payload.hook_event_name === 'SessionStart' && payload.source === 'clear';
  if (isClear) meta.clearMessages = true;

  const applied = statusManager.applyCodexHookMeta(tmuxSession, meta);
  if (!applied) {
    log.debug({ tmuxSession, event: payload.hook_event_name }, 'codex hook for unknown session');
    return { ok: false, reason: 'unknown-session' };
  }

  if (!event) {
    return { ok: false, reason: 'unknown-event' };
  }

  if (event.kind === 'session-start') {
    const source = isCodexSessionSource(payload.source) ? payload.source : 'startup';
    if (source === 'clear') {
      statusManager.updateTabFromHook(tmuxSession, 'session-start');
    } else if (applied.cliState === 'inactive' || applied.cliState === 'unknown') {
      statusManager.updateTabFromHook(tmuxSession, 'session-start');
    }
  } else if (event.kind === 'notification') {
    statusManager.updateTabFromHook(tmuxSession, 'notification', event.notificationType);
  } else if (event.kind === 'prompt-submit' || event.kind === 'stop') {
    statusManager.updateTabFromHook(tmuxSession, event.kind);
  }

  if (payload.hook_event_name === 'SessionStart') {
    const info: ISessionInfo = {
      status: 'running',
      sessionId: payload.session_id ?? null,
      jsonlPath: payload.transcript_path ?? null,
      pid: null,
      startedAt: null,
      cwd: payload.cwd ?? null,
    };
    codexHookEvents.emit('session-info', tmuxSession, info);
    if (isClear) {
      codexHookEvents.emit('session-clear', tmuxSession);
    }
  }

  return { ok: true };
};
