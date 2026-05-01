---
step: build
timestamp: 2026-05-01 17:42
elapsed: 12분 56초
status: completed
---
Both pass. Build verification done.

## Summary

Implemented v19 agent-status-resilience per `.specs/v19/features/agent-status-resilience/`:

**1. F1/F2 inactive guard** (`src/lib/status-manager.ts`)
- New `lastResumeOrStartedAt` runtime field on `ITabStatusEntry` (not persisted).
- Stamped at `auto-resume.ts` resume, `tabs/index.ts` + `workspace/index.ts` setTimeout resume, `timeline-server.ts` resume, and on every `session-start` hook (real + synthetic) via `markAgentLaunch`.
- Per-tab poll path now silently transitions agent tabs to `inactive` only when process is gone **AND** F1 grace (5 s) has expired **AND** F2 pane title is shell-style (`cmd|path`) or empty — caching `agentRunning` so the busy-stuck path doesn't double-call.

**2. `sendKeysSeparated` helper** (`src/lib/tmux.ts`)
- Sends text + 50ms gap + Enter as two tmux invocations to defeat Codex's paste-burst misinterpretation.
- Wired into `auto-resume.ts:sendResumeKeys`.

**3. `matchesProcess(cmd, args?)`** (`src/lib/providers/{types,registry}.ts`, `claude/index.ts`)
- Optional `args[]` for disambiguating `node`-launched agents. Claude impl now: `cmd === 'claude'` ✓, or `cmd === 'node' && args` matches `claude.js`/`claude` (graceful fallback when `args` is undefined).

**4. Store rename `claude*` → `agent*`** 
- `agentProcess`, `agentProcessCheckedAt`, `agentInstalled`, `setAgentProcess`, `setAgentInstalled` across `use-tab-store.ts`, `use-timeline.ts` (return shape + sync state), `claude-code-panel.tsx`, `mobile-claude-code-panel.tsx`, `mobile-surface-view.tsx`, `pane-container.tsx`. Confirmed zero `claudeProcess`/`claudeInstalled` survivors in `src/`.

**5. Docs sync** — `docs/STATUS.md` updated for the rename and a new "Agent-Gone Inactive Guard (F1/F2)" section.

`pnpm tsc --noEmit` and `pnpm lint` both clean.

다음 feature를 빌드하려면 `/new` 후 `/4-build`를 실행하세요.
(컨텍스트를 정리하고 새로운 세션에서 더 정확한 코드를 생성합니다)
