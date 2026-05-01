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
  if (/Update ran successfully!\s+Please restart Codex\./i.test(text)) {
    return {
      status: 'success',
      currentVersion: null,
      latestVersion: null,
      updateCommand: null,
    };
  }

  const versionMatch = text.match(VERSION_RE);
  const hasPromptChoices = /Release notes:\s+https:\/\/github\.com\/openai\/codex\/releases\/latest/i.test(text)
    && /Skip until next version/i.test(text);
  if (!versionMatch || !hasPromptChoices) {
    if (/Updating Codex via `/i.test(text)) {
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
    status: /Updating Codex via `/i.test(text) ? 'updating' : 'prompt',
    currentVersion: versionMatch[1] ?? null,
    latestVersion: versionMatch[2] ?? null,
    updateCommand: text.match(COMMAND_RE)?.[1] ?? null,
  };
};
