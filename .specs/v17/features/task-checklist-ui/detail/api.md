# API 연동

## 개요

별도 REST API 없음. 기존 타임라인 WebSocket 파이프라인(`timeline:init`, `timeline:append`)으로 전달되는 `task-progress` 엔트리를 클라이언트에서 소비한다.

## 클라이언트 상태 파생 (`hooks/use-timeline.ts`)

### tasks 파생 로직

```typescript
// use-timeline.ts 내부

const tasks = useMemo((): ITaskItem[] => {
  const items: ITaskItem[] = [];
  let createIndex = 0;

  for (const entry of entries) {
    if (entry.type !== 'task-progress') continue;

    if (entry.action === 'create') {
      createIndex++;
      items.push({
        taskId: String(createIndex),
        subject: entry.subject ?? '',
        description: entry.description,
        status: entry.status,
      });
    } else if (entry.action === 'update') {
      const target = items.find((t) => t.taskId === entry.taskId);
      if (target) {
        target.status = entry.status;
      }
    }
  }

  return items;
}, [entries]);
```

### return 값 확장

```typescript
interface IUseTimelineReturn {
  entries: ITimelineEntry[];
  tasks: ITaskItem[];          // 추가
  cliState: TCliState;
  // ... 기존 필드
}
```

## 컴포넌트 구조

```
TimelineView (timeline-view.tsx) ← 수정
├── TaskChecklist (신규)        ← sticky 상단
│   ├── 헤더 (진행률 + 접기 토글)
│   └── 목록 (상태별 아이템)
├── groupedItems.map(...)       ← 기존
│   ├── ToolGroupItem
│   ├── UserMessageItem
│   ├── AssistantMessageItem
│   ├── TaskProgressItem (신규) ← 축약 표시
│   └── ...
└── Busy indicator              ← 기존
```

## TaskChecklist 컴포넌트 인터페이스

```typescript
interface ITaskChecklistProps {
  tasks: ITaskItem[];
  cliState: TCliState;
}
```

### 내부 상태

```typescript
const [collapsed, setCollapsed] = useState(false);
```

### 자동 접힘 로직

```typescript
const allCompleted = tasks.length > 0 && tasks.every((t) => t.status === 'completed');

useEffect(() => {
  if (!allCompleted || cliState !== 'idle') return;

  const timer = setTimeout(() => setCollapsed(true), 3000);
  return () => clearTimeout(timer);
}, [allCompleted, cliState]);
```

### 자동 펼침 로직

```typescript
const prevTasksRef = useRef(tasks);

useEffect(() => {
  const prev = prevTasksRef.current;
  const changed = tasks.length !== prev.length
    || tasks.some((t, i) => prev[i]?.status !== t.status);

  if (changed && collapsed) {
    setCollapsed(false);
  }
  prevTasksRef.current = tasks;
});
```

## TaskProgressItem 컴포넌트 (축약 표시)

```typescript
interface ITaskProgressItemProps {
  entry: ITimelineTaskProgress;
}
```

- action=create: 아이콘 + subject
- action=update: 아이콘 + `"Task {taskId} → {status}"`

## timeline-view 수정

### props 확장

```typescript
interface ITimelineViewProps {
  entries: ITimelineEntry[];
  tasks: ITaskItem[];          // 추가
  cliState: TCliState;
  // ... 기존
}
```

### TimelineEntryRenderer 확장

```typescript
case 'task-progress':
  return <TaskProgressItem entry={entry} />;
```

### TaskChecklist 배치

```typescript
<div ref={contentRef}>
  {tasks.length > 0 && (
    <TaskChecklist tasks={tasks} cliState={cliState} />
  )}
  {groupedItems.map((item) => (
    // 기존 렌더링
  ))}
</div>
```

## 파일 구조

```
src/
├── components/features/timeline/
│   ├── timeline-view.tsx              ← 수정: tasks prop + TaskChecklist 배치
│   ├── task-checklist.tsx             ← 신규: 체크리스트 컴포넌트
│   └── task-progress-item.tsx         ← 신규: 축약 표시 컴포넌트
├── hooks/
│   └── use-timeline.ts               ← 수정: tasks useMemo + return 확장
└── types/
    └── timeline.ts                    ← task-progress-parser에서 수정 완료
```

## 상위 컴포넌트 연결

`use-timeline`의 `tasks`를 `TimelineView`까지 전달하는 경로:

```
use-timeline.ts → tasks
  └── claude-code-panel.tsx (또는 해당 컨테이너)
      └── TimelineView tasks={tasks}
```

기존에 `entries`, `cliState` 등을 전달하는 것과 동일한 패턴.

## 에러 처리

| 상황 | 처리 |
|------|------|
| task-progress 파싱 실패 | 파서에서 무시 → tasks 배열 불완전 (안전) |
| taskId 매칭 실패 (update) | 해당 update 무시 → 기존 상태 유지 |
| entries 초기화 | tasks 자동 리셋 (useMemo 의존성) |
| WebSocket 재연결 | timeline:init으로 전체 재로드 → tasks 재구성 |
