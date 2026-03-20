# 화면 구성

> tmux-backend는 백엔드 전용 feature이므로, 직접적인 사용자 대면 UI는 없다. 이 문서는 클라이언트에 전달되는 메시지, 로그 포맷, 상태 코드 등 "사용자에게 보이는 출력"을 정의한다.

## WebSocket 클로즈 시 클라이언트 표시 메시지

Phase 1 대비 변경된 reason 문자열과 의미:

| 클로즈 코드 | reason 문자열 | 클라이언트 표시 | Phase 1 대비 변경 |
|---|---|---|---|
| 1000 | `Session exited` | "세션이 종료되었습니다." + 새 세션 시작 버튼 | reason 변경 (PTY exited → Session exited) |
| 1001 | `Server shutting down` | reconnecting 상태 → 자동 재연결 | 동일, 재연결 후 기존 세션 복원 |
| 1011 | `Session create failed` | "터미널을 시작할 수 없습니다." + 재연결 버튼 | reason 변경 (PTY spawn failed → Session create failed) |
| 1013 | `Max connections exceeded` | "동시 접속 수를 초과했습니다. 다른 탭을 닫아주세요." | 동일 |

## 서버 로그 포맷

`[terminal]` 접두사 유지. tmux 관련 이벤트 추가:

| 이벤트 | 로그 예시 |
|---|---|
| tmux 환경 검증 | `[terminal] tmux version: 3.4 (>= 2.9 required)` |
| tmux 환경 미달 | `[terminal] tmux not found or version < 2.9, exiting` |
| tmux 세션 생성 | `[terminal] tmux session created: pt-a1b2c3-d4e5f6-g7h8i9 (cols: 120, rows: 40)` |
| tmux 세션 attach | `[terminal] attached to tmux session: pt-a1b2c3-d4e5f6-g7h8i9 (pid: 12345)` |
| tmux 세션 detach | `[terminal] detached from tmux session: pt-a1b2c3-d4e5f6-g7h8i9` |
| tmux 세션 종료 | `[terminal] tmux session ended: pt-a1b2c3-d4e5f6-g7h8i9` |
| 기존 세션 발견 | `[terminal] existing tmux session found: pt-a1b2c3-d4e5f6-g7h8i9` |
| dead 세션 정리 | `[terminal] cleaned dead tmux session: pt-x1y2z3-...` |
| WebSocket 연결 | `[terminal] client connected (active: 3)` |
| WebSocket 종료 | `[terminal] client disconnected (active: 2)` |
| 접속 거부 | `[terminal] connection rejected: max connections (10) reached` |

## HTTP 응답 (WebSocket 외)

Phase 1과 동일. Custom Server의 upgrade 이벤트 핸들러에서 WebSocket을 처리하므로, API Route 자체는 사용하지 않는다.

| 상황 | 처리 |
|---|---|
| `/api/terminal`로 WebSocket Upgrade 요청 | Custom Server가 upgrade → WebSocket 처리 |
| `/api/terminal`로 일반 HTTP 요청 | Next.js 기본 404 또는 API Route가 있다면 426 |
