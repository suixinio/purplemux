# API 연동

> 이 문서는 tmux-backend의 서버 구현 관점에서의 API 스펙을 정의한다. Phase 1의 terminal-api를 기반으로 tmux 전환에 따른 변경사항을 명시한다.

## 파일 구조

| 파일 | 역할 | Phase 1 대비 변경 |
|---|---|---|
| `server.ts` | Custom Server, WebSocket upgrade 핸들러 | 변경 없음 |
| `src/lib/terminal-server.ts` | 연결 관리, I/O 중계 | node-pty 직접 실행 → tmux 세션 관리로 전환 |
| `src/lib/tmux.ts` (신규) | tmux CLI 래퍼 (세션 생성/조회/삭제/검증) | 신규 |
| `src/config/tmux.conf` (신규) | Purple Terminal 전용 tmux 설정 파일 | 신규 |

## tmux CLI 래퍼 (`src/lib/tmux.ts`)

### 환경 검증

```typescript
// tmux 설치 확인 + 버전 체크
const checkTmux = async (): Promise<{ version: string }> => { ... }
// 실패 시 process.exit(1) + 에러 로그
```

### 세션 관리

| 함수 | tmux 명령 | 설명 |
|---|---|---|
| `listSessions()` | `tmux -L purple ls -F '#{session_name}:#{session_attached}'` | `pt-*` 세션 목록 반환 |
| `createSession(name, cols, rows)` | `tmux -L purple new-session -d -s {name} -x {cols} -y {rows} -f {configPath}` | 백그라운드 세션 생성 |
| `killSession(name)` | `tmux -L purple kill-session -t {name}` | 세션 명시적 종료 |
| `hasSession(name)` | `tmux -L purple has-session -t {name}` | 세션 존재 여부 확인 |
| `cleanDeadSessions()` | `listSessions()` 후 dead 세션 kill | 서버 시작 시 정리 |

- 모든 명령에 `-L purple` 전용 소켓 옵션 포함
- `child_process.exec` 또는 `child_process.execFile` 사용
- 타임아웃: 5초 (tmux 명령이 hang 걸리는 경우 대비)

### 세션 ID 생성

```typescript
import { nanoid } from 'nanoid';

const createSessionName = (workspaceId: string, paneId: string, surfaceId: string): string =>
  `pt-${workspaceId}-${paneId}-${surfaceId}`;

// Phase 2: 고정 ID 사용 (단일 세션)
const defaultSessionName = (): string =>
  createSessionName(nanoid(6), nanoid(6), nanoid(6));
```

## tmux 전용 설정 (`src/config/tmux.conf`)

```
# Purple Terminal 전용 tmux 설정
# 사용자 ~/.tmux.conf와 완전 격리

# UI 투명성
set -g status off
set -g aggressive-resize on

# prefix key 비활성 (모든 키 입력이 쉘에 전달)
set -g prefix None
unbind-key -a

# 스크롤백 버퍼 (xterm.js scrollback과 동일)
set -g history-limit 5000

# 터미널 설정
set -g default-terminal "xterm-256color"
set -ga terminal-overrides ",xterm-256color:Tc"

# 세션 종료 시 자동 정리
set -g destroy-unattached off
set -g exit-unattached off
```

## 연결 관리

### 활성 연결 추적

```typescript
interface IActiveConnection {
  ws: WebSocket;
  pty: IPty;               // tmux attach 프로세스
  sessionName: string;     // tmux 세션 이름
  heartbeatTimer: ReturnType<typeof setInterval>;
  cleaned: boolean;
  detaching: boolean;       // 신규: detach/종료 구분 플래그
}

const connections = new Map<WebSocket, IActiveConnection>();
```

Phase 1 대비 변경:
- `sessionName` 필드 추가 (어떤 tmux 세션에 연결되어 있는지 추적)
- `detaching` 플래그 추가 (의도적 detach vs 세션 종료 구분)

### 연결 수 제한

Phase 1과 동일:

| 설정 | 값 |
|---|---|
| `MAX_CONNECTIONS` | `10` |

### 하트비트

Phase 1과 동일:

| 설정 | 값 |
|---|---|
| 전송 간격 | 30초 |
| 타임아웃 | 90초 |

## 연결 핸들러 (`handleConnection`)

Phase 1 대비 주요 변경:

```typescript
export const handleConnection = async (ws: WebSocket) => {
  // 1. stale 연결 정리 (Phase 1과 동일)
  // 2. 연결 수 체크 (Phase 1과 동일)

  // 3. 세션 매칭 (신규)
  const sessions = await listSessions();
  let sessionName: string;

  if (sessions.length > 0) {
    sessionName = sessions[0]; // Phase 2: 첫 번째 세션에 attach
  } else {
    sessionName = defaultSessionName();
    await createSession(sessionName, 80, 24);
  }

  // 4. tmux attach (Phase 1의 pty.spawn(shell) 대체)
  const ptyProcess = pty.spawn('tmux', ['-L', 'purple', 'attach', '-t', sessionName], {
    cols: 80,
    rows: 24,
  });

  // 5. 이벤트 바인딩 (Phase 1 로직 재활용, detaching 플래그 추가)
  // 6. 하트비트 (Phase 1과 동일)
};
```

## 리소스 정리

### cleanup 함수

Phase 1 대비 변경: PTY kill 시 `detaching` 플래그에 따라 분기:

```typescript
const cleanup = (conn: IActiveConnection) => {
  if (conn.cleaned) return;
  conn.cleaned = true;

  clearInterval(conn.heartbeatTimer);

  // detaching이 true면 의도적 detach → tmux 세션 유지
  // detaching이 false면 쉘 종료 → 세션 이미 소멸
  if (!conn.detaching) {
    // 세션 종료: close code 전송
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.close(1000, 'Session exited');
    }
  }

  try {
    conn.pty.kill();
  } catch {
    // PTY already exited
  }

  connections.delete(conn.ws);
};
```

### graceful shutdown

```typescript
export const gracefulShutdown = () => {
  connections.forEach((conn) => {
    if (conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.close(1001, 'Server shutting down');
    }
    conn.detaching = true;  // tmux 세션 유지
    cleanup(conn);
  });
  // tmux 세션은 kill하지 않음
};
```

## 에러 코드 정리

| 상황 | WebSocket 코드 | reason |
|---|---|---|
| 쉘 exit / UI 종료 | 1000 | `Session exited` |
| 서버 종료 | 1001 | `Server shutting down` |
| 하트비트 타임아웃 | 1001 | `Heartbeat timeout` |
| tmux 세션 생성 실패 | 1011 | `Session create failed` |
| tmux attach 실패 | 1011 | `Session attach failed` |
| 동시 접속 초과 | 1013 | `Max connections exceeded` |

## 의존성

| 패키지 | 용도 | Phase 1 대비 |
|---|---|---|
| `ws` | WebSocket 서버 | 동일 |
| `node-pty` | tmux attach 프로세스 관리 | 용도 변경 (쉘 직접 → tmux attach) |
| `nanoid` | 세션 ID 생성 | 신규 |

### 시스템 요구사항

| 요구사항 | 설명 |
|---|---|
| tmux 2.9+ | `resize-window` 명령 지원 |
| node-pty 빌드 환경 | node-gyp, Python 3, C++ 컴파일러 |
