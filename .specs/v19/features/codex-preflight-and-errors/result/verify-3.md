---
step: verify-3
timestamp: 2026-05-01 18:48
elapsed: 6분 9초
status: verified
round: 3/3
---
## 검증 결과: codex-preflight-and-errors (Round 3)

### 구현 완료 항목 (in-scope)
- `IPreflightResult.codex` (path 포함) + `IRuntimePreflightResult.codex` — `src/types/preflight.ts:6-24`, `isRuntimeOk`엔 미포함
- `runCodexPreflight()` + 60s TTL 메모리 캐시 + `which codex` — `src/lib/providers/codex/preflight.ts:18-55`
- preflight 통합 (병렬 호출 + 캐시 무효화) — `src/lib/preflight.ts:96-101, 156-161, 191-195`
- B 케이스: `codex-hook` logger.error + 부트 1회 system toast — `src/lib/hook-settings.ts:114-120`, `server.ts:387-396`
- C 케이스: `codex-config` logger.warn + 서버 dedup + sessionStorage dedup — `src/lib/providers/codex/hook-config.ts:84-148`, `src/hooks/use-sync.ts:13-32`
- A/C/D/E 토스트 헬퍼 6종 (sonner `id` dedup, 명령어/경로 복사 액션) — `src/lib/codex-notifications.ts`
- preflight 페이지 codex 행 + Install 가이드 모달 — `src/pages/tools-required.tsx:103-128`, `src/components/features/login/codex-install-guide-dialog.tsx`
- auto-resume에서 codex 미설치 시 skip + log — `src/lib/auto-resume.ts:26-39`
- logger 4분리 (preflight/hook/config/runtime)
- 11개 로케일 i18n 키 모두 확인 (terminal.json + toolsRequired.json)

### 보완 항목
이번 라운드에서 새로 보완할 in-scope 항목 없음.

### 미보완 (인프라 분리, Round 1/2와 동일)
- system toast i18n (B/C 메시지가 모든 로케일에서 한국어)
- `preflight:updated` WebSocket 이벤트 (현재는 `useRuntimePreflight` manual `recheck` + 60s TTL)

### 스코프 외 (sibling features)
- 메뉴 disabled → `codex-provider-core`
- 패널 빈 상태 → `codex-panel-ui`
- D/E 호출부 → `codex-panel-ui` / `codex-permission-prompt` (헬퍼는 제공 완료)

### 요약
- 누락/불일치 (in-scope): 0
- tsc ✅ / lint ✅
- 결과는 `.specs/v19/features/codex-preflight-and-errors/result/verify-3.md`에 저장

검증이 완료되었습니다. 보완할 항목이 없어 추가 라운드는 필요하지 않습니다.
