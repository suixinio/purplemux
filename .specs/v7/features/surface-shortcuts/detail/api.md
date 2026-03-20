# API 연동

## 개요

Surface 탭 단축키는 기존 API를 그대로 사용한다. 새로운 API 엔드포인트 없음.

## 단축키 → API 매핑

| 단축키 | 함수 | API |
|---|---|---|
| `⌘T` / `Ctrl+T` | `createTabInPane(paneId)` | `POST /api/layout/pane/{id}/tabs` |
| `⌘W` / `Ctrl+W` | `deleteTabInPane(paneId, tabId)` | `DELETE /api/layout/pane/{id}/tabs/{tabId}` |
| `⌘⇧[` / `Ctrl+Shift+[` | `switchTabInPane(paneId, tabId)` | 없음 (로컬 state) |
| `⌘⇧]` / `Ctrl+Shift+]` | `switchTabInPane(paneId, tabId)` | 없음 (로컬 state) |
| `⌃1~9` / `Alt+1~9` | `switchTabInPane(paneId, tabId)` | 없음 (로컬 state) |

## POST /api/layout/pane/{paneId}/tabs (기존)

### 용도

Pane에 새 탭 생성. tmux 세션도 함께 생성.

### 요청

```
POST /api/layout/pane/{paneId}/tabs
Content-Type: application/json

{
  "workspaceId": "ws-abc123",
  "cwd": "/Users/user/project"
}
```

### 응답

```json
{
  "id": "tab-002",
  "sessionName": "pt-ws-abc123-tab-002",
  "name": "zsh",
  "order": 1
}
```

## DELETE /api/layout/pane/{paneId}/tabs/{tabId} (기존)

### 용도

탭 삭제. tmux 세션도 함께 종료.

### 요청

```
DELETE /api/layout/pane/{paneId}/tabs/{tabId}?workspace={wsId}
```

### 응답

```
200 OK
```

## switchTabInPane — 로컬 state만

`switchTabInPane(paneId, tabId)`는 API 호출 없이 `pane.activeTabId`만 갱신. PaneContainer가 활성 탭 변경을 감지하여 WebSocket 연결을 전환한다.

## 탭 인덱스 계산 로직

단축키 콜백에서 탭 인덱스를 계산하는 로직은 API가 아닌 로컬 상태에서 처리:

```typescript
// 이전/다음 탭
const tabs = focusedPane.tabs.sort((a, b) => a.order - b.order);
const currentIndex = tabs.findIndex(t => t.id === focusedPane.activeTabId);

// ⌘⇧] (다음)
const nextIndex = currentIndex + 1;
if (nextIndex >= tabs.length) return; // 끝에서 멈춤

// ⌘⇧[ (이전)
const prevIndex = currentIndex - 1;
if (prevIndex < 0) return; // 끝에서 멈춤

// ⌃N (N번째)
const targetIndex = n - 1; // 1-indexed → 0-indexed
if (targetIndex >= tabs.length) return;

// ⌃9 (마지막)
const lastIndex = tabs.length - 1;
```
