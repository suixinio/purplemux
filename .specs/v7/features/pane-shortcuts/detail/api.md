# API 연동

## 개요

Pane 단축키는 기존 API를 그대로 사용한다. 새로운 API 엔드포인트 없음.

## 단축키 → API 매핑

| 단축키 | 함수 | API |
|---|---|---|
| `⌘D` / `Ctrl+D` | `splitPane(paneId, 'vertical')` | `POST /api/layout/pane` |
| `⌘⇧D` / `Ctrl+Shift+D` | `splitPane(paneId, 'horizontal')` | `POST /api/layout/pane` |
| `⌥⌘←/→/↑/↓` | `focusPane(paneId)` | 없음 (로컬 state) |

## POST /api/layout/pane (기존)

### 용도

새 Pane + 기본 Tab 생성. tmux 세션도 함께 생성.

### 요청

```
POST /api/layout/pane
Content-Type: application/json

{
  "workspaceId": "ws-abc123",
  "cwd": "/Users/user/project"
}
```

### 응답

```json
{
  "paneId": "pane-xyz",
  "tab": {
    "id": "tab-001",
    "sessionName": "pt-ws-abc123-tab-001",
    "name": "zsh",
    "order": 0
  }
}
```

## focusPane — 로컬 state만

`focusPane(paneId)`는 API 호출 없이 로컬 `focusedPaneId`만 갱신. 레이아웃 저장은 Phase 6의 자동 저장 메커니즘이 처리.

## 신규 함수: findAdjacentPaneInDirection

API 호출 없음. 순수 함수로 레이아웃 트리에서 인접 Pane을 찾는다.

```typescript
const findAdjacentPaneInDirection = (
  root: TLayoutNode,
  currentPaneId: string,
  direction: 'left' | 'right' | 'up' | 'down',
) => string | null
```

- `use-layout.ts` 또는 `keyboard-shortcuts.ts`에 위치
- 트리 탐색만 수행, 부수 효과 없음
- 결과: 이동 대상 Pane ID 또는 null (이동 불가)
