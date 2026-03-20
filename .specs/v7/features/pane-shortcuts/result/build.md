---
step: build
timestamp: 2026-03-20 00:20
elapsed: 3분 38초
status: completed
---
All changes are clean. Here's a summary of what was implemented:

## 변경 내용

### `src/lib/keyboard-shortcuts.ts`
- `FOCUS_PREV`/`FOCUS_NEXT` (방향 2개 묶음) → `FOCUS_LEFT`/`FOCUS_RIGHT`/`FOCUS_UP`/`FOCUS_DOWN` (4개 개별 키)으로 분리
- xterm.js 앱 단축키 Set은 이미 4방향 화살표가 등록되어 있어 변경 불필요

### `src/hooks/use-layout.ts`
- `findAdjacentPaneInDirection(root, paneId, direction)` 순수 함수 추가
- 레이아웃 트리를 root → 현재 pane까지 경로 구축 후, 역방향 탐색으로 방향에 맞는 인접 pane 판정
- `TDirection` 타입 export

### `src/hooks/use-keyboard-shortcuts.ts`
- 기존 flat-list 순회 방식(prev/next) → 트리 기반 방향 판정으로 교체
- `focusDirection` 콜백으로 4방향 핸들러 통합

### 동작 방식
| 단축키 | 동작 |
|---|---|
| `⌥⌘←` / `Ctrl+Alt+←` | 수직 split에서 왼쪽 pane으로 |
| `⌥⌘→` / `Ctrl+Alt+→` | 수직 split에서 오른쪽 pane으로 |
| `⌥⌘↑` / `Ctrl+Alt+↑` | 수평 split에서 위쪽 pane으로 |
| `⌥⌘↓` / `Ctrl+Alt+↓` | 수평 split에서 아래쪽 pane으로 |

해당 방향에 pane이 없으면 무시. 중첩 분할에서는 상위 split 노드까지 올라가서 탐색.

---

다음 feature를 빌드하려면 `/new` 후 `/4-build`를 실행하세요.
(컨텍스트를 정리하고 새로운 세션에서 더 정확한 코드를 생성합니다)
