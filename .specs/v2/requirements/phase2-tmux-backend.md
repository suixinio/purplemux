# Phase 2 — tmux 백엔드 PRD

## 목표

서버 재시작 시 터미널 세션이 유지되는 것.

Phase 1에서 구현한 `node-pty` 직접 호출 방식을 tmux 세션 기반으로 교체한다. tmux가 PTY 프로세스의 생명주기를 관리하므로, 서버가 재시작되어도 tmux 세션이 살아있어 작업 상태가 보존된다.

## 완료 조건

서버를 재시작해도 터미널 상태(실행 중인 프로세스, 출력 히스토리)가 유지된다.

---

## 현재 상태 (Phase 1 완료)

```
Browser ←→ WebSocket ←→ Server (node-pty) ←→ Shell
```

- `server.ts` 커스텀 서버에서 WebSocket 처리
- `node-pty`로 쉘 직접 실행
- 서버 종료 시 PTY 프로세스 소멸 → 작업 손실

## 목표 상태 (Phase 2)

```
Browser ←→ WebSocket ←→ Server ←→ tmux session ←→ Shell
```

- tmux가 세션 생명주기 관리
- 서버는 tmux 세션에 연결/해제만 담당
- 서버 재시작 시 기존 tmux 세션 탐색 → 재연결

---

## 요구사항

### REQ-1: tmux 환경 검증

서버 시작 시 tmux 환경을 검증한다.

- tmux 설치 여부를 확인하고, 미설치 시 명확한 에러 메시지와 함께 종료한다
- tmux 버전이 2.9 이상인지 확인한다 (`resize-window` 명령 지원 필요)
- 전용 소켓 `-L purple`을 사용하여 사용자의 기존 tmux 세션과 격리한다

### REQ-2: tmux 세션 생성

새 터미널 연결 시 tmux 세션을 생성하여 쉘을 실행한다.

- `child_process.exec`로 tmux 세션을 백그라운드 생성한다 (`tmux -L purple new-session -d -s {name} ...`)
- tmux 네이밍 규칙: `pt-{workspaceId}-{paneId}-{surfaceId}` (각 ID는 nanoid로 생성, 예: `pt-a1b2c3-d4e5f6-g7h8i9`)
- 세션 생성 시 사용자의 기본 쉘(`$SHELL` 또는 `/bin/zsh`)을 실행한다
- 세션의 초기 크기는 클라이언트로부터 받은 cols/rows를 적용한다 (`-x {cols} -y {rows}`)
- TERM 환경변수는 `xterm-256color`를 유지한다
- Purple Terminal 전용 tmux 설정을 적용한다: status bar 비활성(`set -g status off`), prefix key 비활성, `aggressive-resize on`

### REQ-3: tmux 세션 연결 (node-pty 방식)

node-pty로 tmux attach를 실행하여 I/O를 중계한다.

- `pty.spawn('tmux', ['-L', 'purple', 'attach', '-t', sessionName])`으로 세션에 attach한다
- tmux attach 시 tmux가 자동으로 현재 화면을 redraw한다 (별도 capture-pane 불필요)
- node-pty의 `onData`/`write`로 입출력을 WebSocket과 중계한다 (Phase 1 I/O 로직 재활용)
- 기존 바이너리 메시지 프로토콜(0x00~0x03)을 그대로 유지한다
- backpressure 처리(1MB/256KB 임계치)를 그대로 유지한다

### REQ-4: 세션 매칭 및 재연결

클라이언트 연결 시 기존 세션을 탐색하여 자동으로 붙는다.

- 서버 시작 시 `tmux -L purple ls`로 `pt-` 접두사를 가진 세션 목록을 조회한다
- 서버 시작 시 dead 상태의 `pt-` 세션이 있으면 정리한다
- **세션 매칭 규칙 (Phase 2)**: `pt-*` 세션이 하나라도 있으면 해당 세션에 attach. 없으면 새 세션 생성
- 브라우저 새로고침, 네트워크 끊김, 서버 재시작 후 재연결 시에도 기존 세션에 다시 붙는다
- 화면 복원은 tmux attach 시 자동 redraw로 처리된다 (별도 복원 로직 불필요)
- Phase 3+ 확장 시: 클라이언트가 세션 ID를 지정하여 특정 세션에 attach하는 방식으로 전환

### REQ-5: 터미널 리사이즈

tmux 세션의 크기 변경을 지원한다.

- 클라이언트 리사이즈 메시지(0x02)를 받으면 `pty.resize()`로 크기를 변경한다
- tmux의 `aggressive-resize` 옵션을 활성화하여 가장 최근 attach된 클라이언트 크기에 맞춘다

### REQ-6: 세션 종료 정책

세션은 사용자의 명시적 액션으로만 종료된다.

- 터미널에서 `exit` 실행 시: tmux 세션 내 쉘 종료 → tmux 세션 소멸 → attach PTY의 `onExit` 발생 → close code 1000 전송 → 세션 종료 UI 표시
- UI의 세션 종료 버튼 클릭 시: `tmux -L purple kill-session -t {name}`으로 세션을 명시적으로 종료 → close code 1000 전송 → 세션 종료 UI 표시
- WebSocket 연결 끊김(새로고침, 네트워크 끊김, 탭 닫기) 시: `pty.kill()`만 수행 (tmux detach), 세션은 유지
- 서버 종료(SIGTERM/SIGINT) 시: close code 1001 전송, WebSocket + attach PTY만 정리, tmux 세션은 유지

#### detach와 세션 종료 구분

`pty.kill()` (의도적 detach)과 쉘 종료 (세션 소멸) 모두 node-pty의 `onExit`를 발생시키므로, 반드시 구분해야 한다.

- cleanup 로직에 `detaching` 플래그를 도입한다
- WebSocket close/서버 종료 시: `detaching = true` 설정 후 `pty.kill()` → `onExit`에서 detaching이면 close code를 보내지 않음
- 쉘 종료 시: `detaching`이 false인 상태에서 `onExit` 발생 → close code 1000 전송 → 세션 종료 UI

#### 세션 종료 후 새 세션 시작

- 세션 종료 UI에서 "새 세션 시작" 버튼 클릭 시: 새 WebSocket 연결 → 서버가 `pt-*` 세션이 없음을 확인 → 새 tmux 세션(새 nanoid) 생성 → attach

#### WebSocket close code 정책 (Phase 2)

| close code | 의미 | 클라이언트 동작 |
|---|---|---|
| 1000 | 세션 종료 (쉘 exit 또는 명시적 kill) | session-ended UI 표시, 자동 재연결 안 함 |
| 1001 | 서버 종료 | 자동 재연결 → 기존 tmux 세션에 attach |
| 1011 | tmux 세션 생성/attach 실패 | 에러 표시 |
| 1013 | 동시 접속 초과 | 에러 표시 |

### REQ-7: tmux 스크롤백 버퍼

tmux와 xterm.js의 스크롤백 설정을 조율한다.

- tmux의 `history-limit`을 xterm.js의 `scrollback` 설정과 동일하게 맞춘다
- 재연결 시 tmux attach의 자동 redraw는 현재 화면만 그리므로, xterm.js의 스크롤백 히스토리는 새 연결 시점부터 쌓인다

---

## 비기능 요구사항

### NFR-1: 지연 시간

tmux를 경유하더라도 키 입력에서 화면 출력까지 체감 지연이 없어야 한다. (로컬 환경 기준)

### NFR-2: 호환성

Phase 1에서 동작하던 모든 CLI 도구(vim, htop, git 등)가 tmux 환경에서도 정상 동작해야 한다.

### NFR-3: 투명성

사용자는 tmux의 존재를 인지하지 못해야 한다. tmux의 status bar나 prefix key가 노출되지 않는다.

### NFR-4: 기존 프로토콜 호환

클라이언트(프론트엔드) 변경을 최소화한다. 기존 WebSocket 바이너리 프로토콜(STDIN/STDOUT/RESIZE/HEARTBEAT)을 그대로 유지한다.

---

## 범위 제외 (Phase 2에서 하지 않는 것)

| 항목 | 담당 Phase |
|---|---|
| 탭(Surface) 관리 | Phase 3 |
| 화면 분할(Pane) | Phase 4 |
| 프로젝트(Workspace) 관리 | Phase 5 |
| 레이아웃 영속성 (JSON 저장) | Phase 6 |
| 단축키 체계 | Phase 7 |
| Claude Code 연동 | Phase 8 |
| 다중 터미널 세션 UI | Phase 3+ |
| 인증/보안 | 추후 |

---

## 기술 구성

```
Browser                          Server (Custom)                  tmux
┌──────────────┐    WebSocket    ┌──────────────────────┐         ┌────────────┐
│  xterm.js    │ ◄────────────► │  server.ts           │ ◄─────► │  session   │
│  (터미널 UI)  │                │  (tmux 연결 관리)     │  pty    │  purple-{id}│
│              │    HTTP         │                      │         │  └── shell │
│  Next.js     │ ◄────────────► │  Pages Router        │         └────────────┘
│  (페이지)     │                │  (SSR/정적 서빙)      │
└──────────────┘                └──────────────────────┘
```

### 주요 변경점 (Phase 1 대비)

| 항목 | Phase 1 | Phase 2 |
|---|---|---|
| 쉘 실행 | `node-pty`가 직접 쉘 spawn | tmux가 세션 내에서 쉘 실행 |
| 데이터 중계 | `node-pty` onData/write | tmux 세션 attach를 통한 I/O |
| 서버 종료 시 | PTY 프로세스 소멸 | tmux 세션 유지 (detach) |
| 서버 시작 시 | 새 PTY 생성 | 기존 tmux 세션 탐색 → 재연결 |
| 리사이즈 | `pty.resize()` | tmux resize-window |

### 주요 라이브러리

| 용도 | 라이브러리 |
|---|---|
| 프레임워크 | Next.js (Pages Router) + Custom Server |
| 터미널 렌더링 | xterm.js |
| tmux 제어 | tmux CLI (child_process) 또는 node-pty를 통한 tmux attach |
| WebSocket | ws |
| 프론트엔드 | React |

---

## 검증 시나리오

1. **기본 세션 생성**: 브라우저 접속 시 터미널이 정상 동작한다 (Phase 1과 동일한 UX)
2. **새로고침 복원**: 브라우저 새로고침 후 이전 터미널 상태가 그대로 유지된다. 세션 종료 UI가 표시되지 않는다
3. **서버 재시작 복원**: 서버 종료 후 재시작하면 이전 터미널 상태(실행 중인 프로세스, 출력 히스토리)가 그대로 유지된다
4. **인터랙티브 프로그램 복원**: vim으로 파일 편집 중 서버를 재시작해도 vim이 그대로 살아있다
5. **다중 브라우저 탭**: 동일 세션에 여러 브라우저 탭이 연결되어도 정상 동작한다
6. **세션 종료 (exit)**: 터미널에서 `exit`를 실행하면 tmux 세션이 정리되고 세션 종료 UI가 표시된다
7. **세션 종료 후 재생성**: 세션 종료 UI에서 "새 세션 시작" 버튼을 누르면 새 터미널이 시작된다
8. **tmux 투명성**: 사용자가 tmux의 존재를 인지할 수 없다 (status bar 없음, prefix key 비활성)
9. **호환성**: vim, htop, 컬러 출력, 한글 입력이 Phase 1과 동일하게 동작한다
10. **연결 끊김 복원**: 네트워크가 끊겼다 재연결되면 터미널 상태가 유지된다

---

## 제약 조건 / 참고 사항

- **tmux 2.9+ 필수**: `resize-window` 명령 지원을 위해 tmux 2.9 이상 필요. 서버 시작 시 버전 체크하여 미달 시 에러와 함께 종료
- **전용 소켓 격리**: `-L purple` 옵션으로 전용 소켓을 사용하여 사용자의 기존 tmux 세션과 완전히 격리한다
- **tmux 설정 격리**: Purple Terminal 전용 tmux 설정을 사용하여 사용자의 `~/.tmux.conf`와 충돌하지 않아야 한다. `-f` 옵션으로 전용 설정 파일 지정
- **tmux 투명성 설정**: status bar 비활성(`set -g status off`), prefix key 비활성, `aggressive-resize on`
- **세션 네이밍 규칙**: `pt-{workspaceId}-{paneId}-{surfaceId}` 형식. 각 ID는 nanoid로 생성하여 순서 무관하게 고유성 보장. 계층 구조를 반영하여 Phase 3+ 확장에 대비
- **I/O 중계 방식**: node-pty로 `tmux attach`를 spawn하여 I/O를 중계한다. tmux는 세션 생명주기 관리만 담당하고, 기존 node-pty I/O 로직(backpressure, heartbeat 등)을 그대로 재활용한다
- **graceful shutdown 변경**: 서버 종료 시 tmux 세션을 kill하지 않고 WebSocket + attach PTY만 정리한다
- **세션 종료는 명시적 액션만**: 새로고침, 네트워크 끊김, 서버 종료 시 세션은 유지. `exit` 또는 UI 버튼으로만 종료
- **재연결 시 화면 복원**: tmux attach 시 자동 redraw로 현재 화면이 복원됨. 별도 capture-pane 불필요
- **detach/종료 구분 필수**: cleanup에 `detaching` 플래그를 도입하여 의도적 detach와 세션 종료를 구분. 새로고침 시 세션 종료 UI가 표시되면 안 됨

## 확정된 결정사항

| 항목 | 결정 | 근거 |
|---|---|---|
| I/O 중계 방식 | node-pty 단독 (tmux는 세션 관리만) | Phase 1 I/O 로직 최대 재활용, 변경 최소화 |
| tmux 세션 크기 | `aggressive-resize on` | 가장 최근 attach 클라이언트 크기에 맞춤 |
| tmux 소켓 | 전용 소켓 `-L purple` | 사용자 tmux 세션과 완전 격리 |
| 세션 네이밍 | `pt-{workspaceId}-{paneId}-{surfaceId}` (nanoid) | 순서 무관 고유성, 삭제/재정렬에 안전 |
| 스크롤백 버퍼 | tmux `history-limit` = xterm.js `scrollback` | 설정 불일치 방지 |
| tmux 버전 | 2.9+ 필수, 서버 시작 시 체크 | `resize-window` 명령 지원 |
| 세션 종료 | 명시적 액션만 (exit, UI 버튼) | 새로고침/네트워크 끊김에도 세션 유지 |
| detach/종료 구분 | `detaching` 플래그로 구분 | 새로고침 시 세션 종료 UI 오표시 방지 |
| 재연결 복원 | tmux attach 자동 redraw | capture-pane 불필요, 이중 출력 방지 |
| 세션 매칭 (Phase 2) | 첫 번째 `pt-*` 세션에 attach | Phase 3+에서 ID 지정 방식으로 확장 |
