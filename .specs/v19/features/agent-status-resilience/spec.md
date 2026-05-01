---
page: agent-status-resilience
title: Agent 상태 견고성 강화 (ping-pong 방지 + Store 일반화)
route: (서버 내부 + 클라이언트 스토어)
status: DETAILED
complexity: High
depends_on:
  - docs/STATUS.md
  - docs/TMUX.md
created: 2026-05-01
updated: 2026-05-01
assignee: ''
---

# Agent 상태 견고성 강화

## 개요

Codex 도입 과정에서 발견된 status 회귀 시나리오를 차단하고, Claude 잠재 버그도 함께 견고화한다. 또한 두 provider를 1급 시민으로 두기 위해 store 필드를 `agent*` prefix로 일반화한다.

### 해결할 회귀 시나리오

- **S1 (부팅 윈도우)**: auto-resume 직후 codex Rust binary 부팅 1-2초 동안 process 미감지 → cliState busy/idle ↔ inactive ping-pong
- **S2 (fork/exec 순간)**: codex가 잠깐 자식 프로세스 fork/exec 하는 폴링 사이클에서 false negative
- **S3 (정상 종료)**: 사용자 `/quit`/`/exit` 후 shell 복귀는 inactive 정상 전환되어야 함
- **send-keys atomic burst**: `tmux send-keys cmd Enter` 단일 호출은 codex가 줄바꿈 포함 paste로 오인

## 주요 기능

### 1. Agent 종료 복귀 — F1/F2 fallback

poll 사이클마다 `isAgentRunning` false && cliState ≠ 'inactive'/'unknown'면 'inactive' 전환. **단 두 가지 fallback 조건 중 하나라도 통과 시 skip**.

- **F1 (Recent-launch grace 5초)**:
  - `entry.lastResumeOrStartedAt` 타임스탬프 신설 (status-manager 런타임 only — 디스크 저장 불필요)
  - 갱신 시점:
    1. `auto-resume.ts` `sendResumeKeys` 직후
    2. SessionStart hook 수신 시 (synthetic + real 둘 다)
  - `now - stamp < 5000`이면 skip → S1 차단

- **F2 (Pane title이 여전히 agent 형식)**:
  - `paneTitle && !/^[^|]+\|[^|]+$/.test(paneTitle)` (shell 형식 `cmd|path` 아님)
  - paneTitle은 이미 폴링 사이클에서 호출 중(`status-manager.ts:633`) → 추가 호출 없음
  - S2 차단

- **S3 (정상 종료)는 정상 작동**:
  - 사용자 `/quit` (codex) 또는 `/exit` (claude) → process exit → shell 복귀
  - tmux `set-titles-string "#{pane_current_command}\|#{pane_current_path}"` (`tmux.conf:67-68`) 자동 발동 → title 즉시 `zsh|/path` 형식
  - F2 통과 안 함 → 정상 inactive 전환
  - Edge case: 종료 직후 vim 같은 alternate screen TUI 즉시 실행 시 1 polling cycle(30s) 동안 cliState='idle' 잔재 가능 — 빈도 낮아 무시

- **Claude/Codex 공통 적용**: 기존 Claude의 잠재 ping-pong(busy stuck 외 일반 종료 미처리)도 함께 견고화

### 2. send-keys 분리 헬퍼

`tmux send-keys cmd Enter`는 단일 tmux 호출 내 sequential PTY write라 한 chunk로 도달 가능성 높음 → codex가 paste burst로 오인.

- `sendKeysSeparated(session, cmd)` 헬퍼 신설 — text 송신 후 50ms 후 별도 Enter 송신
- 적용 사이트:
  - WebInputBar (`web-input-bar.tsx:236-237`) — 이미 검증된 50ms 분리 패턴
  - auto-resume (codex resume 명령)
- 기존 `sendKeys` 호출자는 모두 shell이 받는 경로라 50ms 분리 영향 없음 → 무조건 도입 가능

### 3. Store 일반화 — `claudeProcess` → `agentProcess`

절반만 일반화하면 Phase 2 CodexPanel이 두 패턴 혼용 → 어색. `agentSessionId`/`agentProviderId`/`agentSummary` 등 신규 컨벤션과 일관성을 위해 Phase 1 즉시 rename.

| 기존 | 신규 |
| --- | --- |
| `claudeProcess: boolean \| null` | `agentProcess: boolean \| null` |
| `claudeProcessCheckedAt: number` | `agentProcessCheckedAt: number` |
| `claudeInstalled: boolean` | `agentInstalled: boolean` |
| `setClaudeProcess(...)` | `setAgentProcess(...)` |
| `setClaudeInstalled(...)` | `setAgentInstalled(...)` |

**변경 사이트 (~10곳, 일괄 rename)**:
- `use-tab-store.ts:17-68,123-142`
- `pane-container.tsx:200,345,655,663,726,732`
- `claude-code-panel.tsx:51-52,92,113-116,134,147-154,170,188,244`
- `mobile-claude-code-panel.tsx:71-72,107,128-131`
- `mobile-surface-view.tsx:137,203,392,398`

신규 `codex-panel.tsx`/`mobile-codex-panel.tsx`는 처음부터 `agentProcess`/`agentInstalled` 사용. 예정 작업의 `AgentPanel` 단일 컴포넌트 통합 시 자연 흡수.

### 4. matchesProcess(cmd, args?) 시그니처 확장

두 provider 모두 `node`가 직접 자식이라 args(`claude.js` vs `codex.js`)로 disambiguation.

- `getProviderByProcessName` 호출 사이트 (`auto-resume.ts:62` 등)에 args 전달
- Claude/Codex 양쪽 implementation에서 args 분기

### 5. 회귀 검증 (수동)

- S1: auto-resume 직후 5초 동안 cliState 안정 유지 (busy/idle 잔재 OK, inactive 회귀 X)
- S2: 폴링 사이클 한 번 fork/exec 흉내 (강제 polling) — 상태 흔들림 X
- S3: codex `/quit` → 5초 후 cliState='inactive' 전환 (Claude `/exit` 동일)
- send-keys: codex 입력란에 긴 텍스트 + Enter → 줄바꿈 포함 paste 오인 X

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-05-01 | 초안 작성 | DRAFT |
| 2026-05-01 | 상세 문서 작성 (ui/flow/api) | DETAILED |
