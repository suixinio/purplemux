# API 연동

## 개요

탭 인디케이터는 신규 API 없이 `useClaudeStatusStore`를 구독하여 동작한다. 모든 데이터는 status-server의 WebSocket을 통해 공급된다.

## 데이터 소스

### useClaudeStatusStore 구독

```typescript
// 각 탭 컴포넌트에서 개별 구독
const status = useClaudeStatusStore(
  (state) => state.getTabStatus(tabId)
);
// 반환: 'busy' | 'needs-attention' | 'idle'
```

- selector 패턴으로 해당 탭 상태만 구독
- 다른 탭 상태 변경 시 리렌더 없음

### dismiss 호출

```typescript
const { dismissTab } = useClaudeStatusStore();

const handleTabChange = (tabId: string) => {
  dismissTab(tabId);  // optimistic + 서버 알림
  // 기존 탭 전환 로직...
};
```

## 컴포넌트 구조

```
PaneTabBar (기존 수정)
├── TabItem (기존 수정)
│   ├── TabStatusIndicator (신규)  ← spinner/dot 렌더링
│   ├── TabIcon (기존)
│   ├── TabName (기존)
│   └── TabCloseButton (기존)
└── AddTabButton (기존)
```

### TabStatusIndicator 컴포넌트

```typescript
interface ITabStatusIndicatorProps {
  tabId: string;
  isActive: boolean;
  panelType?: TPanelType;
}
```

- `panelType !== 'claude-code'` → `null` 반환 (렌더링 안 함)
- `isActive && status === 'needs-attention'` → `null` (활성 탭 dismiss)
- `status === 'busy'` → `<Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />`
- `status === 'needs-attention'` → `<span className="w-1.5 h-1.5 rounded-full bg-ui-red" />`
- `status === 'idle'` → `null`

## 파일 구조

```
src/
├── components/features/terminal/
│   ├── pane-tab-bar.tsx              ← 기존 수정: TabStatusIndicator 삽입
│   └── tab-status-indicator.tsx      ← 신규: 인디케이터 컴포넌트
```

## 에러 처리

| 에러 | 처리 |
|---|---|
| 스토어에 탭 ID 없음 | `idle` 반환 (인디케이터 미표시) |
| WebSocket 미연결 | 모든 탭 `idle` (인디케이터 없음) |
| dismiss 실패 (서버 응답 없음) | 로컬 optimistic 유지, 서버 재접속 시 sync로 보정 |
