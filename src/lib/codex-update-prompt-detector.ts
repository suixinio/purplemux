export type TCodexUpdatePromptStatus = 'prompt' | 'updating' | 'success';
export type TCodexUpdateAnswer = 'update' | 'skip' | 'skip-version';

export interface ICodexUpdatePromptInfo {
  status: TCodexUpdatePromptStatus;
  currentVersion: string | null;
  latestVersion: string | null;
  updateCommand: string | null;
}

const VERSION_RE = /Update available!\s+([0-9][^\s]*)\s+->\s+([0-9][^\s]*)/i;
const COMMAND_RE = /Update now\s+\(runs `([^`]+)`\)/i;

export const matchCodexUpdatePrompt = (text: string): ICodexUpdatePromptInfo | null => {
  const flat = text.replace(/\s+/g, ' ');

  if (/Update ran successfully! Please restart Codex\./i.test(flat)) {
    return {
      status: 'success',
      currentVersion: null,
      latestVersion: null,
      updateCommand: null,
    };
  }

  const versionMatch = flat.match(VERSION_RE);
  const hasPromptChoices = /Release notes:/i.test(flat)
    && /Skip until next version/i.test(flat);
  if (!versionMatch || !hasPromptChoices) {
    if (/Updating Codex via `/i.test(flat)) {
      return {
        status: 'updating',
        currentVersion: null,
        latestVersion: null,
        updateCommand: null,
      };
    }
    return null;
  }

  return {
    status: /Updating Codex via `/i.test(flat) ? 'updating' : 'prompt',
    currentVersion: versionMatch[1] ?? null,
    latestVersion: versionMatch[2] ?? null,
    updateCommand: flat.match(COMMAND_RE)?.[1] ?? null,
  };
};
