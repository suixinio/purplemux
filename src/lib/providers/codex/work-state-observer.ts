import type { TAgentWorkStateEvent } from '@/lib/providers/types';

export type TCodexHookEventName =
  | 'SessionStart'
  | 'UserPromptSubmit'
  | 'Stop'
  | 'PermissionRequest';

export type TCodexSessionSource = 'startup' | 'resume' | 'clear';

export interface ICodexHookPayload {
  hook_event_name?: string;
  session_id?: string;
  transcript_path?: string | null;
  cwd?: string | null;
  source?: string;
  prompt?: string | null;
  exec_command?: unknown;
  apply_patch?: unknown;
  requested_permissions?: unknown;
}

export const isCodexSessionSource = (value: unknown): value is TCodexSessionSource =>
  value === 'startup' || value === 'resume' || value === 'clear';

export const translateCodexHookEvent = (
  payload: ICodexHookPayload,
): TAgentWorkStateEvent | null => {
  switch (payload.hook_event_name) {
    case 'SessionStart':
      return { kind: 'session-start' };
    case 'UserPromptSubmit':
      return { kind: 'prompt-submit' };
    case 'Stop':
      return { kind: 'stop' };
    case 'PermissionRequest':
      return { kind: 'notification', notificationType: 'permission_prompt' };
    default:
      return null;
  }
};
