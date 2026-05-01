import { EventEmitter } from 'events';
import type { ISessionInfo } from '@/types/timeline';

export type TCodexHookEvent =
  | { kind: 'session-info'; tmuxSession: string; info: ISessionInfo }
  | { kind: 'session-clear'; tmuxSession: string };

interface ICodexHookEvents {
  on(event: 'session-info', listener: (tmuxSession: string, info: ISessionInfo) => void): this;
  on(event: 'session-clear', listener: (tmuxSession: string) => void): this;
  emit(event: 'session-info', tmuxSession: string, info: ISessionInfo): boolean;
  emit(event: 'session-clear', tmuxSession: string): boolean;
  off(event: 'session-info', listener: (tmuxSession: string, info: ISessionInfo) => void): this;
  off(event: 'session-clear', listener: (tmuxSession: string) => void): this;
}

const g = globalThis as unknown as { __ptCodexHookEvents?: EventEmitter };
if (!g.__ptCodexHookEvents) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);
  g.__ptCodexHookEvents = emitter;
}

export const codexHookEvents = g.__ptCodexHookEvents as unknown as ICodexHookEvents;
