---
page: codex-timeline-integration
title: Codex 타임라인 통합 (8개 신규 엔트리 + 컴포넌트 + Provider 분기)
route: (Codex/Claude 패널 timeline-view)
status: DETAILED
complexity: High
depends_on:
  - docs/STYLE.md
  - docs/STATUS.md
created: 2026-05-01
updated: 2026-05-01
assignee: ''
---

# Codex 타임라인 통합

## 개요

Codex jsonl 파서 출력을 timeline-view에 그릴 수 있도록 `ITimelineEntry`에 8개 신규 타입을 추가하고, 1:1 컴포넌트 8개를 신설한다. 기존 12개 컴포넌트는 호환 유지, timeline-view switch에 8 case만 추가. timeline-server가 jsonl path로 provider 검출 후 파서 라우팅한다. Phase 2 placeholder 자리에 정식 timeline 마운트.

## 주요 기능

### 1. ITimelineEntry 8개 신규 타입

기존 13개 타입 호환 유지. `assistant-message.usage` 필드 일반화 (optional).

| 신규 타입 | 용도 |
| --- | --- |
| `approval-request` | Codex 권한 요청 timeline 후행 표시 (실시간은 hook + permission-prompt-item) |
| `exec-command-stream` | Begin/Delta/End 묶음 + collapsed/expanded stdout |
| `web-search` | WebSearchBegin/End 묶음 + 결과 요약 |
| `mcp-tool-call` | McpToolCallBegin/End + MCP server 이름 |
| `patch-apply` | Begin/Updated/End + diff 표시 (기존 ToolCall diff 컴포넌트 재사용) |
| `context-compacted` | Codex `ContextCompacted` — Claude pre/post-compact와 동일 시각 트리트먼트 |
| `reasoning-summary` | **Codex 전용** — `summary[]` 텍스트만 표시 + "Reasoning hidden" 안내 (encrypted_content 미해독) |
| `error-notice` | **Codex 전용** — `Error`/`Warning`/`StreamError`/`GuardianWarning` 흡수. `severity` 필드 분기 |

### 2. 분기 영역 (Claude 전용 유지)

- **`agent-group`**: Claude sub-agent sidechain. Codex 파서는 발사 안 함
- **`thinking` vs `reasoning-summary` 분리**:
  - Claude `thinking`: 현재 timeline에 미표시 정책 유지 (기존 동작 무변경, UX 회귀 0). 파서는 entry 발사하되 timeline-view switch가 case 없어 dispatch 안 됨
  - Codex `reasoning`: 새 type `reasoning-summary`로 분리. `summary[]` 텍스트만 표시 + "Reasoning hidden" 안내
  - **이유**: 한 type 안에서 분기하면 Claude UX 변경 위험. type 분리가 PRD 공통화 정책의 "분기 영역"에 부합

### 3. 신규 8개 컴포넌트

각 타입에 1:1, `src/components/features/timeline/` 위치:

- **`approval-request-item.tsx`** — codex 권한 요청 timeline 후행 표시
- **`exec-command-stream-item.tsx`** — Begin/Delta/End 묶음 + collapsed/expanded stdout
- **`web-search-item.tsx`** — Begin/End 묶음 + 결과 요약
- **`mcp-tool-call-item.tsx`** — Begin/End + MCP server 이름
- **`patch-apply-item.tsx`** — Begin/Updated/End + diff (기존 ToolCall diff 컴포넌트 재사용)
- **`context-compacted-item.tsx`** — Claude pre/post-compact와 동일 시각 트리트먼트
- **`reasoning-summary-item.tsx`** — Codex `summary[]` 텍스트 + "Reasoning hidden" 안내
- **`error-notice-item.tsx`** — `severity` 필드로 분기:
  - `error`: 빨간 배경+아이콘
  - `warning`: 노란
  - `stream-error`: 노란 + `retryStatus` 배지
  - `guardian-warning`: 보라 (가디언 컨텍스트)
  - 디버깅 가능하도록 message 전체 표시 + collapsed/expanded 토글

### 4. timeline-view.tsx 변경 (3곳)

`src/components/features/timeline/timeline-view.tsx`:

1. **Line ~17-22 import 영역**: 신규 8개 컴포넌트 import
2. **Line ~134-155 `TimelineEntryRenderer` switch**: 8개 case 추가
3. **Line ~85-110 `groupedItems()`**: **변경 없음** — begin/delta/end 묶음은 파서 책임

기존 12개 컴포넌트는 ITimelineEntry 확장에 영향 없음 (호환 유지).

### 5. timeline-server provider 분기

- jsonl path로 provider 검출:
  - `~/.claude/projects/...` → Claude 파서 라우팅
  - `~/.codex/sessions/...` → Codex 파서 라우팅
- WebSocket protocol 변경 없음 (output `ITimelineEntry`/`TTimelineServerMessage` 동일)
- incremental 파싱 동일 패턴
- **Codex 파서 책임**: ExecCommand/WebSearch/McpToolCall/PatchApply의 begin/delta/end를 단일 entry로 변환 (timeline-view groupedItems 손대지 않음)

### 6. CodexPanel placeholder 제거

- Phase 2의 placeholder 자리에 정식 `TimelineView` 마운트
- ClaudeCodePanel과 **동일 props**로 통합 가능
- 모바일 패리티: Desktop과 동일 timeline 컴포넌트 재사용 → MobileCodexPanel placeholder도 자동 풀 timeline 표시

### 7. 모바일 작성 주의

- `exec-command-stream-item` expanded stdout: `overflow-x-auto` 또는 word-break (긴 stdout mobile에서 깨짐 방지)
- `approval-request-item` 버튼: `min-h-11` (44px 터치 타겟)
- `patch-apply-item` diff: 기존 ToolCall diff 컴포넌트 재사용 (mobile 검증 완료된 패턴)
- 신규 7개 컴포넌트는 기존 timeline 컴포넌트 반응형 패턴(`min-w-0 flex-1`, `shrink-0`, `truncate`) 따르면 별도 mobile 컴포넌트 불필요

### 8. UX 완성도 — 토스급

- **빠르다**:
  - virtual scroll (이미 timeline-view 적용됨) — 신규 컴포넌트도 동일 가상화 영향권
  - 컴포넌트 lazy import는 적용 안 함 (timeline 한 화면 내 다종 entry 동시 렌더 — 8개 신규 동시 import 비용 무시 수준)
- **로딩/빈/에러 상태**:
  - 로딩: skeleton entry (3개)
  - 빈: "아직 메시지가 없습니다"
  - 에러: parser 실패 entry는 `error-notice` 타입으로 흡수 → 사용자가 보고 가능
- **인터랙션**:
  - exec-command-stream stdout 토글: 부드러운 height transition (200ms)
  - patch-apply diff 토글: 동일 transition
  - error-notice expand/collapse: 동일 transition
- **전환 애니메이션**:
  - 새 entry append 시 fade-in (150ms ease-out) — 갑자기 튀어나오지 않음
  - 자동 scroll-to-bottom (사용자가 위로 스크롤 중이면 disabled — 이미 패턴 적용)

### 9. 회귀 검증 (수동)

- 풀 turn (reasoning + tool-call + agent-message) 정상 렌더
- exec_command stream + 긴 stdout (collapsed → expanded 정상)
- web-search 결과 요약 표시
- mcp tool 호출 + 결과
- patch-apply multi-file diff 표시
- approval-request 각 종류 (Exec/ApplyPatch/RequestPermissions)
- error-notice 4 severity 시각 구분
- Claude 패널 무회귀 (`thinking` 미표시, `agent-group` 정상)

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-05-01 | 초안 작성 | DRAFT |
| 2026-05-01 | 상세 문서 작성 (ui/flow/api) | DETAILED |
