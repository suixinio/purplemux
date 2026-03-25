---
page: task-checklist-ui
title: Task 체크리스트 UI
route: /
status: DETAILED
complexity: Medium
depends_on:
  - .specs/v17/features/task-progress-parser/spec.md
  - docs/STYLE.md
created: 2026-03-25
updated: 2026-03-25
assignee: ''
---

# Task 체크리스트 UI

## 개요

타임라인 entries에서 `task-progress` 엔트리를 수집하여 task 상태를 누적 관리하고, 타임라인 상단에 sticky 체크리스트로 표시한다. 진행 중인 task를 한눈에 파악하고 완료율을 확인할 수 있다.

## 주요 기능

### 상태 파생 (`hooks/use-timeline.ts` 확장)

- `useMemo`로 entries에서 `task-progress` 엔트리만 필터링하여 `ITaskItem[]` 생성
- `action: 'create'` → 등장 순서대로 taskId `"1"`, `"2"`, `"3"` 할당, status `'pending'`
- `action: 'update'` → `taskId`로 매칭하여 status 변경
- return 값에 `tasks: ITaskItem[]` 추가
- 세션 변경 시 entries 초기화에 따라 자동 리셋

### 체크리스트 컴포넌트 (`components/features/timeline/task-checklist.tsx`)

#### 표시 조건

- `tasks.length === 0` → 렌더링하지 않음 (task 없는 세션에 영향 없음)
- 전부 completed + CLI idle → 3초 후 자동 접힘 (`collapsed`)
- 새 task 추가 또는 status 변경 시 자동 펼침

#### 헤더

- 진행률: `CheckCircle2` 아이콘 + `완료 수 / 전체 수` (예: `2 / 4`)
- 전부 완료 시 아이콘 `text-positive`, 진행 중이면 `text-ui-purple`
- 접기/펼치기: `ChevronDown` 아이콘, 회전 애니메이션 (`duration-200`)
- 접힌 상태: 현재 `in_progress` 항목의 subject를 한 줄로 표시 (없으면 마지막 pending의 subject)

#### 체크리스트 목록

| 상태 | 아이콘 | 텍스트 |
| ---- | ------ | ------ |
| `completed` | `CheckCircle2` size=14 `text-positive` | `text-muted-foreground line-through` |
| `in_progress` | 펄스 닷 (`animate-pulse bg-ui-purple` 6px 원) | `text-foreground font-medium` |
| `pending` | 빈 원 (border 1px `border-muted-foreground/40` 14px) | `text-muted-foreground` |

- 각 항목: 아이콘 + subject 텍스트 (한 줄, truncate)
- 항목 간 간격: `gap-0.5`, 각 항목 `py-0.5`

#### 스타일

- sticky 배치: 타임라인 `contentRef` 내부 첫 번째 요소
- 배경: `bg-muted/30 backdrop-blur-sm`
- 좌측 보더: `border-l-2`
  - in_progress 있으면 `border-ui-purple`
  - 전부 완료면 `border-positive`
  - 전부 pending이면 `border-muted-foreground/40`
- 패딩: `px-4 py-2`
- 목록 max-height: `max-h-[240px] overflow-y-auto`
- 등장 애니메이션: `animate-in fade-in slide-in-from-top-1 duration-200`

#### 자동 접힘 로직

- 조건: 모든 task가 `completed` + `cliState === 'idle'`
- 3초 타이머 시작 → 타이머 만료 시 `collapsed = true`
- 타이머 진행 중 새 task 추가 또는 cliState 변경 시 타이머 취소

### 타임라인 축약 표시 (`timeline-view.tsx`)

- `TimelineEntryRenderer`에서 `task-progress` 엔트리 처리 추가
- 축약 표시: 상태 아이콘 + subject 한 줄 (task-checklist과 동일 아이콘, `text-xs text-muted-foreground`)
- tool-call 그룹 사이에 자연스럽게 배치 (groupTimelineEntries에서 tool-group 외 entry로 처리)

### timeline-view 통합

- `TimelineView` props에 `tasks: ITaskItem[]` 추가
- `contentRef` 내부 첫 번째에 `TaskChecklist` 배치
- `cliState`를 TaskChecklist에 전달 (자동 접힘 판단용)

### 모바일 대응

- 동일 컴포넌트 사용 (별도 분기 없음)
- sticky 배치 + max-height 스크롤로 화면 점유 최소화

### 인터랙션 피드백

- task 상태 변경 시 해당 항목의 아이콘이 즉시 전환
- in_progress 항목의 펄스 닷으로 "진행 중" 시각적 신호
- 전부 완료 시 좌측 보더가 purple → positive로 전환
- 접힘/펼침 전환: `ChevronDown` 회전 + 목록 영역 height 애니메이션

### 접근성

- 체크리스트 컨테이너: `role="list"`, `aria-label="Task 진행 상황"`
- 각 항목: `role="listitem"`
- 접기/펼치기 버튼: `aria-expanded`, `aria-controls`
- 진행률 텍스트: `aria-live="polite"` (상태 변경 시 스크린 리더 알림)

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-03-25 | 초안 작성 | DRAFT |
