# 화면 구성

> 본 feature는 timeline-server 내부 jsonl 파서로 직접 UI는 없다. 파서 출력이 timeline-view에 어떻게 흘러가는지만 정리.

## 1. 출력 ITimelineEntry → UI 컴포넌트 매핑

`codex-timeline-integration` feature가 정의하는 8 신규 컴포넌트 + 기존 12 재사용:

| 파서 출력 entry type | UI 컴포넌트 | 출처 RolloutItem |
| --- | --- | --- |
| `user-message` | `user-message-item` (기존) | `event_msg.user_message` |
| `assistant-message` | `assistant-message-item` (기존) | `event_msg.agent_message` 또는 `response_item.message(assistant)` |
| `reasoning-summary` | `reasoning-summary-item` (신규) | `response_item.reasoning.summary[]` |
| `error-notice` | `error-notice-item` (신규) | `event_msg.Error/Warning/StreamError/GuardianWarning` |
| `tool-call` / `tool-result` | `tool-call-item` (기존) | `response_item.function_call[_output]` |
| `task-progress` / `task-notification` | `task-checklist-item` (기존) | `event_msg.PlanUpdate` |
| `plan` | `plan-item` (기존) | `event_msg.EnteredReviewMode/ExitedReviewMode` |
| `ask-user-question` | `ask-user-question-item` (기존) | `event_msg.RequestUserInput` |
| `interrupt` | `interrupt-item` (기존) | `event_msg.TurnAborted` |
| `session-exit` | `session-exit-item` (기존) | `event_msg.ShutdownComplete` |
| `turn-end` | `turn-end-item` (기존) | `event_msg.TurnComplete` |
| `approval-request` | `approval-request-item` (신규) | `ExecApprovalRequest`/`ApplyPatchApprovalRequest`/`RequestPermissions` |
| `exec-command-stream` | `exec-command-stream-item` (신규) | `ExecCommandBegin/Delta/End` 묶음 |
| `web-search` | `web-search-item` (신규) | `WebSearchBegin/End` |
| `mcp-tool-call` | `mcp-tool-call-item` (신규) | `McpToolCallBegin/End` |
| `patch-apply` | `patch-apply-item` (신규) | `PatchApplyBegin/Updated/End` |
| `context-compacted` | `context-compacted-item` (신규) | `event_msg.ContextCompacted` |

## 2. 미발사 entry (Codex 전용 분기 영역)

| 미발사 type | 이유 |
| --- | --- |
| `agent-group` | Claude sub-agent sidechain — Codex에 없음 |
| `thinking` | Codex는 별도 `reasoning-summary` 발사 (Claude UX 회귀 0 위해 분리) |

## 3. 파서 → 클라이언트 dispatch 흐름

```
Codex jsonl 라인 추가
  ↓ fs.watch
timeline-server 인스턴스 (1 jsonl당 1 인스턴스)
  ↓ session-parser-codex.parseIncremental()
ITimelineEntry[] (in-flight 묶음 처리 후)
  ↓ broadcastToWatcher
WebSocket 'timeline:append'
  ↓
클라이언트 timeline-view
  ↓ TimelineEntryRenderer switch
8 신규 컴포넌트 + 12 기존 컴포넌트 렌더
```

## 4. 빈 / 로딩 / 에러 상태 (파서 관점)

| 상태 | 사용자 표시 |
| --- | --- |
| jsonl 빈 파일 | timeline 빈 상태 ("아직 메시지가 없습니다" — `codex-timeline-integration` 정의) |
| 파서 라인 1개 실패 | 해당 라인 skip + `error-notice` entry 1개 발사 (사용자가 보고 가능) |
| 파서 throw (예상 외) | `logger.error` + 마지막 처리 offset 유지 → 다음 사이클 재시도 |
| in-flight 누락 (Begin 후 End 안 옴) | 다음 turn 시작 시 stale 처리 + `error-notice` 발사 |

## 5. 디버그 표시 (옵션 — v19 외부 가능)

설정 → 디버그 패널:

- 파서 인스턴스 수 + 각 인스턴스의 마지막 처리 offset
- in-flight Map 크기 + 가장 오래된 begin call_id
- 파싱 실패 라인 누적 카운트

## 6. 파서가 timeline-view groupedItems에 영향 없음

`timeline-view.tsx:85-110 groupedItems()` 변경 0:

- begin/delta/end 묶음은 파서 책임 (in-flight Map 활용)
- 파서가 단일 entry로 변환 후 `ITimelineEntry[]` 발사
- groupedItems는 sub-agent grouping 등 기존 로직만 유지
