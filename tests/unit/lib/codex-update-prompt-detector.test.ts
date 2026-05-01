import { describe, expect, it } from 'vitest';

import { matchCodexUpdatePrompt } from '@/lib/codex-update-prompt-detector';

describe('matchCodexUpdatePrompt', () => {
  it('Codex update prompt를 감지한다', () => {
    const prompt = [
      '  ✨ Update available! 0.125.0 -> 0.128.0',
      '',
      '  Release notes: https://github.com/openai/codex/releases/latest',
      '',
      '› 1. Update now (runs `npm install -g @openai/codex`)',
      '  2. Skip',
      '  3. Skip until next version',
    ].join('\n');

    expect(matchCodexUpdatePrompt(prompt)).toEqual({
      status: 'prompt',
      currentVersion: '0.125.0',
      latestVersion: '0.128.0',
      updateCommand: 'npm install -g @openai/codex',
    });
  });

  it('업데이트 실행 중 상태를 감지한다', () => {
    expect(matchCodexUpdatePrompt('Updating Codex via `npm install -g @openai/codex`...')).toEqual({
      status: 'updating',
      currentVersion: null,
      latestVersion: null,
      updateCommand: null,
    });
  });

  it('업데이트 성공 후 재시작 안내를 감지한다', () => {
    expect(matchCodexUpdatePrompt('🎉 Update ran successfully! Please restart Codex.')).toEqual({
      status: 'success',
      currentVersion: null,
      latestVersion: null,
      updateCommand: null,
    });
  });
});
