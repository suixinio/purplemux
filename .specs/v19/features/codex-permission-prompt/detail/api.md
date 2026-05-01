# API 연동

## 1. PermissionRequest hook payload

`/api/status/hook?provider=codex` 핸들러가 수신 (`codex-hook-pipeline` 정의):

### Body 예시 — ExecApprovalRequest

```json
{
  "session_id": "01997fee-...",
  "hook_event_name": "PermissionRequest",
  "request": {
    "type": "ExecApprovalRequest",
    "call_id": "call-xxx",
    "command": "rm -rf node_modules",
    "cwd": "/Users/.../my-project",
    "env": { ... }
  }
}
```

### Body — ApplyPatchApprovalRequest

```json
{
  "session_id": "01997fee-...",
  "hook_event_name": "PermissionRequest",
  "request": {
    "type": "ApplyPatchApprovalRequest",
    "call_id": "call-xxx",
    "patches": [
      { "path": "src/foo.ts", "operation": "modify", "diff": "..." },
      { "path": "src/bar.ts", "operation": "create", "content": "..." }
    ]
  }
}
```

### Body — RequestPermissions

```json
{
  "session_id": "01997fee-...",
  "hook_event_name": "PermissionRequest",
  "request": {
    "type": "RequestPermissions",
    "call_id": "call-xxx",
    "permissions": ["network", "file-write"]
  }
}
```

## 2. 핸들러 처리 (`codex-hook-pipeline` 발췌)

```ts
if (payload.hook_event_name === 'PermissionRequest') {
  entry.currentAction = formatPermissionAction(payload.request);
  statusManager.updateTabFromHook(tmuxSession, 'notification');
  // → cliState='needs-input'
  // → 클라이언트 sync-server WebSocket push
}
```

## 3. 클라이언트 컴포넌트

### `PermissionPromptCard`

```tsx
// src/components/features/timeline/permission-prompt-card.tsx
interface IPermissionPromptCardProps {
  tabId: string;
  paneId: string;
}

const PermissionPromptCard: React.FC<IPermissionPromptCardProps> = ({ tabId, paneId }) => {
  const { tab, currentAction } = useTabStore((s) => s.tabs[tabId]);
  const [isSending, setIsSending] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  if (tab.cliState !== 'needs-input') return null;

  const request = tab.permissionRequest;  // 디스플레이 메타 (request type, command, cwd, ...)

  const sendResponse = async (key: 'y' | 'n') => {
    setIsSending(true);
    try {
      await fetch(`/api/tmux/send-keys`, {
        method: 'POST',
        body: JSON.stringify({ session: tab.tmuxSession, text: key }),
      });
      // 3초 timeout
      timeoutRef.current = setTimeout(() => {
        if (tab.cliState === 'needs-input') {
          notifyCodexApprovalNotApplied(() => sendResponse(key));
        }
        setIsSending(false);
      }, 3000);
    } catch (err) {
      notifyCodexApprovalSendFailed();
      setIsSending(false);
    }
  };

  // cliState 변경 감지 → timeout cleared + 카드 fade-out
  useEffect(() => {
    if (tab.cliState !== 'needs-input' && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setIsSending(false);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [tab.cliState]);

  return (
    <div className="border-l-4 border-l-blue-500 bg-card p-4 animate-pulse-thrice">
      <PermissionRequestHeader request={request} />
      <PermissionRequestBody request={request} expanded={showDetails} />
      <button onClick={() => setShowDetails((v) => !v)}>
        {showDetails ? '▲ 접기' : '▼ 자세히 보기'}
      </button>
      <div className="flex gap-3 mt-4">
        <Button onClick={() => sendResponse('y')} disabled={isSending} className="flex-1 min-h-11">
          {isSending ? <Spinner /> : <>Yes <kbd>y</kbd></>}
        </Button>
        <Button variant="outline" onClick={() => sendResponse('n')} disabled={isSending} className="flex-1 min-h-11">
          {isSending ? <Spinner /> : <>No <kbd>n</kbd></>}
        </Button>
      </div>
    </div>
  );
};
```

## 4. send-keys API

```ts
// POST /api/tmux/send-keys
{
  "session": "tmux-xxx",
  "text": "y"
}
```

응답:

```json
{ "ok": true }
```

또는 에러:

```json
{ "ok": false, "error": "tmux server not running" }
```

기존 `lib/tmux.ts`의 `sendKeys` 활용 — y/n은 단일 글자라 `sendKeysSeparated` 불필요.

## 5. 키보드 단축 등록

```ts
// hooks/use-permission-shortcuts.ts
export const usePermissionShortcuts = (tabId: string) => {
  const { tab } = useTabStore((s) => s.tabs[tabId]);
  const sendY = () => sendResponse('y');
  const sendN = () => sendResponse('n');

  useKeyboardShortcut('y', sendY, { enabled: tab.cliState === 'needs-input' && isPanelFocused });
  useKeyboardShortcut('n', sendN, { enabled: tab.cliState === 'needs-input' && isPanelFocused });
  useKeyboardShortcut('Escape', sendN, { enabled: tab.cliState === 'needs-input' && isPanelFocused });
};
```

## 6. 데이터 타입

### `IPermissionRequest` (디스플레이 메타)

```ts
type IPermissionRequest =
  | {
      type: 'ExecApprovalRequest';
      callId: string;
      command: string;
      cwd?: string;
      env?: Record<string, string>;
    }
  | {
      type: 'ApplyPatchApprovalRequest';
      callId: string;
      patches: Array<{
        path: string;
        operation: 'modify' | 'create' | 'delete';
        diff?: string;
        content?: string;
      }>;
    }
  | {
      type: 'RequestPermissions';
      callId: string;
      permissions: string[];
    };
```

### `ITab` 확장

```ts
interface ITab {
  // ... 기존 필드 ...
  permissionRequest?: IPermissionRequest;  // cliState='needs-input' 일 때만 set
}
```

cliState 풀리면 `permissionRequest = undefined` 자동 정리 (status-manager).

## 7. i18n 키

```json
{
  "permissionRequestTitle": "권한 요청",
  "permissionExecMessage": "다음 명령을 실행할까요?",
  "permissionPatchMessage": "다음 파일 변경을 허용할까요?",
  "permissionPermissionsMessage": "다음 권한이 필요합니다",
  "showDetails": "자세히 보기",
  "hideDetails": "접기",
  "approvalGranted": "권한 부여됨",
  "approvalDenied": "권한 거부됨",
  "codexApprovalSendFailed": "권한 응답 전송 실패. 다시 시도해 주세요.",
  "codexApprovalNotApplied": "응답이 codex에 닿지 않았습니다. keymap을 확인하세요."
}
```

## 8. 키 매핑 — Codex default keymap

`codex-rs/tui/src/keymap.rs:509-513` 검증:

| 의도 | 키 |
| --- | --- |
| Approve (this turn) | `y` |
| Approve (whole session) | `a` |
| Approve (matching prefix) | `p` |
| Deny | `d` |
| Decline | `n` 또는 `Esc` |

v19 매핑: **"Yes" → `y`, "No" → `n`** (default keymap 가정).

### 사용자 keymap 인지 (Phase 1 시작 전 검증)

1. `codex --help` 또는 공식 docs로 keymap config 노출 여부 확인
2. 노출 안 함 → E2 토스트 fallback 무관 (그대로 진행)
3. 노출 함 → default 가정 + E2 토스트로 사용자 인지

정식 동적 매핑은 예정 작업.

## 9. 캐싱 / 성능

| 영역 | 전략 |
| --- | --- |
| `permissionRequest` | store만 (캐시 X — cliState 단명) |
| Yes/No 송신 | 매번 fresh send (캐시 X) |
| 자세히 보기 expanded | 컴포넌트 local state |
| 키보드 단축 | `useKeyboardShortcut` global registry |

## 10. 실시간 업데이트

| 이벤트 | 채널 | 동작 |
| --- | --- | --- |
| PermissionRequest hook | sync-server `tab:status` | `cliState='needs-input'` + 카드 마운트 |
| Stop hook (응답 수락 후) | 동일 | `cliState='busy'` 또는 'idle' → 카드 fade-out |
| send-keys 송신 | client → server endpoint | 즉시 응답 (~10ms) |

## 11. 에러 처리

| 에러 | 처리 |
| --- | --- |
| send-keys 실패 (tmux 비정상) | 토스트 E + 버튼 재활성화 |
| 3초 timeout | 토스트 E2 + 카드 유지 |
| `permissionRequest` undefined (race) | 카드 표시 안 함 (`return null`) |
| cliState 'needs-input' 인데 request 정보 없음 (구 데이터) | fallback "권한 요청 — 자세한 정보 없음" + Yes/No만 표시 |
| 키보드 단축 conflict (다른 영역에서 `y` 누름) | enabled 조건 (`isPanelFocused && cliState='needs-input'`)으로 보호 |

## 12. 부수 효과

| 영향 | 설명 |
| --- | --- |
| 페인 타이틀 | tmux 자동 `[ ! ] Action Required` |
| 헤더 인디케이터 | sync-server cliState push로 자동 |
| 알림음 (옵션) | 사용자 설정 — 기본 off (예정 작업) |
