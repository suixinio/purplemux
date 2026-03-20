# API 연동

## 개요

Workspace 전환 단축키는 기존 API를 그대로 사용한다. 스크롤백 지우기는 API 호출 없이 xterm.js 클라이언트 메서드만 사용. 새로운 API 엔드포인트 없음.

## 단축키 → API 매핑

| 단축키 | 함수 | API |
|---|---|---|
| `⌘1~8` / `Ctrl+1~8` | `switchWorkspace(wsId)` | `PATCH /api/workspace/active` |
| `⌘9` / `Ctrl+9` | `switchWorkspace(wsId)` | `PATCH /api/workspace/active` |
| `⌘K` / `Ctrl+K` | `clear()` (xterm.js) | 없음 |

## PATCH /api/workspace/active (기존)

### 용도

활성 Workspace ID를 서버에 저장.

### 요청

```
PATCH /api/workspace/active
Content-Type: application/json

{
  "activeWorkspaceId": "ws-def456"
}
```

### 응답

```
200 OK
```

### 에러 처리

- fire-and-forget (`.catch(() => {})`)
- 실패해도 로컬 state는 변경됨 (현재 세션 정상 동작)
- 다음 호출 시 최신 값 전송 → 자동 복구

## GET /api/layout?workspace={wsId} (기존)

### 용도

Workspace 전환 후 해당 Workspace의 레이아웃 fetch.

### 요청

```
GET /api/layout?workspace=ws-def456
```

### 응답

```json
{
  "root": {
    "type": "pane",
    "id": "pane-001",
    "tabs": [...],
    "activeTabId": "tab-001"
  },
  "focusedPaneId": "pane-001",
  "updatedAt": "2026-03-20T10:00:00.000Z"
}
```

## Workspace 목록 순서

단축키 번호는 `ws.workspaces` 배열 순서 기준 (1-indexed):
- `⌘1` → `workspaces[0]`
- `⌘2` → `workspaces[1]`
- `⌘9` → `workspaces[workspaces.length - 1]`

배열 순서는 `GET /api/workspace` 응답의 `workspaces` 배열 순서를 따른다.

## xterm.js clear() — API 없음

`clear()`는 xterm.js Terminal 인스턴스의 메서드로, 클라이언트 사이드에서만 동작:
- 스크롤백 버퍼 삭제
- 서버/tmux 세션에 영향 없음
- WebSocket 통신 없음
