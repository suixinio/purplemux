# 사용자 흐름

## 1. 서버 시작 → 초기 스캔

```
1. 서버 시작
2. 레이아웃 파일(~/.purple-terminal/workspaces/)에서 모든 Workspace/Pane/탭 목록 로드
3. 각 탭의 tmux 세션명 수집
4. 일괄 스캔: getPaneCurrentCommand() → Claude 프로세스 여부 확인
5. Claude 프로세스 발견 시: detectActiveSession() → cliState 결정
6. 서버 메모리에 탭 상태 초기화 (모든 dismissed = false)
7. 폴링 타이머 시작 (5~10초)
```

## 2. 클라이언트 접속 → 초기 동기화

```
1. 클라이언트 WebSocket 연결 (/api/status)
2. 서버: 현재 전체 탭 상태를 status:sync로 전송
3. 클라이언트: useClaudeStatusStore에 tabs 전체 반영
4. 각 UI 컴포넌트가 selector로 필요한 상태 구독 → 렌더링
```

## 3. 비활성 탭 상태 변경 감지 (폴링)

```
1. 서버 폴링 타이머 발동 (5~10초 주기)
2. 모든 탭의 tmux 세션 일괄 스캔
   - tmux list-panes로 배치 조회
   - 각 pane의 current command 확인
3. 이전 상태와 비교 (diff)
4. 변경된 탭만 처리:
   a. inactive → busy (Claude 시작 감지):
      - cliState = 'busy', dismissed = false
      - status:update broadcast
   b. busy → idle (프롬프트 복귀 감지):
      - cliState = 'idle', dismissed = false
      - status:update broadcast → 클라이언트에서 needs-attention으로 표시
   c. busy/idle → inactive (Claude 종료):
      - cliState = 'inactive', dismissed = true
      - status:update broadcast
5. 변경 없으면 아무것도 전송하지 않음
```

## 4. 활성 탭 상태 보고 (이벤트 기반)

```
1. 클라이언트: 활성 탭의 pane-container에서 claudeCliState 변경 감지
2. 기존 로직: isClaudeProcess(title) + useTimeline → cliState 결정
3. cliState 변경 시 서버에 status:tab-active-report 전송
4. 서버: 해당 탭 상태 갱신
   a. busy → idle 전환 시: dismissed = false 설정
   b. inactive → busy 전환 시: dismissed = false 설정
5. 서버: status:update를 다른 클라이언트에 broadcast
   (보고한 클라이언트에는 재전송 불필요 — 이미 로컬 반영)
```

## 5. 탭 방문 → dismiss 동기화

```
1. 클라이언트 A: 사용자가 needs-attention 탭 클릭
2. 클라이언트 A: 로컬 스토어에서 즉시 dismissed = true (optimistic)
3. 클라이언트 A → 서버: status:tab-dismissed { tabId }
4. 서버: 해당 탭의 dismissed = true 설정
5. 서버 → 클라이언트 B, C: status:update { tabId, cliState, dismissed: true }
6. 클라이언트 B, C: 해당 탭의 needs-attention dot 제거
```

## 6. 새 클라이언트 접속 (멀티 디바이스)

```
1. 모바일 브라우저로 서버 접속
2. WebSocket 연결 → status:sync 수신
3. 이미 데스크톱에서 dismiss한 탭: dismissed = true → dot 없음
4. 데스크톱에서 미확인 탭: dismissed = false → dot 표시
5. 모바일에서 탭 방문 → dismiss → 데스크톱에도 반영
```

## 7. 탭 생성/삭제

```
탭 생성:
1. 새 탭 생성 이벤트
2. 서버 상태 매니저에 { cliState: 'inactive', dismissed: true } 초기 등록
3. status:update broadcast (idle 상태이므로 UI 변화 없음)

탭 삭제:
1. 탭 삭제 이벤트
2. 서버 상태 매니저에서 해당 엔트리 제거
3. status:update broadcast (삭제된 탭 → 클라이언트 스토어에서 제거)
```

## 8. 엣지 케이스

### 서버 재시작

```
1. 서버 재시작 → 전체 탭 재스캔
2. 모든 dismissed = false (이전 확인 상태 소실)
3. 현재 Claude idle인 탭 → needs-attention으로 표시
4. 클라이언트 WebSocket 재접속 → status:sync로 새 상태 수신
```

### WebSocket 연결 끊김

```
1. 네트워크 단절 또는 서버 다운
2. 클라이언트: wsConnected = false
3. 자동 재접속 시도 (exponential backoff: 1s, 2s, 4s, max 30s)
4. 재접속 성공 → status:sync로 전체 상태 복구
5. 재접속 실패 동안: 마지막으로 받은 상태 유지 (stale이지만 표시는 유지)
```

### tmux 세션 소멸

```
1. 사용자가 tmux 세션을 직접 종료 (kill-session)
2. 서버 폴링에서 해당 세션 조회 실패
3. 해당 탭 → cliState: 'inactive', dismissed: true
4. status:update broadcast → 클라이언트에서 인디케이터 제거
```

### 폴링 주기 자동 조절

```
탭 수 ≤ 10: 5초 주기
탭 수 11~20: 8초 주기
탭 수 21+: 15초 주기
```
