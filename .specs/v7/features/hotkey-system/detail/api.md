# API 연동

## 개요

단축키 시스템 자체는 새로운 API를 추가하지 않는다. 모든 단축키 콜백은 기존 layout/workspace 훅 함수를 호출하며, 해당 함수가 이미 정의된 API를 사용한다.

## 단축키 → API 호출 매핑

| 단축키 | 콜백 함수 | API 호출 |
|---|---|---|
| `⌘D` / `Ctrl+D` | `splitPane(paneId, 'vertical')` | `POST /api/layout/pane` |
| `⌘⇧D` / `Ctrl+Shift+D` | `splitPane(paneId, 'horizontal')` | `POST /api/layout/pane` |
| `⌥⌘←/→/↑/↓` | `focusPane(paneId)` | 없음 (로컬 state만) |
| `⌘T` / `Ctrl+T` | `createTabInPane(paneId)` | `POST /api/layout/pane/{id}/tabs` |
| `⌘W` / `Ctrl+W` | `deleteTabInPane(paneId, tabId)` | `DELETE /api/layout/pane/{id}/tabs/{tabId}` |
| `⌘⇧[` `⌘⇧]` | `switchTabInPane(paneId, tabId)` | 없음 (로컬 state만) |
| `⌃1~9` / `Alt+1~9` | `switchTabInPane(paneId, tabId)` | 없음 (로컬 state만) |
| `⌘1~9` / `Ctrl+1~9` | `switchWorkspace(wsId)` | `PATCH /api/workspace/active` |
| `⌘K` / `Ctrl+K` | `clear()` (xterm.js) | 없음 |

## 서버 저장 타이밍

단축키 입력은 마우스 클릭과 동일한 빈도로 발생하므로, 기존 API 호출 패턴 변경 없음.

- `splitPane`, `createTabInPane`, `deleteTabInPane` — async, 서버 응답 후 layout 확정
- `focusPane`, `switchTabInPane` — 로컬 state만. 레이아웃 변경 시 자동 저장 (Phase 6 영속성)
- `switchWorkspace` — fire-and-forget PATCH

## 새로운 파일

### src/lib/keyboard-shortcuts.ts (신규)

순수 유틸리티 파일. API 호출 없음.

```typescript
// OS 감지
const isMac: boolean

// 키 매핑 상수 (react-hotkeys-hook 키 문법)
const KEY_MAP: Record<string, string>

// xterm.js 판별용 함수
const isAppShortcut: (event: KeyboardEvent) => boolean
```

### src/hooks/use-keyboard-shortcuts.ts (신규)

useHotkeys를 사용하는 훅. API를 직접 호출하지 않고 layout/workspace 훅 함수를 호출.

```typescript
interface IUseKeyboardShortcutsOptions {
  layout: ReturnType<typeof useLayout>;
  ws: ReturnType<typeof useWorkspace>;
}

const useKeyboardShortcuts = (options: IUseKeyboardShortcutsOptions) => void
```

### src/hooks/use-terminal.ts (수정)

`customKeyEventHandler` 옵션 추가. API 변경 없음.

```typescript
interface IUseTerminalOptions {
  // ... 기존 ...
  customKeyEventHandler?: (event: KeyboardEvent) => boolean;
}
```

## 에러 처리

- 단축키 콜백 내부의 에러는 기존 함수의 에러 처리 로직이 담당
- `splitPane`이 실패하면 기존대로 toast 에러 또는 silent fail
- 단축키 시스템 자체는 에러를 발생시키지 않음
