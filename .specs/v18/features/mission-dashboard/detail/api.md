# API 연동

## 조회 API

### 미션 목록 조회

- **엔드포인트**: `GET /api/agent/[agentId]/missions`
- **파라미터**: 없음
- **응답**:

```typescript
interface IMissionListResponse {
  missions: IMission[];
}

interface IMission {
  id: string;
  title: string;
  status: TMissionStatus;
  createdAt: string;
  completedAt?: string;
  tasks: ITask[];
}

interface ITask {
  id: string;
  title: string;
  status: TTaskStatus;
  confirmed: boolean;           // 롤링 계획 — 확정 여부
  tabLink?: {                   // 실행 중인 탭 링크
    workspaceId: string;
    tabId: string;
    workspaceName: string;
  };
  steps: IStep[];
}

interface IStep {
  id: string;
  title: string;
  status: TStepStatus;
}

type TMissionStatus = 'pending' | 'running' | 'blocked' | 'completed' | 'failed';
type TTaskStatus = 'pending' | 'running' | 'completed' | 'blocked' | 'failed';
type TStepStatus = 'pending' | 'running' | 'completed' | 'failed';
```

- **캐시 전략**: 캐시 없음 — WebSocket으로 실시간 갱신

### blocked 태스크 사유 조회

- **엔드포인트**: `GET /api/agent/[agentId]/missions/[missionId]/tasks/[taskId]/block-reason`
- **응답**:

```typescript
interface IBlockReasonResponse {
  reason: string;
  chatMessageId: string;        // 채팅으로 이동 시 사용
  blockedAt: string;
}
```

## WebSocket — 실시간 미션 갱신

### 연결

- `/api/agent-status` WebSocket (기존 agent WebSocket 확장)
- 미션 관련 이벤트 추가

### 서버 → 클라이언트 이벤트

```typescript
// 태스크/스텝 상태 변경
interface IMissionUpdate {
  type: 'mission:update';
  agentId: string;
  missionId: string;
  taskId?: string;
  stepId?: string;
  status: TTaskStatus | TStepStatus;
  reason?: string;              // blocked 시 사유
}

// 롤링 계획 변경
interface IMissionPlanUpdate {
  type: 'mission:plan-updated';
  agentId: string;
  missionId: string;
  tasks: ITask[];               // 전체 Task 목록 (변경 후)
}

// 미션 완료
interface IMissionComplete {
  type: 'mission:complete';
  agentId: string;
  missionId: string;
  status: 'completed' | 'failed';
}
```

## 클라이언트 상태 관리

### useMissionStore (Zustand)

```typescript
interface IMissionStore {
  missions: Record<string, IMission[]>;     // agentId → missions
  fetchMissions: (agentId: string) => Promise<void>;
  updateTaskStatus: (missionId: string, taskId: string, status: TTaskStatus) => void;
  updateStepStatus: (missionId: string, taskId: string, stepId: string, status: TStepStatus) => void;
  updatePlan: (missionId: string, tasks: ITask[]) => void;
  completeMission: (missionId: string, status: TMissionStatus) => void;
}
```

## 컴포넌트 구조

```
pages/agents/[agentId]/missions.tsx
├── MissionHeader               ← 에이전트 정보 + 네비게이션
├── ActiveMissions              ← 활성 미션 목록
│   └── MissionCard             ← 개별 미션
│       ├── MissionProgress     ← 진행률 바 + 상태
│       └── TaskTree            ← 태스크 트리
│           ├── TaskNode        ← Task 노드
│           │   ├── StepNode    ← Step 노드
│           │   └── BlockedPopover  ← blocked 팝오버
│           └── TabLink         ← 탭 이동 링크
└── CompletedMissions           ← 완료된 미션 (아코디언)
```

## 파일 구조

```
src/
├── pages/agents/
│   └── [agentId]/
│       └── missions.tsx          # 미션 대시보드 페이지
├── components/features/agent/
│   ├── mission-card.tsx
│   ├── mission-progress.tsx
│   ├── task-tree.tsx
│   ├── task-node.tsx
│   ├── step-node.tsx
│   ├── blocked-popover.tsx
│   └── tab-link.tsx
├── hooks/
│   └── use-mission-store.ts
└── types/
    └── mission.ts
```

## 에러 처리

| 상황 | 처리 |
|------|------|
| 미션 목록 조회 실패 | 스켈레톤 → 에러 메시지 + 재시도 |
| WebSocket 끊김 | 재연결 후 미션 목록 재조회 (전체 동기화) |
| blocked 사유 조회 실패 | 팝오버에 "정보를 불러올 수 없습니다" |
| 탭 링크 대상 없음 (탭 삭제됨) | 링크 비활성화 + "탭이 종료되었습니다" 툴팁 |
