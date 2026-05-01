---
step: build
timestamp: 2026-05-01 19:26
elapsed: 8분 2초
status: completed
---
구현 완료. 두 가지 산출물:

**서버 — `src/lib/status-manager.ts`**
- `checkCodexTuiReady()` private 메서드 추가: Layer 1(`isAgentRunning`, caller 캐시 재사용) → Layer 2(`paneTitle` shell-style 차단) → Layer 3(`capturePaneAtWidth`로 composer 박스 `╭`/`╰` + 마커 `›`/`!` 검사).
- `poll()` 루프 내 `AGENT_GUARDED_STATES` 가드 직후 `inactive` + `panelType === 'codex-cli'` 분기 추가 — 통과 시 `updateTabFromHook(session, 'session-start')` 합성 발사. `lastResumeOrStartedAt` 갱신은 `updateTabFromHook` 기존 경로가 처리. cliState='idle' 도달 후엔 분기에 안 들어감(idempotent).
- 비용: Layer 1 false면 즉시 short-circuit → 미실행 codex 탭 ~5ms/사이클. Layer 1+2 통과해야만 ~30-50ms `capturePaneAtWidth` 호출.

**클라이언트 — `src/components/features/workspace/codex-boot-progress.tsx`**
- `<CodexBootProgress />` 컴포넌트: spinner(`OpenAIIcon` + `motion-safe:animate-spin`) + 메인 메시지 + skeleton bar 3줄.
- 내부 elapsed 타이머: 0–2s "Codex 시작 중..." → 2–5s "거의 다 됐어요..." → 5s+ 에러 상태(`AlertCircle` + Restart/Show terminal 버튼, 콜백 옵셔널).
- a11y: `role="status"`+`aria-busy`+`aria-live="polite"`, `motion-reduce` 변형, 에러 상태 `role="alert"`.
- i18n: ko/en + 9개 locale (영문 fallback)에 7개 key 추가.

Phase 2 `codex-panel-ui`에서 `cliState='inactive' && agentProcess===true`일 때 마운트하면 됨.

타입체크/린트 모두 통과.

다음 feature를 빌드하려면 `/new` 후 `/4-build`를 실행하세요.
(컨텍스트를 정리하고 새로운 세션에서 더 정확한 코드를 생성합니다)
