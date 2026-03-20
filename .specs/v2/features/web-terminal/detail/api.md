# API 연동

> 이 문서는 web-terminal(클라이언트)의 API 연동 관점을 정의한다. Phase 2에서 클라이언트 측 API 연동 변경은 거의 없다.

## WebSocket 연결 (변경 없음)

### 엔드포인트

`ws://localhost:{port}/api/terminal`

### 연결 설정

```typescript
const ws = new WebSocket(url);
ws.binaryType = 'arraybuffer';
```

### 메시지 프로토콜 (변경 없음)

| 타입 | 방향 | 페이로드 | 설명 |
|---|---|---|---|
| `0x00` | 클라이언트 → 서버 | 가변 바이너리 | stdin 입력 데이터 |
| `0x01` | 서버 → 클라이언트 | 가변 바이너리 | stdout 출력 데이터 |
| `0x02` | 클라이언트 → 서버 | 4바이트 (cols 2B + rows 2B) | 터미널 리사이즈 |
| `0x03` | 양방향 | 0바이트 | 하트비트 |

## 커스텀 훅 (Phase 2 변경 반영)

### `useTerminalWebSocket`

Phase 1과 동일한 인터페이스. 내부 로직 변경 없음:

- WebSocket 연결 생명주기 관리
- 바이너리 메시지 송수신
- 자동 재연결 (지수 백오프, 최대 5회)
- 하트비트 (30초 간격)
- 연결 상태 머신 관리

**Phase 2에서 달라지는 점**: 재연결 성공 시 서버가 기존 tmux 세션에 attach하므로, 클라이언트는 자동으로 이전 화면 데이터를 수신한다. 코드 변경 불필요.

### `useTerminal`

Phase 1과 동일한 인터페이스:

- xterm.js 인스턴스 및 애드온 관리
- ResizeObserver 기반 리사이즈
- requestAnimationFrame 기반 출력 버퍼링

## WebSocket close code 처리 (클라이언트 관점)

Phase 1 로직을 그대로 유지:

```typescript
ws.onclose = (event) => {
  switch (event.code) {
    case 1000: // 세션 종료
      setState('session-ended');
      // 자동 재연결 하지 않음
      break;
    case 1001: // 서버 종료
      setState('reconnecting');
      scheduleReconnect(); // 지수 백오프
      break;
    case 1011: // 세션 생성 실패
    case 1013: // 동시 접속 초과
      setState('disconnected');
      showError(event.reason);
      break;
  }
};
```

**Phase 2에서의 의미 변화 (코드 변경 없음)**:
- 1001 재연결 성공 시: Phase 1에서는 빈 터미널, Phase 2에서는 이전 화면 복원
- 이 차이는 서버 측에서 처리되므로 클라이언트 코드는 동일

## 세션 종료 요청 (Phase 2 신규)

UI에서 명시적으로 세션을 종료하기 위한 메커니즘. 두 가지 방식 중 선택:

### 방식 A: 새 WebSocket 메시지 타입

```
메시지 타입 0x04 = KILL_SESSION (클라이언트 → 서버)
페이로드: 없음
```

- 기존 프로토콜에 타입 추가
- 서버 수신 시 `tmux -L purple kill-session` 실행

### 방식 B: HTTP API

```
POST /api/terminal/kill
→ 서버: tmux -L purple kill-session -t {현재 세션}
→ 응답: 200 OK
```

- WebSocket과 별도로 HTTP 엔드포인트 추가
- WebSocket이 닫히기 전에 요청 가능

**권장**: 방식 A (WebSocket 메시지 타입 추가). 별도 HTTP 엔드포인트 없이 기존 WebSocket 채널을 활용.

## 의존성 (변경 없음)

| 패키지 | 용도 |
|---|---|
| `@xterm/xterm` | 터미널 렌더링 |
| `@xterm/addon-fit` | 자동 리사이즈 |
| `@xterm/addon-webgl` | GPU 렌더링 |
| `@xterm/addon-web-links` | URL 클릭 |
