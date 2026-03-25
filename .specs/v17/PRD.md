# v17 요구사항 정리

## 출처

- `.specs/v17/requirements/task-checklist.md`

## 페이지 목록 (도출)

| 페이지 | 설명 | 우선순위 |
| ------ | ---- | -------- |
| timeline 타입 확장 | task-progress 엔트리 타입 추가 | P0 |
| session-parser 확장 | TaskCreate/TaskUpdate tool_use를 task-progress 엔트리로 변환 | P0 |
| use-timeline 확장 | entries에서 task 상태 누적 관리 | P0 |
| task-checklist 컴포넌트 | 체크리스트 UI 렌더링 | P0 |
| timeline-view 통합 | 타임라인 상단에 task-checklist 배치 | P0 |

## 주요 요구사항

### 1. 타입 정의 (timeline.ts)

```typescript
interface ITaskItem {
  taskId: string;        // "1", "2", ...
  subject: string;       // TaskCreate의 subject
  description?: string;  // TaskCreate의 description
  status: 'pending' | 'in_progress' | 'completed';
}

interface ITimelineTaskProgress {
  id: string;
  type: 'task-progress';
  timestamp: number;
  action: 'create' | 'update';
  taskId: string;
  subject?: string;        // create 시
  description?: string;    // create 시
  status: 'pending' | 'in_progress' | 'completed';
}
```

- `TTimelineEntryType`에 `'task-progress'` 추가
- `ITimelineEntry` union에 `ITimelineTaskProgress` 추가

### 2. 파서 (session-parser.ts)

`parseSingleEntry()`의 assistant → tool_use 처리 부분에서:

- `toolName === 'TaskCreate'` → `task-progress` 엔트리 생성 (action: 'create')
  - subject: `input.subject`
  - description: `input.description`
  - status: `'pending'`
  - taskId: 자동 할당하지 않음 — 클라이언트에서 순서 기반으로 부여
- `toolName === 'TaskUpdate'` → `task-progress` 엔트리 생성 (action: 'update')
  - taskId: `input.taskId`
  - status: `input.status`
- 기존 tool-call 엔트리는 **생성하지 않음** (TaskCreate/TaskUpdate는 타임라인에 도구 호출로 표시할 필요 없음)

### 3. 클라이언트 상태 관리 (use-timeline.ts)

entries 배열에서 `task-progress` 엔트리를 수집하여 `ITaskItem[]`을 파생:

- `useMemo`로 entries에서 task-progress 엔트리만 필터링
- `action: 'create'` → 새 task 추가 (taskId는 등장 순서 1, 2, 3...)
- `action: 'update'` → 해당 taskId의 status 변경
- 결과: `tasks: ITaskItem[]`를 return 값에 추가

세션 변경 시 tasks 초기화 (entries가 비워지므로 자동 처리)

### 4. UI 컴포넌트 (task-checklist.tsx)

#### 표시 조건

- tasks 배열이 비어있으면 렌더링하지 않음
- 전부 completed이고 CLI가 idle이면 3초 후 자동 접힘 (collapsed)

#### 레이아웃

```
┌─────────────────────────────┐
│ ✅ 2 / 4                 ▼  │  ← 헤더: 진행률 + 접기 토글
├─────────────────────────────┤
│ ✅ checkJsonlIdle mtime 캐시│  ← completed: 체크 아이콘 + 취소선
│ 🔵 TextEncoder 재사용       │  ← in_progress: 펄스 닷 + 강조
│ ○ broadcast stringify 최적화│  ← pending: 빈 원
│ ○ writeQueue 인덱스 기반    │  ← pending
└─────────────────────────────┘
```

#### 스타일

- 타임라인 스크롤 영역 상단에 sticky 배치
- 배경: `bg-muted/30` 계열
- 좌측 보더 컬러: in_progress 있으면 `border-ui-purple`, 전부 완료면 `border-positive`
- 헤더 진행률: `완료 수 / 전체 수`
- 접기/펼치기: `ChevronDown` 아이콘 회전 토글
- 접힌 상태: 헤더만 표시 (현재 in_progress 항목의 subject를 한 줄로 표시)
- 애니메이션: `animate-in fade-in slide-in-from-top-1 duration-200`
- max-height: task 목록 영역 `max-h-[240px]` 제한, 초과 시 스크롤 (`overflow-y-auto`)

#### 상태별 아이템 렌더링

| 상태 | 아이콘 | 텍스트 스타일 |
| ---- | ------ | ------------- |
| completed | `CheckCircle2` (text-positive) | `text-muted-foreground line-through` |
| in_progress | 펄스 닷 (bg-ui-purple) | `text-foreground font-medium` |
| pending | 빈 원 (border-muted-foreground) | `text-muted-foreground` |

### 5. timeline-view 통합

- `TimelineView` 컴포넌트에 tasks prop 추가
- 스크롤 영역 최상단(contentRef 내부 첫 번째)에 `TaskChecklist` 배치
- task-progress 엔트리는 `TimelineEntryRenderer`에서 축약 표시 (아이콘 + subject 한 줄, tool-call 그룹에 포함)

## 제약 조건 / 참고 사항

- TaskCreate/TaskUpdate는 **모든 세션에서 사용되지 않음** — 복잡한 작업에서만 간헐적 등장. task가 없는 세션에서는 UI 변화 없어야 함
- task-progress 엔트리를 tool-call과 중복 생성하지 않음 (기존 도구 호출 표시 제거)
- taskId 할당은 파서가 아닌 클라이언트에서 처리 (jsonl에 순서 번호가 없을 수 있음 — TaskCreate 등장 순서로 1, 2, 3 부여)
- 세션 중간부터 로드하는 경우 (tail mode) task 상태가 불완전할 수 있음 — 이 경우 파싱된 만큼만 표시
- `task-notification` (서브에이전트 완료 알림)과는 별개 기능 — 기존 task-notification 렌더링에 영향 없음
- 모바일에서도 동일하게 표시 (타임라인 상단 sticky)

## 미확인 사항

(모두 확인 완료)
