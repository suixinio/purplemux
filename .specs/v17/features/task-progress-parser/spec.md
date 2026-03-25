---
page: task-progress-parser
title: Task Progress 파서 및 타입
route: /
status: DETAILED
complexity: Low
depends_on:
  - docs/STATUS.md
created: 2026-03-25
updated: 2026-03-25
assignee: ''
---

# Task Progress 파서 및 타입

## 개요

Claude Code CLI의 `TaskCreate`/`TaskUpdate` 도구 호출을 기존 일반 tool-call이 아닌 전용 `task-progress` 엔트리로 변환한다. 타임라인 파이프라인(파서 → WebSocket → 클라이언트)에 자연스럽게 합류하여 별도 전송 채널이 필요 없다.

## 주요 기능

### 타입 정의 (`types/timeline.ts`)

- `ITaskItem` — 클라이언트에서 누적 관리하는 task 상태 객체
  - `taskId: string` (순서 번호 "1", "2", ...)
  - `subject: string`
  - `description?: string`
  - `status: 'pending' | 'in_progress' | 'completed'`
- `ITimelineTaskProgress` — 파서가 생성하는 타임라인 엔트리
  - `type: 'task-progress'`
  - `action: 'create' | 'update'`
  - `taskId: string` (create 시 빈 문자열 — 클라이언트에서 순서 할당)
  - `subject?: string` (create 시)
  - `description?: string` (create 시)
  - `status: 'pending' | 'in_progress' | 'completed'`
- `TTimelineEntryType` union에 `'task-progress'` 추가
- `ITimelineEntry` union에 `ITimelineTaskProgress` 추가

### 파서 (`lib/session-parser.ts`)

`parseSingleEntry()`의 assistant → tool_use 분기에서:

- `TaskCreate` 감지:
  - `task-progress` 엔트리 생성 (`action: 'create'`, `status: 'pending'`)
  - `subject`, `description` 추출
  - 기존 tool-call 엔트리 **대신** 생성 (중복 방지)
- `TaskUpdate` 감지:
  - `task-progress` 엔트리 생성 (`action: 'update'`)
  - `taskId`, `status` 추출
  - 기존 tool-call 엔트리 **대신** 생성
- `TaskGet`, `TaskList`, `TaskStop` — 기존 tool-call로 처리 (변경 없음)
- tool-result 매칭은 불필요 — task-progress 엔트리에 toolUseId가 없으므로 `mergeToolResults()`에서 자연스럽게 무시

### 서버 전달

- 변경 없음 — `parseIncremental()` → `broadcastToWatcher()`가 이미 모든 엔트리 타입을 전달
- task-progress 엔트리는 기존 `timeline:append` 메시지에 포함되어 전송

### 성능

- 파서에 분기 2개 추가 (TaskCreate/TaskUpdate 문자열 비교) — 무시할 수준
- 엔트리 생성 비용은 기존 tool-call과 동일

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-03-25 | 초안 작성 | DRAFT |
