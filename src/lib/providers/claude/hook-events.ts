import { EventEmitter } from 'events';

export interface IClaudeHookPayload {
  tmuxSession: string;
  event: string;
  notificationType?: string;
}

interface IClaudeHookEvents {
  on(event: 'hook', listener: (payload: IClaudeHookPayload) => void): this;
  off(event: 'hook', listener: (payload: IClaudeHookPayload) => void): this;
  emit(event: 'hook', payload: IClaudeHookPayload): boolean;
}

const g = globalThis as unknown as { __ptClaudeHookEvents?: EventEmitter };
if (!g.__ptClaudeHookEvents) {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);
  g.__ptClaudeHookEvents = emitter;
}

export const claudeHookEvents = g.__ptClaudeHookEvents as unknown as IClaudeHookEvents;
