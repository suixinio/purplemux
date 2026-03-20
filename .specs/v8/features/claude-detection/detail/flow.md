# 사용자 흐름

## 1. claude 명령어 감지 기본 흐름

```
1. 사용자가 터미널에서 `claude` 입력 → 실행
2. tmux가 포그라운드 프로세스 변경 감지 (status-interval: 2초)
3. tmux set-titles-string → "claude|/path/to/dir"
4. OSC 시퀀스로 xterm.js에 전달
5. xterm onTitleChange 이벤트 발생
6. pane-container의 onTitleChange 콜백:
   a. formatTabTitle(raw) → 탭 타이틀을 "claude"로 업데이트 (기존)
   b. isClaudeProcess(raw) → true
   c. 현재 panelType 확인:
      - panelType === 'terminal' → 'claude-code'로 자동 전환
      - panelType === 'claude-code' → 무시 (중복 전환 방지)
```

## 2. claude 종료 후 흐름

```
1. claude 프로세스 종료 → 쉘로 복귀
2. tmux set-titles-string → "zsh|/path/to/dir"
3. xterm onTitleChange 이벤트 발생
4. pane-container의 onTitleChange 콜백:
   a. formatTabTitle(raw) → 탭 타이틀을 디렉토리명으로 업데이트 (기존)
   b. isClaudeProcess(raw) → false
   c. panelType 변경하지 않음 (자동 복귀 안 함)
5. 타임라인은 마지막 상태 유지 (정적 표시)
6. 사용자 선택:
   a. 타임라인 계속 확인 → 그대로 사용
   b. 터미널로 돌아가기 → 수동 토글 (panel-toggle)
   c. 다시 claude 실행 → 새 세션 감지 → 타임라인 갱신
```

## 3. 수동 전환 후 재감지 억제 흐름

```
1. panelType === 'claude-code' 상태에서 사용자가 수동 토글
2. panelType → 'terminal'로 변경
3. 쿨다운 타이머 시작 (10초)
4. 쿨다운 기간 중:
   a. onTitleChange에서 claude 감지 → 쿨다운 확인 → 전환 억제
   b. 사용자는 터미널 모드를 유지할 수 있음
5. 쿨다운 만료 후:
   a. onTitleChange에서 claude 감지 → 정상 자동 전환
```

## 4. 탭 전환 시 흐름

```
1. 사용자가 다른 탭으로 전환
2. 새 탭의 tmux 세션에 연결
3. 연결 직후 tmux가 현재 타이틀 재전송
4. xterm onTitleChange 발생 → claude 감지 로직 동작
5. 새 탭에서 claude가 실행 중이면 → 자동 전환
```

## 5. 엣지 케이스

### tmux 세션이 아직 생성되지 않음

```
탭 생성 직후 (tmux 세션 생성 중)
├── xterm 미연결 → onTitleChange 미발생
├── 세션 연결 완료 후 첫 타이틀 이벤트에서 감지
└── 별도 처리 불필요
```

### claude가 아닌 유사 프로세스

```
사용자가 'claude-cli' 또는 'claude_runner' 등 실행
├── parseCurrentCommand(raw) === 'claude-cli'
├── isClaudeProcess → false (정확히 'claude'만 매칭)
└── panelType 변경 없음
```

### 여러 Pane에서 동시에 claude 실행

```
Pane A: claude 실행 → onTitleChange → panelType 자동 전환
Pane B: claude 실행 → onTitleChange → panelType 자동 전환
├── 각 PaneContainer가 독립적으로 감지
└── 타임라인은 각각의 세션에 매핑
```

### xterm 비활성 탭

```
비활성 탭에서 claude 실행
├── xterm이 해당 탭의 세션에 연결되어 있지 않음
├── onTitleChange 미발생 → 감지 불가
├── 사용자가 해당 탭으로 전환 시:
│   ├── 세션 재연결 → tmux 타이틀 전달 → onTitleChange 발생
│   └── claude가 아직 실행 중이면 → 자동 전환
└── 합리적 동작: 사용자가 보고 있지 않은 탭은 전환할 필요 없음
```
