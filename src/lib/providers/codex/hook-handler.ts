import { getStatusManager } from '@/lib/status-manager';
import { codexHookEvents } from '@/lib/providers/codex/hook-events';
import {
  isCodexSessionSource,
  parseCodexPermissionRequest,
  translateCodexHookEvent,
  type ICodexHookPayload,
} from '@/lib/providers/codex/work-state-observer';
import type { TAgentWorkStateEvent } from '@/lib/providers/types';
import type { ISessionInfo } from '@/types/timeline';

const SUMMARY_LIMIT = 80;

export interface IHandleCodexHookResult {
  ok: boolean;
  reason?: 'unknown-session' | 'unknown-event';
}

/**
 * Apply codex-specific meta side effects (sessionId, jsonlPath, lastUserMessage,
 * agentSummary, permissionRequest, clearMessages) and return the work-state event
 * that should be emitted to the observer callback. Centralized here so both the
 * codex provider observer and any future caller share one contract.
 */
export const processCodexHookPayload = (
  tmuxSession: string,
  payload: ICodexHookPayload,
): { result: IHandleCodexHookResult; event: TAgentWorkStateEvent | null } => {
  const statusManager = getStatusManager();
  const meta: Parameters<typeof statusManager.applyCodexHookMeta>[1] = {
    sessionId: payload.session_id ?? null,
  };
  if (payload.transcript_path) meta.jsonlPath = payload.transcript_path;

  if (payload.hook_event_name === 'UserPromptSubmit' && typeof payload.prompt === 'string' && payload.prompt) {
    meta.lastUserMessage = payload.prompt;
    meta.agentSummary = payload.prompt.slice(0, SUMMARY_LIMIT);
  }

  if (payload.hook_event_name === 'PermissionRequest') {
    meta.permissionRequest = parseCodexPermissionRequest(payload);
  } else if (payload.hook_event_name === 'Stop') {
    meta.permissionRequest = null;
  }

  const isClear = payload.hook_event_name === 'SessionStart' && payload.source === 'clear';
  if (isClear) meta.clearMessages = true;

  const applied = statusManager.applyCodexHookMeta(tmuxSession, meta);
  if (!applied) {
    return { result: { ok: false, reason: 'unknown-session' }, event: null };
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
    if (isClear) codexHookEvents.emit('session-clear', tmuxSession);
  }

  const event = translateCodexHookEvent(payload);
  if (!event) return { result: { ok: false, reason: 'unknown-event' }, event: null };

  if (event.kind === 'session-start') {
    const source = isCodexSessionSource(payload.source) ? payload.source : 'startup';
    const shouldEmit = source === 'clear'
      || applied.cliState === 'inactive'
      || applied.cliState === 'unknown';
    if (!shouldEmit) return { result: { ok: true }, event: null };
  }

  return { result: { ok: true }, event };
};
