---
step: build
timestamp: 2026-05-01 18:26
elapsed: 13분 3초
status: completed
---
코드 작성을 완료했습니다.

## 요약

### 추가된 파일
- `src/lib/providers/codex/preflight.ts` — `runCodexPreflight()` (60s TTL 메모리 캐시 + `codex-preflight` logger)
- `src/lib/codex-notifications.ts` — A/C/D/E 케이스 클라이언트 토스트 헬퍼 (sonner `id` 기반 dedup, session-storage `codex-config-warned-once`)
- `src/components/features/login/codex-install-guide-dialog.tsx` — Install 가이드 모달 (npm/brew 명령 복사 + GitHub 링크)

### 수정된 파일
- `src/types/preflight.ts` — `IPreflightResult.codex` (path 포함), `IRuntimePreflightResult.codex` 필드 추가. `isRuntimeOk` 영향 없음.
- `src/lib/preflight.ts` — `getPreflightStatus`/`getRuntimePreflightStatus`에서 codex 병렬 호출, `invalidateRuntimeCache()`가 codex 캐시도 무효화.
- `src/lib/hook-settings.ts` — codex script write 실패는 `codex-hook` logger로 분리 (B 케이스).
- `src/lib/providers/codex/hook-config.ts` — logger를 `codex-config`로 변경, 시스템 토스트 메시지/액션 라벨을 spec에 맞춰 정정 (C 케이스).
- `src/lib/providers/codex/hook-handler.ts` — logger를 `codex-runtime`로 변경 (D/E 케이스 서버 측).
- `src/lib/auto-resume.ts` — codex provider가 등록되면 미설치 시 `Skip resume for codex tab ...` 로그 후 skip.
- `src/pages/tools-required.tsx` — 도구 목록 아래 OpenAIIcon + Codex (optional) 행 추가, 미설치 시 "설치 가이드" 버튼 → 모달.
- `messages/<11 locales>/terminal.json` — codex 토스트 키 (`codexNotInstalled`, `codexLaunchFailed`, `codexResumeFailed`, `codexApprovalSendFailed`, `codexApprovalNotApplied`, `codexConfigParseFailed`, `codexCopyCommand`, `codexCopyConfigPath`, `codexCopied`, `codexRetry`).
- `messages/<11 locales>/toolsRequired.json` — preflight 페이지 라벨 (`codexLabel`, `codexOptional`, `codexInstalled`, `codexNotInstalledLabel`, `codexInstallGuide`, `codexInstallGuideTitle`, `codexInstallNpm`, `codexInstallBrew`).

### 스코프 외 (sibling features 담당)
- 메뉴 항목 "Codex 새 대화/세션 목록" disabled — `codex-provider-core` 작업분
- CodexPanel `agentInstalled:false` 빈 상태 — `codex-panel-ui` 작업분
- D/E 클라이언트 토스트 호출부 — `codex-panel-ui` / `codex-permission-prompt` 작업분 (헬퍼 + i18n 키만 미리 준비)

### 검증
- `pnpm tsc --noEmit` ✅
- `pnpm lint` ✅

다음 feature를 빌드하려면 `/new` 후 `/4-build`를 실행하세요.
(컨텍스트를 정리하고 새로운 세션에서 더 정확한 코드를 생성합니다)
