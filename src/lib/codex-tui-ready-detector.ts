import { matchCodexUpdatePrompt } from '@/lib/codex-update-prompt-detector';

const CODEX_COMPOSER_LINE_RE = /^\s*›(?:\s*$|\s+(?!\d+\.)(?!\[[ x-]\])[^\n]*)$/m;
const CODEX_DISABLED_INPUT_RE = /^\s*›?\s*Input disabled\./m;

export const isCodexTuiReadyContent = (content: string): boolean => {
  if (!content) return false;
  if (matchCodexUpdatePrompt(content)?.status === 'prompt') return false;
  if (CODEX_DISABLED_INPUT_RE.test(content)) return false;

  const hasHeaderBox = content.includes('╭') && content.includes('╰');
  const hasComposer = CODEX_COMPOSER_LINE_RE.test(content);
  return hasHeaderBox && hasComposer;
};
