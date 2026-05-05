import { describe, expect, it } from 'vitest';

import { matchTrustPrompt } from '@/lib/trust-prompt-detector';

describe('matchTrustPrompt', () => {
  it('Claude trust prompt를 감지하고 폴더 경로를 추출한다', () => {
    const snapshot = [
      '╭───────────────────────────────────────────────────╮',
      '│ Do you trust the files in this folder?            │',
      '│                                                   │',
      '│ /Users/subicura/Workspace/github.com/subicura/foo │',
      '│                                                   │',
      '│ Quick safety check: Claude Code may read files    │',
      '│ in this folder. Reading untrusted files may lead  │',
      '│ Claude Code to behave in unexpected ways.         │',
      '│                                                   │',
      '│ ❯ 1. Yes, I trust this folder                     │',
      '│   2. No, exit                                     │',
      '╰───────────────────────────────────────────────────╯',
    ].join('\n');

    expect(matchTrustPrompt(snapshot)).toEqual({
      agent: 'claude',
      folderPath: '/Users/subicura/Workspace/github.com/subicura/foo',
    });
  });

  it('Codex trust prompt를 감지하고 cwd 경로를 추출한다', () => {
    const snapshot = [
      '> You are in /Users/subicura/Workspace/github.com/subicura/nextjs-template',
      '',
      '  Do you trust the contents of this directory? Working with untrusted contents comes with higher risk of prompt injection. Trusting the directory allows project-local config, hooks, and exec policies to load.',
      '',
      '› 1. Yes, continue',
      '  2. No, quit',
      '',
      '  Press enter to continue',
    ].join('\n');

    expect(matchTrustPrompt(snapshot)).toEqual({
      agent: 'codex',
      folderPath: '/Users/subicura/Workspace/github.com/subicura/nextjs-template',
    });
  });

  it('Codex trust prompt에서 git 저장소 루트 경로를 우선한다', () => {
    const snapshot = [
      '> You are in /Users/subicura/Workspace/github.com/subicura/foo/packages/web',
      '',
      '  Note: You’re in a subdirectory of a Git project. Trusting will apply to the repository root: /Users/subicura/Workspace/github.com/subicura/foo',
      '',
      '  Do you trust the contents of this directory? Working with untrusted contents comes with higher risk of prompt injection.',
      '',
      '› 1. Yes, continue',
      '  2. No, quit',
      '',
      '  Press enter to continue',
    ].join('\n');

    expect(matchTrustPrompt(snapshot)).toEqual({
      agent: 'codex',
      folderPath: '/Users/subicura/Workspace/github.com/subicura/foo',
    });
  });

  it('관련 없는 출력에서는 null을 반환한다', () => {
    expect(matchTrustPrompt('just a regular shell prompt')).toBeNull();
    expect(matchTrustPrompt('Quick safety check\n(no options shown)')).toBeNull();
    expect(matchTrustPrompt('Do you trust the contents of this directory?')).toBeNull();
  });

  it('절대 경로가 없으면 null을 반환한다', () => {
    const claudeNoPath = [
      'Quick safety check',
      '1. Yes, I trust this folder',
      '2. No, exit',
    ].join('\n');
    expect(matchTrustPrompt(claudeNoPath)).toBeNull();

    const codexNoPath = [
      'Do you trust the contents of this directory?',
      '1. Yes, continue',
      '2. No, quit',
    ].join('\n');
    expect(matchTrustPrompt(codexNoPath)).toBeNull();
  });
});
