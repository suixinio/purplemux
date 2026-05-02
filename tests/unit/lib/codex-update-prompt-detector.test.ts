import { describe, expect, it } from 'vitest';

import { matchCodexUpdatePrompt } from '@/lib/codex-update-prompt-detector';

describe('matchCodexUpdatePrompt', () => {
  it('Codex update prompt를 감지한다', () => {
    const prompt = [
      '  ✨ Update available! 0.125.0 -> 0.128.0',
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

  it('xterm column wrap으로 URL 일부가 잘려도 감지한다', () => {
    const truncated = [
      '  ✨ Update available! 0.125.0 -> 0.128.0',
      '',
      '  Release notes: https://github.com/openai/codex/re',
      '',
      '› 1. Update now (runs `npm install -g',
      '     @openai/codex`)',
      '  2. Skip',
      '  3. Skip until next version',
    ].join('\n');

    expect(matchCodexUpdatePrompt(truncated)).toEqual({
      status: 'prompt',
      currentVersion: '0.125.0',
      latestVersion: '0.128.0',
      updateCommand: 'npm install -g @openai/codex',
    });
  });

  it('좁은 화면에서 줄바꿈된 URL도 감지한다', () => {
    const wrapped = [
      '  ✨ Update available! 0.125.0 -> 0.128.0',
      '',
      '  Release notes:',
      '  https://github.com/openai/codex/releases/latest',
      '',
      '› 1. Update now (runs `npm install -g @openai/codex`)',
      '  2. Skip',
      '  3. Skip until next version',
    ].join('\n');

    expect(matchCodexUpdatePrompt(wrapped)).toEqual({
      status: 'prompt',
      currentVersion: '0.125.0',
      latestVersion: '0.128.0',
      updateCommand: 'npm install -g @openai/codex',
    });
  });

  it('Skip until next version 라인이 없으면 prompt로 인식하지 않는다', () => {
    const partial = [
      '  ✨ Update available! 0.125.0 -> 0.128.0',
      '  Release notes: https://github.com/openai/codex/releases/latest',
    ].join('\n');

    expect(matchCodexUpdatePrompt(partial)).toBeNull();
  });

  it('Release notes 라인이 없으면 prompt로 인식하지 않는다', () => {
    const partial = [
      '  ✨ Update available! 0.125.0 -> 0.128.0',
      '› 1. Update now (runs `npm install -g @openai/codex`)',
      '  3. Skip until next version',
    ].join('\n');

    expect(matchCodexUpdatePrompt(partial)).toBeNull();
  });

  it('관련 없는 buffer는 null을 반환한다', () => {
    expect(matchCodexUpdatePrompt('')).toBeNull();
    expect(matchCodexUpdatePrompt('codex shell prompt> ')).toBeNull();
  });
});
