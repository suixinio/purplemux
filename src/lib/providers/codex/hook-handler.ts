import {
  isCodexSessionSource,
  parseCodexPermissionRequest,
  translateCodexHookEvent,
  type ICodexHookPayload,
} from '@/lib/providers/codex/hook-payload';
import type { IAgentHookTranslation } from '@/lib/providers/types';
import type { TCliState } from '@/types/timeline';

const SUMMARY_LIMIT = 80;

export interface IHandleCodexHookResult {
  ok: boolean;
  reason?: 'unknown-event';
}

/**
 * Converts Codex's hook payload shape into purplemux's provider-neutral hook
 * translation. The caller owns applying metadata and dispatching state events.
 */
export const processCodexHookPayload = (
  payload: ICodexHookPayload,
): { result: IHandleCodexHookResult; translation: IAgentHookTranslation } => {
  const meta: NonNullable<IAgentHookTranslation['meta']> = {
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

  const translation: IAgentHookTranslation = { meta };

  if (payload.hook_event_name === 'SessionStart') {
    translation.sessionInfo = {
      status: 'running',
      sessionId: payload.session_id ?? null,
      jsonlPath: payload.transcript_path ?? null,
      pid: null,
      startedAt: null,
      cwd: payload.cwd ?? null,
    };
    translation.clearSession = isClear;
  }

  const event = translateCodexHookEvent(payload);
  translation.event = event;
  if (!event) return { result: { ok: false, reason: 'unknown-event' }, translation };

  return { result: { ok: true }, translation };
};

export const shouldEmitCodexHookEvent = (
  payload: ICodexHookPayload,
  cliState: TCliState,
): boolean => {
  const event = translateCodexHookEvent(payload);
  if (!event) return false;
  if (event.kind === 'session-start') {
    const source = isCodexSessionSource(payload.source) ? payload.source : 'startup';
    return source === 'clear' || cliState === 'inactive' || cliState === 'unknown';
  }
  return true;
};
