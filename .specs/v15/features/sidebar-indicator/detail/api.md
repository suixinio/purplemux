# API 연동

## 개요

사이드바 인디케이터는 신규 API 없이 `useClaudeStatusStore`의 Workspace별 집계 selector를 구독한다.

## 데이터 소스

### useClaudeStatusStore 구독

```typescript
// 각 Workspace 항목에서 개별 구독
const { busyCount, attentionCount } = useClaudeStatusStore(
  (state) => state.getWorkspaceStatus(workspaceId)
);
```

- Workspace별 독립 구독 — 한 Workspace 상태 변경이 다른 Workspace 리렌더 안 함
- `getWorkspaceStatus` 내부: 해당 wsId에 속한 모든 탭의 상태를 집계

### 집계 로직

```typescript
getWorkspaceStatus(wsId: string) {
  const entries = Object.entries(this.tabs)
    .filter(([_, tab]) => tab.workspaceId === wsId);

  return {
    busyCount: entries.filter(([_, tab]) => tab.cliState === 'busy').length,
    attentionCount: entries.filter(([_, tab]) =>
      tab.cliState === 'idle' && !tab.dismissed
    ).length,
  };
}
```

## 컴포넌트 구조

```
Sidebar (기존 수정)
└── WorkspaceItem (기존 수정)
    ├── WorkspaceIcon (기존)
    ├── WorkspaceName (기존)
    └── WorkspaceStatusIndicator (신규)  ← spinner + 뱃지
```

### WorkspaceStatusIndicator 컴포넌트

```typescript
interface IWorkspaceStatusIndicatorProps {
  workspaceId: string;
}
```

- `busyCount === 0 && attentionCount === 0` → `null` (렌더링 안 함)
- `busyCount > 0` → `<Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />`
- `attentionCount > 0` → `<span className="...">{attentionCount > 9 ? '9+' : attentionCount}</span>`

## 파일 구조

```
src/
├── components/features/terminal/
│   ├── sidebar.tsx                        ← 기존 수정: WorkspaceStatusIndicator 삽입
│   └── workspace-status-indicator.tsx     ← 신규: Workspace 인디케이터
```

## 에러 처리

| 에러 | 처리 |
|---|---|
| Workspace ID에 매칭되는 탭 없음 | `{ busyCount: 0, attentionCount: 0 }` (표시 없음) |
| 스토어 미초기화 | 모든 Workspace idle (표시 없음) |
