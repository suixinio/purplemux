---
step: verify-1
timestamp: 2026-05-01 18:36
elapsed: 9분 13초
status: patched
round: 1/3
---
## 검증 결과: codex-preflight-and-errors (Round 1)

### 구현 완료 항목 (in-scope)
- `IPreflightResult.codex` 필드 + `IRuntimePreflightResult.codex` (isRuntimeOk엔 미포함)
- `runCodexPreflight()` + 60s TTL 메모리 캐시 + `codex --version` 호출
- preflight 통합 (`getPreflightStatus`/`getRuntimePreflightStatus` 병렬 + 캐시 무효화)
- B 케이스 (hook script write 실패): `codex-hook` logger.error + 부트 1회 system toast
- C 케이스 (config.toml 파싱 실패): `codex-config` logger.warn + first-use 1회 system toast (서버 dedup)
- 토스트 헬퍼 6종 (A/C/D/E) — `src/lib/codex-notifications.ts`
- preflight 페이지 codex 섹션 + Install 가이드 모달 (npm/brew 복사 + GitHub 링크)
- auto-resume에서 codex 미설치 시 skip + log
- logger 4분리 (`codex-preflight`/`codex-hook`/`codex-config`/`codex-runtime`)

### 보완한 항목
- **`codexHookInstallFailed` i18n 키 누락 → 11개 로케일에 추가** (한국어 1개, 영문 10개)

### 누락/불일치 항목 (인프라 작업으로 분리 권장)
- system toast i18n 미적용: `enqueueSystemToast`가 사전 번역된 message를 push하고 client는 key로 번역하지 않아 B/C 시스템 토스트가 모든 로케일에서 한국어 노출. 본 feature 단독 보완 시 다른 system toast와 정합성이 깨지므로 별도 인프라 작업 필요.

### 스코프 외 (sibling features 담당)
- 메뉴 항목 disabled + 클릭 토스트 → `codex-provider-core`
- CodexPanel 빈 상태 → `codex-panel-ui`
- D/E 토스트 호출부 → `codex-panel-ui` / `codex-permission-prompt` (헬퍼는 본 feature에서 제공 완료)

### 요약
- 전체 항목: 30+
- 구현 완료: 30+
- 누락/불일치 (in-scope): 0 (보완 후)
- 보완 완료: 1 (i18n 키 × 11 로케일)
- 인프라 작업으로 분리: 1
- tsc ✅ / lint ✅

보완이 완료되었습니다.
재검증하려면 `/new` 후 `/5-verify`를 다시 실행하세요.
(컨텍스트를 정리하고 새로운 세션에서 더 정확한 검증을 수행합니다)
