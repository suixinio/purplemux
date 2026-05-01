---
page: codex-preflight-and-errors
title: Codex Preflight 및 에러 표면화 정책
route: (Preflight 페이지 + 토스트 + 패널 인라인)
status: DRAFT
complexity: Medium
depends_on:
  - docs/DATA-DIR.md
  - docs/STYLE.md
  - docs/STATUS.md
created: 2026-05-01
updated: 2026-05-01
assignee: ''
---

# Codex Preflight 및 에러 표면화 정책

## 개요

Codex는 optional provider — 미설치 환경에서 Claude만 정상 동작 보장. Claude의 기존 표면화 패턴(전체 페이지 차단 / 토스트 / silent log 3단계)과 일관성 유지하되 전체 페이지 차단은 안 쓰고 메뉴 disabled + 패널 안내 + 토스트 조합으로 표면화.

## 주요 기능

### 1. Preflight 통합 — `IPreflightResult.codex` 필드

- 새 필드: `codex: { installed: boolean; version: string | null; path: string | null }`
- Codex 미설치라도 `isRuntimeOk` 영향 없음 (Codex optional)
- `providers/codex/preflight.ts`에서 `codex --version` 호출. 미설치 시 installed:false + path/version null
- preflight 페이지에서 Claude와 시각적 동일 트리트먼트 (회색 배경 + Install 가이드 링크)

### 2. 5개 에러 케이스 표면화

| 케이스 | 표면화 방식 | 비고 |
| --- | --- | --- |
| **A. codex CLI 미설치** | (1) `pane-new-tab-menu`의 "Codex 새 대화"/"Codex 세션 목록" 항목 disabled + tooltip "Codex CLI가 설치되어 있지 않습니다" (2) 클릭 시 install 안내 토스트 (3) preflight 페이지 codex 섹션 명시(`installed: false` + 시각 트리트먼트 Claude와 동일) (4) 패널 내 안내 (`agentInstalled: false`일 때 빈 상태 + Install 링크 — Claude의 `claudeInstalled` 패턴 미러링) | **4중 다층 노출**. `isRuntimeOk`엔 미포함 |
| **B. `~/.purplemux/codex-hook.sh` 작성/권한 실패** | logger.error + 서버 부트 시 1회 시스템 토스트(sync-server push). 메시지: "Codex hook 설치 실패. codex 상태가 정확하지 않을 수 있습니다." | 부트 1회면 충분 — 영구 배너는 노이즈 |
| **C. 사용자 `~/.codex/config.toml` 파싱 실패 → graceful merge 실패** | logger.warn + 첫 codex 탭 생성 시 1회 토스트 ("config.toml 파싱 실패, purplemux hook만 적용됨"). 우리 entry는 정상 적용됨 강조 | first-use 시점에만 표시. session storage로 dedupe |
| **D. runtime send-keys 실패 (resume / launch / 일반 명령)** | `toast.error('codex launch failed')` / `toast.error('resumeFailed')` — Claude `claude-code-panel.tsx:79-82` 패턴 그대로 미러 | Phase 2 CodexPanel 구현 시 동일 메시지 키 |
| **E. PermissionRequest 응답 send-keys 실패** | `toast.error('approval send failed')` + 재시도 버튼 (UI 상에 Yes/No 버튼 다시 활성화). 추가로 `y`/`n` send 후 3초 내 PermissionRequest 상태가 풀리지 않으면 토스트 "응답이 codex에 닿지 않았습니다. keymap을 확인하세요" | Phase 2 — `permission-prompt-item.tsx` 수정 |

### 3. logger 컨벤션

- A/B/C는 `createLogger('codex-preflight')` / `createLogger('codex-hook')` / `createLogger('codex-config')` 분리해서 grep 쉽게
- D/E는 client-side 토스트로 끝 (서버 log 별도 필요 없음)

### 4. UX 완성도 — Codex 미설치 시

- 메뉴 disabled 상태에서 단순 회색이 아닌, 클릭 시 설치 안내 토스트 ("Codex CLI를 설치하려면 `npm i -g @openai/codex` 또는 `brew install --cask codex`")
- preflight 페이지에서 Codex 영역 명확히 (Claude와 시각적 동일 트리트먼트, `OpenAIIcon` 사용)
- 패널 내 빈 상태(`agentInstalled: false`): Install 링크 + 가이드 섹션

### 5. auto-resume 통합

auto-resume에서 codex 탭 발견 시 preflight check, 미설치면 skip + log:

```ts
if (panelType === 'codex-cli' && !preflight.codex.installed) {
  logger.info(`Skip resume for codex tab ${tabId}: codex not installed`);
  continue;
}
```

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-05-01 | 초안 작성 | DRAFT |
