# 화면 구성

## 개요

status-server는 백엔드 엔진이므로 직접적인 시각 UI가 없다. 클라이언트 측 Zustand 스토어와 WebSocket 연결 상태 표시만 다룬다.

## 클라이언트 상태 스토어 구조

### useClaudeStatusStore

```typescript
interface ITabStatusEntry {
  cliState: TCliState;  // 'busy' | 'idle' | 'inactive'
  dismissed: boolean;
}

type TTabDisplayStatus = 'busy' | 'needs-attention' | 'idle';

interface IClaudeStatusState {
  tabs: Record<string, ITabStatusEntry>;
  wsConnected: boolean;
}

interface IClaudeStatusActions {
  getTabStatus: (tabId: string) => TTabDisplayStatus;
  getWorkspaceStatus: (wsId: string) => { busyCount: number; attentionCount: number };
  getGlobalStatus: () => { busyCount: number; attentionCount: number };
  dismissTab: (tabId: string) => void;
  reportActiveTab: (tabId: string, cliState: TCliState) => void;
}
```

### 상태 파생 로직

```
getTabStatus(tabId):
  entry = tabs[tabId]
  if (!entry || entry.cliState === 'inactive') → 'idle'
  if (entry.cliState === 'busy') → 'busy'
  if (entry.cliState === 'idle' && !entry.dismissed) → 'needs-attention'
  → 'idle'
```

## WebSocket 연결 상태

- 연결 중: 별도 표시 없음 (백그라운드 처리)
- 연결 끊김: 자동 재접속, UI 반영 없음 (사용자에게 노출하지 않음)
- 재접속 성공: `status:sync`로 상태 자동 복구

## 로딩 상태

- 초기 접속 시 `status:sync` 수신 전까지: 모든 탭 `idle`로 표시 (인디케이터 없음)
- 수신 후: 서버 상태 반영
- 로딩 스피너/스켈레톤 불필요 — 상태가 없으면 "표시 없음"이 기본이므로
