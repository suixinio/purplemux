---
step: build
timestamp: 2026-05-01 19:02
elapsed: 13분 1초
status: completed
---
v19 codex-provider-core 구현을 마쳤습니다. `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build` 모두 통과합니다.

## 변경 사항

**신규 파일 (4)**
- `src/lib/providers/codex/prompt.ts` — `writeCodexPromptFile`, `getCodexPromptPath`, `sanitizeForTomlTripleQuote` (`'''` → `' ''`)
- `src/lib/providers/codex/client.ts` — 브라우저용 `buildCodexLaunchCommand` (Phase 2 메뉴용)
- `src/lib/providers/codex/session-detection.ts` — `isCodexRunning`, `detectActiveSession`, `watchSessionsDir` (shell→node→codex 자식·손자 walk)
- `src/lib/providers/codex/index.ts` — `IAgentProvider` 슬롯 7개 매핑. `agentState`만 사용 (legacy 필드 없음), `parsePaneTitle` 항상 null, `sessionIdFromJsonlPath`는 `rollout-…-{uuid}.jsonl`에서 UUID 추출

**기존 파일 변경 (4)**
- `src/types/terminal.ts` — `TPanelType`에 `'codex-cli'` 추가
- `src/lib/providers/index.ts` — `registerProvider(codexProvider)`
- `src/lib/providers/claude/index.ts` — `matchesProcess` greedy fallback 제거 (`node` cmd는 args 필수)
- `src/lib/auto-resume.ts` — `node` foreground 시 child PID에서 args 수집해 `getProviderByProcessName(cmd, args)`로 전달 (provider 충돌 회피)

## 동작 흐름
- **Launch**: `provider.buildLaunchCommand({ workspaceId })` → `dangerouslySkipPermissions` + `buildCodexHookFlags()` 머지 + `codex-prompt.md` 읽어 `-c 'developer_instructions=\'\'\'...\'\'\''` (shell single-quote escape) + 옵션 시 `--yolo`
- **Resume**: 동일 + `codex resume <uuid>`. UUID 검증 실패 시 throw
- **Workspace prompt**: `writeAllWorkspacePrompts`가 이미 `listProviders()` 순회 패턴이라 codex provider 등록만으로 부트 시 자동 작성
- **Preflight**: 기존 `runCodexPreflight()` (`ICodexStatus`)을 `IAgentPreflight`로 어댑트 + `~/.codex/auth.json` 존재로 `loggedIn` 결정
- **Hook 통합**: 기존 `hook-handler.ts`/`hook-config.ts`/`work-state-observer.ts`/`hook-events.ts` 그대로 활용

다음 feature를 빌드하려면 `/new` 후 `/4-build`를 실행하세요.
(컨텍스트를 정리하고 새로운 세션에서 더 정확한 코드를 생성합니다)
