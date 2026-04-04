# 화면 구성

## 개요

agent-execution은 백엔드 실행 엔진으로 직접적인 UI 페이지가 없다. 에이전트가 생성한 탭은 기존 purplemux 워크스페이스/탭 UI에 그대로 표시되며, 사용자는 일반 탭과 동일하게 관찰할 수 있다.

## 에이전트 탭 데이터 모델

### 탭 매핑 (서버 인메모리 + 영속화)

```typescript
interface IAgentTab {
  tabId: string;              // purplemux 탭 ID
  agentId: string;            // 소유 에이전트
  workspaceId: string;        // 소속 워크스페이스
  tmuxSession: string;        // tmux 세션명 (pt-{wsId}-{paneId}-{tabId})
  taskTitle?: string;         // 태스크 제목 (에이전트가 지정)
  status: TAgentTabStatus;    // 탭 작업 상태
  createdAt: string;          // ISO 8601
}

type TAgentTabStatus = 'idle' | 'working' | 'completed' | 'error';
```

### 탭 상태 산출

| 조건 | 상태 | 설명 |
|------|------|------|
| tmux 세션 존재 + Claude idle | `idle` | 대기 중 |
| tmux 세션 존재 + Claude busy | `working` | 작업 실행 중 |
| Claude idle + `.task-result.md` 존재 | `completed` | 작업 완료 |
| 세션 크래시 / 에러 패턴 감지 | `error` | 실패 |

### 결과 읽기 우선순위

| 순서 | 소스 | 조건 |
|------|------|------|
| 1 | `.task-result.md` | 파일 존재 시 |
| 2 | Claude Code jsonl | 마지막 assistant 메시지 파싱 |
| 3 | `tmux capture-pane` | 최후 수단 (tail 50줄) |

## Brain CLAUDE.md 구조

에이전트 디렉토리(`~/.purplemux/agents/{id}/CLAUDE.md`)에 생성되는 Brain 지침서.

```markdown
# Agent Instructions

You are "{name}" — {role}.

## Projects

워크스페이스 매핑:
- {projectPath} → workspaceId: {wsId}

## Tab Control API (localhost:{port})

### 탭 생성
curl -s -X POST http://localhost:{port}/api/agent/{id}/tab \
  -H "Content-Type: application/json" \
  -d '{"workspaceId":"...","taskTitle":"..."}'

### 탭에 지시 전송
curl -s -X POST http://localhost:{port}/api/agent/{id}/tab/{tabId}/send \
  -H "Content-Type: application/json" \
  -d '{"content":"..."}'

### 탭 상태 조회
curl -s http://localhost:{port}/api/agent/{id}/tab/{tabId}/status

### 탭 결과 읽기
curl -s http://localhost:{port}/api/agent/{id}/tab/{tabId}/result

### 탭 닫기
curl -s -X DELETE http://localhost:{port}/api/agent/{id}/tab/{tabId}

## Communication API

(기존 relay API — report/question/done/error/approval)

## Workflow

1. 사용자 지시를 받으면 태스크로 분리
2. 각 태스크마다 해당 프로젝트의 워크스페이스에 탭 생성
3. 탭에 Claude Code 지시 전송 (한 번에 하나씩, 단계별로)
4. 탭 완료 알림 대기 → 결과 확인
5. 사용자에게 relay로 진행상황/완료 리포트
6. 작업 끝나면 탭 닫기
```

## 파일 구조

```
~/.purplemux/agents/
├── {agentId}/
│   ├── config.md             # 에이전트 설정
│   ├── CLAUDE.md             # Brain 지침서 (탭 API + relay API)
│   ├── chat/                 # 채팅 이력
│   └── tabs.json             # 활성 탭 매핑 (영속화)
```

### tabs.json 스키마

```typescript
interface IAgentTabsFile {
  tabs: IAgentTab[];
}
```

서버 시작 시 이 파일을 읽어 인메모리 탭 매핑을 복원한다. 탭 생성/삭제 시 동기화.
