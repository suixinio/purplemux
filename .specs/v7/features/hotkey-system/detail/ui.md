# 화면 구성

## 개요

UI 레이아웃 변경 없음. 단축키 시스템은 키 매핑 상수 + 훅 + xterm.js 연동으로만 구성되며, 시각적 요소를 추가하지 않는다.

## 단축키 시스템 구조

```
terminal-page.tsx
├── useWorkspace()         ← 기존
├── useLayout()            ← 기존
└── useKeyboardShortcuts() ← 신규 훅 (layout, ws 의존)
```

### useKeyboardShortcuts 훅 위치

`terminal-page.tsx`에서 한 번만 호출. `useLayout`과 `useWorkspace` 훅의 반환값을 의존성으로 받아 단축키를 등록한다.

```
const ws = useWorkspace();
const layout = useLayout({ workspaceId: ws.activeWorkspaceId, ... });
useKeyboardShortcuts({ layout, ws });
```

## 키 매핑 상수 파일 구조

```
src/
├── lib/
│   └── keyboard-shortcuts.ts   ← 키 매핑 상수 + OS 판별 유틸
└── hooks/
    └── use-keyboard-shortcuts.ts  ← useHotkeys 기반 훅
```

### keyboard-shortcuts.ts 구조

```
┌─────────────────────────────────────────────────────┐
│  OS 판별: isMac = navigator.platform 또는 userAgent  │
├─────────────────────────────────────────────────────┤
│  키 매핑 상수 (액션 → react-hotkeys-hook 키 문법)     │
│                                                     │
│  SPLIT_VERTICAL:    meta+d / ctrl+d                 │
│  SPLIT_HORIZONTAL:  meta+shift+d / ctrl+shift+d     │
│  FOCUS_LEFT:        meta+alt+ArrowLeft / ...         │
│  NEW_TAB:           meta+t / ctrl+t                 │
│  CLOSE_TAB:         meta+w / ctrl+w                 │
│  ...                                                │
├─────────────────────────────────────────────────────┤
│  앱 단축키 Set (xterm.js 판별용)                      │
│  → 등록된 키 조합을 KeyboardEvent로 매칭하는 함수      │
└─────────────────────────────────────────────────────┘
```

## xterm.js 키 이벤트 분리

### 현재 (Phase 6)

```
키 입력 → xterm.js가 모든 입력 처리 → onInput → sendStdin
```

### 변경 후 (Phase 7)

```
키 입력
├── xterm.js attachCustomKeyEventHandler
│   ├── 앱 단축키 조합? → return false (브라우저로 전파)
│   └── 아님 → return true (터미널 처리)
└── document keydown (react-hotkeys-hook)
    ├── 등록된 키 조합? → preventDefault + 콜백 실행
    └── 아님 → 무시
```

### use-terminal.ts 변경 포인트

`terminalInstance`는 현재 private ref. 단축키 판별 함수를 외부에서 주입할 수 있도록 옵션 추가:

```
interface IUseTerminalOptions {
  onInput?: (data: string) => void;
  onResize?: (cols: number, rows: number) => void;
  onTitleChange?: (title: string) => void;
  customKeyEventHandler?: (event: KeyboardEvent) => boolean;  ← 신규
}
```

터미널 초기화 시 `attachCustomKeyEventHandler` 호출:

```
if (options?.customKeyEventHandler) {
  terminal.attachCustomKeyEventHandler(options.customKeyEventHandler);
}
```

## 시각적 변경 없음

- 단축키 시스템은 기존 UI 함수를 호출할 뿐, 새로운 시각 요소 없음
- 포커스 표시, 탭 하이라이트 등은 기존 스타일 그대로 활용
