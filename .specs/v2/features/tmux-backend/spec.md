---
page: tmux-backend
title: tmux 백엔드
route: /api/terminal
status: DRAFT
complexity: High
depends_on: []
created: 2026-03-20
updated: 2026-03-20
assignee: ''
---

# tmux 백엔드

## 개요

Phase 1의 `node-pty` 직접 쉘 실행을 tmux 세션 기반으로 교체한다. tmux가 쉘 프로세스의 생명주기를 관리하고, 서버는 tmux 세션에 attach/detach하여 I/O를 중계한다. 서버가 재시작되어도 tmux 세션이 살아있으므로, 브라우저에서 재연결하면 이전 작업이 그대로 복원된다.

핵심 설계 원칙: **tmux는 세션 관리만, I/O 중계는 기존 node-pty 로직을 그대로 재활용한다.**

## 주요 기능

### tmux 환경 검증

- 서버 시작 시 tmux 설치 여부를 확인한다
- tmux 버전이 2.9 이상인지 확인한다 (`resize-window` 명령 지원 필요)
- 미달 시 명확한 에러 메시지와 함께 서버를 종료한다
- 전용 소켓 `-L purple`을 사용하여 사용자의 기존 tmux 세션과 완전 격리

### tmux 전용 설정

- Purple Terminal 전용 tmux 설정 파일을 사용한다 (`-f` 옵션)
- 사용자의 `~/.tmux.conf`와 충돌하지 않도록 격리
- 설정 내용:
  - `set -g status off` — status bar 비활성 (xterm.js UI와 충돌 방지)
  - prefix key 비활성 — 모든 키 입력이 쉘에 전달되도록
  - `set -g aggressive-resize on` — 가장 최근 attach 클라이언트 크기에 맞춤
  - `set -g history-limit {N}` — xterm.js의 `scrollback` 설정과 동일하게

### tmux 세션 생성

- `child_process.exec`로 tmux 세션을 백그라운드 생성 (`tmux -L purple new-session -d -s {name} -x {cols} -y {rows}`)
- 세션 네이밍: `pt-{workspaceId}-{paneId}-{surfaceId}` (각 ID는 nanoid로 생성)
- 사용자의 기본 쉘(`$SHELL` 또는 `/bin/zsh`)을 tmux 세션 내에서 실행
- TERM 환경변수는 `xterm-256color` 유지
- 세션 생성 실패 시 WebSocket close code 1011 전송

### tmux 세션 연결 (node-pty 방식)

- `pty.spawn('tmux', ['-L', 'purple', 'attach', '-t', sessionName])`으로 세션에 attach
- tmux attach 시 tmux가 자동으로 현재 화면을 redraw (별도 capture-pane 불필요)
- node-pty의 `onData`/`write`로 입출력을 WebSocket과 중계 (Phase 1 I/O 로직 재활용)
- 기존 바이너리 메시지 프로토콜 유지:
  - `0x00` stdin (클라이언트 → 서버)
  - `0x01` stdout (서버 → 클라이언트)
  - `0x02` resize (클라이언트 → 서버, cols 2B + rows 2B)
  - `0x03` heartbeat (양방향, 30초 간격)
- backpressure 처리 유지: WebSocket 버퍼 > 1MB 시 PTY pause, < 256KB 시 resume

### 세션 매칭 및 재연결

- 서버 시작 시 `tmux -L purple ls`로 `pt-` 세션 목록 조회
- dead 상태의 `pt-` 세션이 있으면 정리
- **세션 매칭 규칙 (Phase 2)**: 클라이언트 연결 시 `pt-*` 세션이 하나라도 있으면 해당 세션에 attach. 없으면 새 세션 생성
- 브라우저 새로고침, 네트워크 끊김, 서버 재시작 후에도 기존 세션에 다시 붙음
- 화면 복원은 tmux attach 자동 redraw로 처리 (별도 복원 로직 불필요)
- Phase 3+ 확장: 클라이언트가 세션 ID를 지정하여 특정 세션에 attach

### 세션 종료 정책

세션은 사용자의 명시적 액션으로만 종료된다:

- **`exit` 실행**: 쉘 종료 → tmux 세션 소멸 → attach PTY `onExit` → close code 1000 → session-ended UI
- **UI 종료 버튼**: `tmux -L purple kill-session -t {name}` → close code 1000 → session-ended UI
- **새로고침/네트워크 끊김/탭 닫기**: `pty.kill()`만 수행 (tmux detach), 세션 유지
- **서버 종료 (SIGTERM/SIGINT)**: close code 1001 전송, WebSocket + attach PTY만 정리, tmux 세션 유지
- **세션 종료 후 재생성**: 새 WebSocket 연결 → `pt-*` 세션 없음 → 새 세션(새 nanoid) 생성

### detach와 세션 종료 구분

`pty.kill()` (의도적 detach)과 쉘 종료 (세션 소멸) 모두 node-pty의 `onExit`를 발생시키므로 반드시 구분해야 한다:

- cleanup에 `detaching` 플래그 도입
- WebSocket close/서버 종료 시: `detaching = true` 설정 → `pty.kill()` → `onExit`에서 close code 미전송
- 쉘 종료 시: `detaching = false` 상태에서 `onExit` → close code 1000 전송
- 이 구분이 없으면 새로고침 시 세션 종료 UI가 잠깐 표시되는 UX 결함 발생

### WebSocket close code 정책

| close code | 의미 | 클라이언트 동작 |
|---|---|---|
| 1000 | 세션 종료 (exit 또는 명시적 kill) | session-ended UI, 자동 재연결 안 함 |
| 1001 | 서버 종료 | 자동 재연결 → 기존 tmux 세션에 attach |
| 1011 | tmux 세션 생성/attach 실패 | 에러 표시 |
| 1013 | 동시 접속 초과 | 에러 표시 |

### 터미널 리사이즈

- 클라이언트 리사이즈 메시지(0x02)를 받으면 `pty.resize()`로 크기 변경
- tmux `aggressive-resize on` 설정으로 가장 최근 attach 클라이언트 크기에 자동 맞춤
- 다중 클라이언트(탭) 연결 시 마지막 리사이즈가 우선

### 동시 접속

- Phase 1과 동일하게 최대 동시 연결 수 제한 (기본 10개)
- 다중 탭이 동일 tmux 세션에 attach 가능 — 각 탭마다 별도 `pty.spawn('tmux', ['attach', ...])` 실행
- 모든 탭에서 같은 세션 입출력을 공유

### graceful shutdown

- 서버 종료 시 모든 WebSocket에 close code 1001 전송
- 모든 attach PTY를 `detaching = true`로 정리
- tmux 세션은 kill하지 않음 — 재시작 시 재연결을 위해 보존
- Phase 1의 `gracefulShutdown`에서 PTY kill 로직을 detach 로직으로 변경

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-03-20 | 초안 작성 | DRAFT |
