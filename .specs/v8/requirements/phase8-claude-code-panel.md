# Phase 8 — Claude Code Panel PRD

## 목표

터미널에서 Claude Code 실행 시, 터미널 위에 타임라인 뷰를 제공하여 대화 흐름과 도구 호출을 시각적으로 확인할 수 있게 하는 것.

Claude Code Panel은 기존 Terminal Panel에 **타임라인 영역**이 추가된 형태다.

## 완료 조건

Claude Code 실행 시 상단에 타임라인, 하단에 터미널이 표시되고 실시간으로 업데이트된다.

---

## 현재 상태 (Phase 7 완료)

### 이미 구현된 것

- Terminal Panel: xterm.js + tmux 기반 웹 터미널
- Panel 타입: 현재 Terminal 타입만 존재
- Surface: 탭 단위로 Panel을 렌더링
- 레이아웃 영속성: Workspace/Pane/Surface 구조 저장/복원
- 단축키: cmux 호환 키보드 조작

### Phase 8에서 추가할 것

- Claude Code Panel 타입 도입 (Terminal + 타임라인)
- `claude` 명령어 실행 감지 → Panel 타입 자동 전환
- Claude Code 세션 파일 파싱 → 타임라인 렌더링
- 세션 파일 실시간 감시 (fs.watch)
- Panel 타입 수동 전환 (Claude Code ↔ Terminal)

---

## Panel 레이아웃

```
┌─ Claude Code Panel ──────────────────────┐
│                                          │
│  [타임라인 영역]                           │
│  ├─ 14:30 사용자: "버그 수정해줘"           │
│  ├─ 14:30 Claude: Read src/main.ts       │
│  ├─ 14:31 Claude: Edit src/main.ts       │
│  └─ 14:32 Claude: "수정 완료했습니다"       │
│                                          │
│  ─────────────────────────────────────── │
│  [터미널 영역 (tmux)]                      │
│  $ claude --resume {session_id}          │
│  >                                       │
└──────────────────────────────────────────┘
```

- **타임라인 영역** (상단): Claude Code 세션 파일(JSON)을 파싱하여 대화 흐름 시각화
- **터미널 영역** (하단): 기존 Terminal Panel과 동일한 tmux 기반 터미널

---

## 요구사항

### REQ-1: Panel 타입 시스템

Surface가 렌더링하는 Panel에 타입 개념을 도입한다.

- 지원 타입: `terminal` (기존), `claude-code` (신규)
- Surface 데이터에 `panelType` 필드 추가
- 기본값은 `terminal` (기존 동작과 호환)
- `panelType`에 따라 다른 Panel 컴포넌트를 렌더링
- `panelType` 변경은 layout.json에 영속화

### REQ-2: `claude` 명령어 실행 감지

터미널에서 `claude` 명령어 실행을 감지하여 Panel 타입을 자동으로 `claude-code`로 전환한다.

- tmux 세션의 출력 스트림에서 `claude` 명령어 실행을 감지
- 감지 시 해당 Surface의 `panelType`을 `claude-code`로 자동 전환
- 감지 방식의 상세 로직은 구현 시 확정 (tmux 프로세스 모니터링, 셸 프롬프트 파싱 등)

### REQ-3: Claude Code 세션 파일 매핑

현재 터미널의 프로젝트 디렉토리를 기반으로 Claude Code 세션 파일을 찾는다.

- Claude Code 세션 파일 위치: `~/.claude/projects/` 하위
- 프로젝트 디렉토리 경로와 세션 파일 경로를 매칭
- Workspace의 프로젝트 디렉토리를 기준으로 해당 프로젝트의 세션 파일을 탐색
- 매핑 로직의 상세 규칙은 구현 시 Claude Code의 실제 경로 구조를 분석하여 확정

### REQ-4: 세션 파일 파싱 및 타임라인 렌더링

Claude Code 세션 파일(JSON)을 파싱하여 타임라인 UI로 렌더링한다.

- 파싱 대상 항목:
  - 사용자 메시지
  - Claude 응답 (텍스트)
  - 도구 호출 (Read, Edit, Bash 등) 및 결과
- 시간순 표시: 각 항목에 타임스탬프 표시
- 파일 변경 내역: diff 뷰로 펼쳐볼 수 있음
- 타임라인 영역은 스크롤 가능
- 새로운 항목 추가 시 자동 스크롤 (하단 고정)

### REQ-5: 세션 파일 실시간 감시

`fs.watch`로 세션 파일을 감시하여 타임라인을 실시간 업데이트한다.

- 서버 측에서 `fs.watch`로 세션 파일 변경 감지
- 변경 감지 시 파싱 후 WebSocket으로 클라이언트에 전송
- 클라이언트는 수신 즉시 타임라인 UI 업데이트
- debounce 적용하여 과도한 업데이트 방지

### REQ-6: Panel 타입 수동 전환

사용자가 Panel 타입을 수동으로 전환할 수 있다.

- Claude Code ↔ Terminal 간 수동 전환 UI 제공 (탭 바 또는 Panel 내 토글)
- 전환 시 터미널 세션은 유지 (tmux 세션 불변)
- Terminal 모드: 전체 영역이 터미널 (기존과 동일)
- Claude Code 모드: 상단 타임라인 + 하단 터미널

---

## 비기능 요구사항

### NFR-1: 실시간성

세션 파일 변경 후 타임라인 UI 업데이트까지 체감 지연이 없어야 한다.

### NFR-2: 영속성 호환

Panel 타입 정보가 layout.json에 저장되어, 서버 재시작 시 Claude Code Panel 상태가 복원되어야 한다.

### NFR-3: 터미널 영향 없음

Claude Code Panel 전환이 터미널 세션에 영향을 주지 않아야 한다. tmux 세션은 Panel 타입과 무관하게 유지된다.

### NFR-4: 성능

타임라인 렌더링이 터미널 입출력 성능에 영향을 주지 않아야 한다. 세션 파일이 커도 렌더링 지연이 없어야 한다.

---

## 범위 제외 (Phase 8에서 하지 않는 것)

| 항목 | 사유 |
|---|---|
| 과거 세션 목록 탐색 UI | Phase 9 범위 |
| `--resume` 자동 연결 | Phase 9 범위 |
| 세션 메타정보 (요약, 태그 등) 표시 | Phase 9 범위 |
| 타임라인 내 대화 입력 (채팅 UI) | 터미널 CLI로 상호작용 |
| 타임라인 검색/필터 | 추후 필요 시 구현 |
| Claude Code Panel 전환 단축키 | 추후 단축키 확장 시 추가 |

---

## 기술 구성

### Panel 타입 전환 흐름

```
터미널에서 `claude` 실행
├── 서버: 명령어 실행 감지
├── 서버: 프로젝트 디렉토리 기반 세션 파일 경로 매칭
├── 서버: panelType을 claude-code로 변경 → layout.json 저장
├── 서버: fs.watch로 세션 파일 감시 시작
├── 클라이언트: panelType 변경 수신 → Claude Code Panel 렌더링
└── 클라이언트: 타임라인 데이터 수신 → UI 업데이트
```

### 세션 파일 감시 아키텍처

```
서버 (Node.js)
├── fs.watch(세션 파일)
│   ├── 변경 감지 → 파일 파싱
│   └── 파싱 결과 → WebSocket 전송
└── 클라이언트
    ├── WebSocket 수신
    └── 타임라인 UI 업데이트 (React state)
```

### Claude Code Panel 컴포넌트 구조

```
ClaudeCodePanel
├── TimelineView (상단)
│   ├── UserMessage — 사용자 메시지 표시
│   ├── ToolCall — 도구 호출 표시 (Read, Edit, Bash 등)
│   │   └── DiffView — 파일 변경 diff (접기/펼치기)
│   └── AssistantMessage — Claude 응답 표시
└── TerminalView (하단)
    └── 기존 xterm.js 터미널 (Terminal Panel과 동일)
```

---

## 검증 시나리오

1. **자동 전환**: 터미널에서 `claude` 입력 → Panel이 Claude Code 모드로 전환, 타임라인 영역 표시
2. **타임라인 표시**: Claude Code 세션 진행 중 → 사용자 메시지, 도구 호출, 응답이 시간순으로 표시
3. **실시간 업데이트**: Claude가 도구를 호출할 때마다 → 타임라인에 새 항목이 즉시 추가
4. **diff 뷰**: 파일 변경 도구 호출 항목 클릭 → diff가 펼쳐짐
5. **수동 전환**: Panel 타입 토글 클릭 → Terminal ↔ Claude Code 전환, 터미널 세션 유지
6. **영속성**: Claude Code Panel 상태에서 브라우저 새로고침 → Panel 타입이 claude-code로 복원, 타임라인 재로드
7. **터미널 정상 동작**: Claude Code Panel의 터미널 영역에서 일반 명령어 입력 → 정상 실행
8. **세션 파일 없음**: claude 명령어 감지되었으나 세션 파일이 아직 없는 경우 → 빈 타임라인 표시, 파일 생성 시 자동 업데이트
9. **대용량 세션**: 긴 대화 세션 → 타임라인 스크롤 정상, 렌더링 지연 없음
10. **기존 기능 호환**: Claude Code Panel 추가 후에도 기존 Terminal Panel, 탭 조작, Pane 분할 등 모두 정상 동작
