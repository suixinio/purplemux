# 사용자 흐름

## 1. 단축키 입력 기본 흐름

```
1. 사용자가 키 조합 입력 (예: ⌘D)
2. xterm.js attachCustomKeyEventHandler 호출
   a. isAppShortcut(event) 판별 — 키 매핑 상수의 Set에서 O(1) 룩업
   b. 앱 단축키 → return false (터미널에서 무시, 브라우저로 전파)
   c. 일반 입력 → return true (터미널이 처리, onInput → sendStdin)
3. react-hotkeys-hook가 document keydown 캐치
   a. useHotkeys에 등록된 키 조합 매칭
   b. preventDefault() + 등록된 콜백 실행
4. 콜백이 기존 layout/workspace 훅 함수 호출
5. UI 즉시 반영 (optimistic update) + 비동기 서버 저장
```

## 2. 일반 터미널 입력 흐름 (변경 없음)

```
1. 사용자가 일반 키 입력 (예: ls -la)
2. xterm.js attachCustomKeyEventHandler 호출
   a. isAppShortcut(event) → false
   b. return true (터미널이 처리)
3. onInput(data) → sendStdin(data) → WebSocket → tmux 세션
4. react-hotkeys-hook → 매칭 없음 → 무시
```

## 3. 복사/붙여넣기 흐름 (변경 없음)

```
1. 사용자가 ⌘C 또는 ⌘V 입력
2. xterm.js attachCustomKeyEventHandler
   a. isAppShortcut(event) → false (⌘C/⌘V는 앱 단축키로 등록하지 않음)
   b. return true
3. xterm.js 자체 복사/붙여넣기 처리
4. react-hotkeys-hook → 매칭 없음 → 무시
```

## 4. 브라우저 단축키 차단 흐름

```
1. 사용자가 ⌘T 입력 (브라우저: 새 탭)
2. xterm.js attachCustomKeyEventHandler
   a. isAppShortcut(event) → true
   b. return false (브라우저로 전파)
3. react-hotkeys-hook가 document keydown 캐치
   a. 'meta+t' 매칭 → preventDefault() (브라우저 새 탭 차단)
   b. createTabInPane(focusedPaneId) 호출
4. 앱의 새 탭 생성 동작 실행
```

## 5. 크로스플랫폼 키 분기 흐름

```
1. 페이지 로드 시 keyboard-shortcuts.ts에서 OS 판별
   a. navigator.platform 또는 navigator.userAgent 확인
   b. macOS → meta 기반 키 매핑 반환
   c. Windows/Linux → ctrl 기반 키 매핑 반환
2. useKeyboardShortcuts 훅이 해당 OS의 키 매핑으로 useHotkeys 등록
3. isAppShortcut() 판별도 동일한 키 매핑 참조
```

## 6. 포커스된 Pane이 없는 경우

```
1. layout.focusedPaneId가 null인 상태 (이론적으로 발생하지 않으나 방어)
2. 단축키 입력
3. 콜백에서 focusedPaneId null 체크
   a. null이면 첫 번째 Pane을 자동 포커스 후 동작 실행
   b. 또는 무시
```

## 7. 엣지 케이스

### 레이아웃 로딩 중 단축키 입력

```
layout.layout === null (초기 fetch 전)
├── useHotkeys 콜백에서 layout null 체크
├── null이면 무시 (아무 동작 없음)
└── 로딩 완료 후 정상 동작
```

### 분할 진행 중 추가 분할 요청

```
⌘D → splitPane 시작 (isSplitting = true)
├── 즉시 ⌘D 재입력
├── canSplit === false (isSplitting 플래그)
└── 무시 — 기존 splitPane의 동시 실행 방지 로직 그대로 활용
```

### Workspace 전환 중 탭 단축키

```
Workspace 전환 진행 중 (fadeOut → clearLayout → fetch)
├── layout.layout === null (clearLayout 후)
├── ⌘T, ⌘W 등 입력
└── layout null 체크 → 무시
```
