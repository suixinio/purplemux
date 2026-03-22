# API 연동

## 개요

글로벌 상태 요약은 신규 API 없이 `useClaudeStatusStore`의 전체 집계 selector와 탭별 목록을 구독한다. 브라우저 탭 title은 `document.title` 직접 조작.

## 데이터 소스

### 요약 카운트

```typescript
const { busyCount, attentionCount } = useClaudeStatusStore(
  (state) => state.getGlobalStatus()
);
```

### 세션 목록 (드롭다운용)

```typescript
const activeSessions = useClaudeStatusStore((state) => {
  return Object.entries(state.tabs)
    .filter(([_, tab]) => {
      const status = state.getTabStatus(tab);
      return status !== 'idle';
    })
    .map(([tabId, tab]) => ({
      tabId,
      tabName: tab.tabName,
      workspaceId: tab.workspaceId,
      status: state.getTabStatus(tabId),
    }))
    .sort((a, b) => {
      // needs-attention 먼저, busy 다음
      if (a.status === 'needs-attention' && b.status === 'busy') return -1;
      if (a.status === 'busy' && b.status === 'needs-attention') return 1;
      return 0;
    });
});
```

### Workspace 이름 매핑

```typescript
// 기존 레이아웃 스토어에서 Workspace 이름 조회
const workspaceName = useLayoutStore(
  (state) => state.workspaces.find(ws => ws.id === workspaceId)?.name
);
```

## 탭 이동 (드롭다운 항목 클릭)

```typescript
const handleSessionClick = (tabId: string, workspaceId: string) => {
  // 1. Workspace 전환
  switchWorkspace(workspaceId);

  // 2. 해당 탭 활성화
  activateTab(tabId);

  // 3. dismiss 처리
  useClaudeStatusStore.getState().dismissTab(tabId);

  // 4. Popover 닫기
  setOpen(false);
};
```

- `switchWorkspace`: 기존 Workspace 전환 함수
- `activateTab`: 기존 탭 활성화 함수
- 순서 보장 필요: Workspace 전환 → 탭 활성화 (동기 처리)

## 브라우저 탭 title

### useBrowserTitle 훅

```typescript
const useBrowserTitle = (baseTitle: string) => {
  const { attentionCount } = useClaudeStatusStore(
    (state) => state.getGlobalStatus()
  );

  useEffect(() => {
    document.title = attentionCount > 0
      ? `(${attentionCount}) ${baseTitle}`
      : baseTitle;
  }, [attentionCount, baseTitle]);
};
```

- 각 페이지에서 `useBrowserTitle('Purple Terminal')` 호출
- 통계 페이지: `useBrowserTitle('사용량 통계')`
- 카운트 변경 시에만 title 갱신

## 컴포넌트 구조

```
AppHeader (기존 수정)
├── Logo (기존)
├── GlobalStatusSummary (신규)  ← 요약 텍스트 + Popover
│   ├── StatusSummaryText       ← "3 실행 중 · 2 확인 필요"
│   └── SessionListPopover      ← 드롭다운 목록
│       └── SessionListItem[]   ← 개별 세션 항목
├── NotificationBell (기존)
└── LogoutButton (기존)

App (최상위)
└── useBrowserTitle('Purple Terminal')  ← 브라우저 탭 title
```

## 파일 구조

```
src/
├── components/features/terminal/
│   └── global-status-summary.tsx      ← 신규: 요약 + 드롭다운
├── components/layout/
│   └── app-header.tsx                 ← 기존 수정: GlobalStatusSummary 삽입
├── hooks/
│   └── use-browser-title.ts           ← 신규: 브라우저 탭 title 훅
```

## 에러 처리

| 에러 | 처리 |
|---|---|
| 스토어 미초기화 | `{ busyCount: 0, attentionCount: 0 }` → 표시 없음 |
| Workspace 전환 실패 | 기존 에러 처리 (toast) |
| 탭 활성화 실패 (탭 이미 삭제) | 드롭다운 닫기, 다음 status:update에서 목록 갱신 |
| document.title 접근 불가 | try-catch, 무시 (기능 비필수) |
