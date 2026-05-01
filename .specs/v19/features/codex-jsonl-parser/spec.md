---
page: codex-jsonl-parser
title: Codex JSONL 파서
route: (서버 내부 — timeline-server)
status: DRAFT
complexity: High
depends_on:
  - docs/STATUS.md
  - docs/DATA-DIR.md
created: 2026-05-01
updated: 2026-05-01
assignee: ''
---

# Codex JSONL 파서

## 개요

`~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`의 RolloutItem 라인을 `ITimelineEntry`로 변환하는 신규 파서 모듈(`src/lib/session-parser-codex.ts`, 예상 ~700-900줄). Claude 파서와 입력 형식이 매우 달라 강제 공통화는 부작용 → 별도 모듈 유지. 출력 타입(`ITimelineEntry`/`TTimelineServerMessage`)은 동일.

## 주요 기능

### 1. 형식 비교 (실데이터 기반)

| 측면 | Claude | Codex |
| --- | --- | --- |
| 라인 구조 | `{ uuid, parentUuid, type, message: { content[] } }` | `{ timestamp, type, payload: { type, ... } }` |
| 트리 vs 평탄 | UUID/parentUuid **트리** (sub-agent sidechain) | 단순 **linear** |
| Top-level types | `user`/`assistant`/`system`/`summary` | `session_meta`/`response_item`/`event_msg`/`compacted`/`turn_context` |
| Tool 호출 | content[`tool_use`/`tool_result`] | `response_item.function_call`/`function_call_output` |
| Reasoning | content[`thinking`] (평문) | `response_item.reasoning` (`encrypted_content` + `summary`) |
| Token 추적 | 라인별 누적 합산 | `event_msg.token_count.info.total_token_usage` (이미 누적) |

### 2. RolloutItem → ITimelineEntry 매핑

| ITimelineEntry | Codex 출처 |
| --- | --- |
| `user-message` | `event_msg.user_message` |
| `assistant-message` | `event_msg.agent_message` 또는 `response_item.message(assistant)` |
| `reasoning-summary` (신규) | `response_item.reasoning` — `summary[]`만 표시 ("Reasoning hidden" 안내, encrypted_content 미해독) |
| `error-notice` (신규) | `event_msg.Error` / `Warning` / `StreamError` / `GuardianWarning` 흡수 |
| `tool-call` | `response_item.function_call` (id ↔ call_id) |
| `tool-result` | `response_item.function_call_output` |
| `task-progress` / `task-notification` | `event_msg.PlanUpdate` |
| `plan` | `event_msg.EnteredReviewMode` / `ExitedReviewMode` |
| `ask-user-question` | `event_msg.RequestUserInput` |
| `interrupt` | `event_msg.TurnAborted` |
| `session-exit` | `event_msg.ShutdownComplete` |
| `turn-end` | `event_msg.TurnComplete` |
| `approval-request` (신규) | `ExecApprovalRequest`, `ApplyPatchApprovalRequest`, `RequestPermissions` |
| `exec-command-stream` (신규) | `ExecCommandBegin` / `Delta` / `End` 묶음 |
| `web-search` (신규) | `WebSearchBegin` / `End` |
| `mcp-tool-call` (신규) | `McpToolCallBegin` / `End` |
| `patch-apply` (신규) | `PatchApplyBegin` / `Updated` / `End` |
| `context-compacted` (신규) | `event_msg.ContextCompacted` |

`agent-group`(Claude 전용 sidechain), `thinking`(Claude 전용)은 발사하지 않음.

### 3. In-flight tracking 패턴

ExecCommand/WebSearch/McpToolCall/PatchApply의 begin/delta/end를 단일 entry로 묶어 timeline-view `groupedItems`를 손대지 않음 (파서 책임).

- **ExecCommand**: `Begin(call_id)` → 빈 stdout buffer 시작 → 각 `Delta(call_id, chunk)` append → `End(call_id, exit_code)` flush → 단일 `ITimelineExecCommandStream` entry 발사
- **WebSearch / McpToolCall**: `Begin(call_id)` → `End(call_id, result)` → 단일 entry
- **PatchApply**: `Begin(call_id)` → `Updated(call_id, ...)` → `End(call_id, success)` → 단일 entry
- in-flight Map은 파서 인스턴스 내부 state — incremental parsing 사이에 유지 필요

### 4. assistant-message.usage 분기

- Claude: 라인별 Anthropic usage (input_tokens, output_tokens, cache_*)
- Codex: 라인 자체엔 token usage 없음 → session-level `token_count` event에서 별도 산출
- **해결**: `usage`를 optional 유지. Codex assistant-message는 usage undefined로 두고, session-stats(`ISessionStats`)에서 별도 노출

### 5. Incremental 파싱

- Claude 파서의 `parseIncremental()` 동일 패턴 — 마지막 처리 offset 기억 → 새 라인만 처리
- in-flight Map은 파서 인스턴스가 살아있는 동안 유지 (각 jsonl 파일당 1 인스턴스)

### 6. 테스트 전략

Claude 파서(`session-parser.ts`, 1092줄)와 **동일 수준 — 자동 테스트 없음**. 회귀 검증은 수동 시나리오로 진행.

- 풀 turn (reasoning + tool-call + agent-message) 표시
- exec_command stream (긴 stdout, exit 비0)
- web-search 호출 + 결과
- mcp tool 호출
- patch-apply (multi-file diff)
- approval-request (각 종류별)
- error-notice 4종 (`Error`/`Warning`/`StreamError`/`GuardianWarning`) 시각 분기
- /clear 후 새 jsonl 파일에서 in-flight Map 정상 reset

향후 회귀 발생 시 fixture 기반 단위 테스트(`tests/unit/lib/session-parser-codex.test.ts`) 추가는 별도 결정.

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-05-01 | 초안 작성 | DRAFT |
