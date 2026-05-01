import path from 'path';
import os from 'os';

const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects');
const CODEX_SESSIONS_DIR = path.join(os.homedir(), '.codex', 'sessions');

export const isCodexJsonlPath = (filePath: string): boolean => {
  const resolved = path.resolve(filePath);
  return resolved.startsWith(CODEX_SESSIONS_DIR + path.sep) && resolved.endsWith('.jsonl');
};

export const isAllowedJsonlPath = (filePath: string): boolean => {
  const resolved = path.resolve(filePath);
  if (!resolved.endsWith('.jsonl')) return false;
  return (
    resolved.startsWith(CLAUDE_PROJECTS_DIR + path.sep) ||
    resolved.startsWith(CODEX_SESSIONS_DIR + path.sep)
  );
};
