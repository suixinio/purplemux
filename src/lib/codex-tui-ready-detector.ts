import { matchCodexUpdatePrompt } from '@/lib/codex-update-prompt-detector';

const CODEX_COMPOSER_LINE_RE = /^\s*›(?:\s*$|\s+(?!\d+\.)(?!\[[ x-]\])[^\n]*)$/m;
const CODEX_DISABLED_INPUT_RE = /^\s*›?\s*Input disabled\./m;
const COMPOSER_TAIL_LINES = 8;

export const isCodexTuiReadyContent = (content: string): boolean => {
  if (!content) return false;
  if (matchCodexUpdatePrompt(content)?.status === 'prompt') return false;
  if (CODEX_DISABLED_INPUT_RE.test(content)) return false;

  const lines = content.split('\n');
  let end = lines.length;
  while (end > 0 && lines[end - 1].trim() === '') end -= 1;
  if (end === 0) return false;
  const tail = lines.slice(Math.max(0, end - COMPOSER_TAIL_LINES), end).join('\n');
  return CODEX_COMPOSER_LINE_RE.test(tail);
};
