# API 연동

## 조회 API

### 워크스페이스 조회

- **엔드포인트**: `GET /api/agent/[agentId]/workspace`
- **응답**:

```typescript
interface IAgentWorkspaceResponse {
  agentId: string;
  brainSession: {
    tmuxSession: string;
    status: TAgentStatus;
  };
  stats: {
    runningTasks: number;
    completedTasks: number;
    uptimeSeconds: number;
  };
  projectGroups: IProjectGroup[];
  recentActivity: IActivityEntry[];
}

interface IProjectGroup {
  workspaceId: string;
  workspaceName: string;
  projectPath: string;
  tabs: IAgentTab[];
}

interface IAgentTab {
  tabId: string;
  tabName: string;
  taskTitle?: string;
  taskId?: string;
  status: 'running' | 'completed' | 'idle' | 'failed';
}

interface IActivityEntry {
  timestamp: string;
  action: string;           // "Task 3: API 구현 시작"
  projectName?: string;
}
```

- **캐시 전략**: 캐시 없음 — WebSocket 실시간 갱신

## 변경 API

### 에이전트 재시작

- **엔드포인트**: `POST /api/agent/[agentId]/restart`
- **응답**: `{ status: 'restarting' }`
- **부수 효과**: tmux 세션 재생성 + Claude Code 실행
- **Optimistic UI**: 배너 → 재시작 중 스피너

## WebSocket — 실시간 탭 갱신

### 수신 이벤트

```typescript
// 탭 추가
interface IWorkspaceTabAdded {
  type: 'workspace:tab-added';
  agentId: string;
  workspaceId: string;
  tab: IAgentTab;
}

// 탭 상태 변경
interface IWorkspaceTabUpdated {
  type: 'workspace:tab-updated';
  agentId: string;
  tabId: string;
  status: IAgentTab['status'];
}

// 탭 제거
interface IWorkspaceTabRemoved {
  type: 'workspace:tab-removed';
  agentId: string;
  tabId: string;
}

// 활동 추가
interface IWorkspaceActivity {
  type: 'workspace:activity';
  agentId: string;
  entry: IActivityEntry;
}
```

## 관찰 모드

### 진입

관찰 모드는 별도 API 없이 클라이언트 라우팅으로 처리:

```
/agents/{agentId}/workspace → "보기" 클릭
  → /?ws={workspaceId}&tab={tabId}&observe=true (쿼리 파라미터)
```

`observe=true`일 때:
- 관찰 모드 배너 표시
- 터미널 입력 이벤트 차단 (MSG_STDIN 전송 안 함)
- 배너 닫기 → 이전 페이지로 복귀

### 입력 차단 구현

기존 `use-terminal.ts`의 입력 핸들러에서 `observe` 파라미터 확인:

```typescript
// observe 모드일 때 stdin 전송 차단
if (searchParams.get('observe') === 'true') {
  return; // 입력 무시
}
```

## 클라이언트 상태 관리

### 페이지 로컬 상태

```typescript
interface IWorkspacePageState {
  stats: IAgentWorkspaceResponse['stats'];
  brainSession: IAgentWorkspaceResponse['brainSession'];
  projectGroups: IProjectGroup[];
  recentActivity: IActivityEntry[];
  isLoading: boolean;
  isRestarting: boolean;
}
```

에이전트 워크스페이스는 페이지 단위 상태 — 전역 스토어 불필요.

## 컴포넌트 구조

```
pages/agents/[agentId]/workspace.tsx
├── WorkspaceHeader             ← 에이전트 정보 + 네비게이션
├── ActivitySummary             ← 실행 중/완료/가동 시간
├── BrainSessionCard            ← 에이전트 두뇌 세션 상태
├── ProjectGroup                ← 프로젝트별 탭 그룹
│   └── AgentTabItem            ← 개별 탭 항목
├── RecentActivity              ← 최근 활동 아코디언
└── OfflineBanner               ← offline 시 배너 (조건부)
```

## 파일 구조

```
src/
├── pages/agents/
│   └── [agentId]/
│       └── workspace.tsx         # 워크스페이스 페이지
├── components/features/agent/
│   ├── activity-summary.tsx
│   ├── brain-session-card.tsx
│   ├── project-group.tsx
│   ├── agent-tab-item.tsx
│   ├── recent-activity.tsx
│   ├── offline-banner.tsx
│   └── observe-banner.tsx        # 관찰 모드 배너 (터미널 페이지용)
```

## 에러 처리

| 상황 | 처리 |
|------|------|
| 워크스페이스 조회 실패 | 스켈레톤 → 에러 + 재시도 |
| 재시작 실패 | 배너에 에러 메시지 + 재시도 버튼 |
| 탭 이동 대상 없음 | toast.error('탭을 찾을 수 없습니다') |
| WebSocket 끊김 | 재연결 후 전체 재조회 |
