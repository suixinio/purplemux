import { codexHookEvents } from '@/lib/providers/codex/hook-events';
import { processCodexHookPayload } from '@/lib/providers/codex/hook-handler';
import type { ICodexHookPayload } from '@/lib/providers/codex/work-state-observer';
import type { IWorkStateObserver, TAgentWorkStateEvent } from '@/lib/providers/types';
import type { ITab } from '@/types/terminal';
import { createLogger } from '@/lib/logger';

const log = createLogger('codex-runtime');

export const attachCodexWorkStateObserver = (
  tab: ITab,
  _panePid: number,
  emit: (event: TAgentWorkStateEvent) => void,
): IWorkStateObserver => {
  const sessionName = tab.sessionName;

  const listener = (tmuxSession: string, payload: ICodexHookPayload) => {
    if (tmuxSession !== sessionName) return;
    try {
      const { result, event } = processCodexHookPayload(tmuxSession, payload);
      if (!result.ok) {
        log.debug({ tmuxSession, event: payload.hook_event_name, reason: result.reason }, 'codex hook skipped');
      }
      if (event) emit(event);
    } catch (err) {
      log.error({ err: err instanceof Error ? err.message : err, tmuxSession }, 'codex observer listener failed');
    }
  };

  codexHookEvents.on('hook', listener);

  return {
    stop: () => {
      codexHookEvents.off('hook', listener);
    },
  };
};
