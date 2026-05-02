import { describe, expect, it } from 'vitest';
import { isCodexTuiReadyContent } from '@/lib/codex-tui-ready-detector';

describe('isCodexTuiReadyContent', () => {
  it('detects the default Codex composer', () => {
    expect(isCodexTuiReadyContent(`
╭────────────────────────╮
│ >_ OpenAI Codex        │
╰────────────────────────╯

› Ask Codex to do anything

  gpt-5.5 high · ~/repo
`)).toBe(true);
  });

  it('detects a composer with existing text', () => {
    expect(isCodexTuiReadyContent(`
╭────────────────────────────────────────────────────────╮
│ >_ OpenAI Codex (v0.128.0)                             │
╰────────────────────────────────────────────────────────╯

› Implement {feature}

  gpt-5.5 high · ~/Workspace/github.com/subicura/purplemux
`)).toBe(true);
  });

  it('does not depend on the random placeholder text', () => {
    expect(isCodexTuiReadyContent(`
╭────────────────────────╮
│ >_ OpenAI Codex        │
╰────────────────────────╯

› Explain this codebase

  100% context left
`)).toBe(true);
  });

  it('does not treat disabled composer text as ready', () => {
    expect(isCodexTuiReadyContent(`
╭────────────────────────╮
│ >_ OpenAI Codex        │
╰────────────────────────╯

› Input disabled.

  100% context left
`)).toBe(false);
  });

  it('does not treat update prompt menu as ready', () => {
    expect(isCodexTuiReadyContent(`
  ✨ Update available! 0.125.0 -> 0.128.0

› 1. Update now (runs \`npm install -g @openai/codex\`)
  2. Skip
  3. Skip until next version
`)).toBe(false);
  });

  it('does not treat numbered popup selections as ready', () => {
    expect(isCodexTuiReadyContent(`
╭────────────────────────╮
│ >_ OpenAI Codex        │
╰────────────────────────╯

› 1. Yes, proceed (y)
  2. No
`)).toBe(false);
  });

  it('detects a resumed session whose welcome banner has scrolled off', () => {
    expect(isCodexTuiReadyContent(`
› Implement the new feature

  Sure, I'll start by reviewing the existing code.

› Run the tests

  All tests pass. Here is the summary of changes:
  - Added validation for input
  - Updated tests

›

  gpt-5.5 high · ~/Workspace/github.com/subicura/purplemux
`)).toBe(true);
  });

  it('detects a launch screen with trailing pane padding', () => {
    expect(isCodexTuiReadyContent(`
╭───────────────────────────────────────────────╮
│ >_ OpenAI Codex (v0.128.0)                    │
│                                               │
│ model:       gpt-5.5 high   /model to change  │
│ directory:   ~/Workspace/…/subicura/purplemux │
│ permissions: YOLO mode                        │
╰───────────────────────────────────────────────╯

  Tip: NEW: Prevent sleep while running is now available
  in /experimental.


› Explain this codebase

  gpt-5.5 high · ~/Workspace/github.com/subicura/purple…




















`)).toBe(true);
  });

  it('does not treat a pane with only stale content as ready', () => {
    expect(isCodexTuiReadyContent(`
$ codex resume 12345678-aaaa-bbbb-cccc-1234567890ab
Error: session not found
$
`)).toBe(false);
  });
});
