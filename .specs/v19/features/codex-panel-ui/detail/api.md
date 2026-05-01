# API 연동

## 1. 컴포넌트 시그니처

### `CodexPanel`

```tsx
// src/components/features/panels/codex-panel.tsx
interface ICodexPanelProps {
  paneId: string;
  tabId: string;
  tab: ITab;
}

const CodexPanel: React.FC<ICodexPanelProps> = ({ paneId, tabId, tab }) => {
  const { agentProcess, agentInstalled, cliState, agentState } = useTabStore((s) => s.tabs[tabId]);
  // ... ClaudeCodePanel 거의 복사 + provider 분기 ...
};

export default CodexPanel;
```

`React.lazy` 으로 라우팅:

```tsx
// src/components/features/panel-container.tsx
const CodexPanel = React.lazy(() => import('./panels/codex-panel'));
```

### `MobileCodexPanel`

```tsx
// src/components/features/panels/mobile-codex-panel.tsx
const MobileCodexPanel: React.FC<ICodexPanelProps> = (props) => {
  // 동일 store, 모바일 레이아웃
};
```

## 2. panelType 분기 (`pane-container.tsx`)

```tsx
const renderPanel = () => {
  switch (tab.panelType) {
    case 'terminal': return <TerminalPanel ... />;
    case 'claude-code': return <ClaudeCodePanel ... />;
    case 'codex-cli': return <CodexPanel ... />;  // 신규
    case 'web-browser': return <WebBrowserPanel ... />;
    case 'diff': return <DiffPanel ... />;
  }
};
```

## 3. 단축키 등록 (`use-keyboard-shortcuts.ts`)

```ts
const shortcuts = [
  { key: 'cmd+shift+t', action: () => switchMode('terminal') },
  { key: 'cmd+shift+c', action: () => switchMode('claude-code') },
  { key: 'cmd+shift+x', action: () => switchMode('codex-cli') },  // 신규
  // ... 기타 ...
];

const switchMode = (target: TPanelType) => {
  const tab = getCurrentTab();
  const current = tab.panelType;
  const isAgentRunning = tab.cliState !== 'inactive' && tab.cliState !== 'unknown';
  const currentIsAgent = current === 'claude-code' || current === 'codex-cli';
  const targetIsAgent = target === 'claude-code' || target === 'codex-cli';

  // 잠금 매트릭스
  if (isAgentRunning && currentIsAgent && targetIsAgent && target !== current) {
    const currentName = current === 'claude-code' ? 'Claude' : 'Codex';
    toast.error(t('switchAgentBlocked', { name: currentName }));
    return;
  }

  // 미설치 가드
  if (target === 'codex-cli') {
    const preflight = useTabStore.getState().preflight;
    if (!preflight.codex.installed) {
      notifyCodexNotInstalled();
      return;
    }
  }
  if (target === 'claude-code') {
    const preflight = useTabStore.getState().preflight;
    if (!preflight.claude.installed) {
      notifyClaudeNotInstalled();
      return;
    }
  }

  updateTabPanelType(paneId, tabId, target);
};
```

## 4. 잠금 검사 적용 사이트 (3곳)

| 파일 | 라인 | 변경 |
| --- | --- | --- |
| `use-keyboard-shortcuts.ts` | (위 코드) | switchMode 분기 |
| `content-header.tsx` | 75, 95 | panel selector dropdown — 동일 잠금 검사 추가 |
| `tab-bar.tsx` | 259 | 탭바 내 panel 변경 — 동일 검사 추가 |

`pane-new-tab-menu`는 새 탭 생성이라 **잠금 비적용**.

## 5. 메뉴 항목 (`pane-new-tab-menu.tsx`)

```tsx
<DropdownMenuItem
  disabled={!preflight.codex.installed}
  onClick={() => createNewTab({ panelType: 'codex-cli' })}
>
  <OpenAIIcon className="mr-2 size-4" />
  Codex 새 대화
  <DropdownMenuShortcut>⌘⇧X</DropdownMenuShortcut>
</DropdownMenuItem>

<DropdownMenuItem
  disabled={!preflight.codex.installed}
  onClick={() => openCodexSessionList()}
>
  <ListIcon className="mr-2 size-4" />
  Codex 세션 목록
</DropdownMenuItem>
```

미설치 + 클릭(터치 환경)에선 `notifyCodexNotInstalled()` 호출.

## 6. updateTabPanelType (`use-tab-store.ts`)

```ts
updateTabPanelType: (paneId, tabId, target: TPanelType) => {
  set((state) => {
    const tab = state.tabs[tabId];
    if (!tab) return state;

    // agentState 덮어쓰기 (claude ↔ codex 전환)
    if (target === 'codex-cli' && tab.panelType !== 'codex-cli') {
      tab.agentState = null;  // Codex는 legacy 없음 — 새 session
    }
    if (target === 'claude-code' && tab.panelType !== 'claude-code') {
      // Claude는 legacy fallback 있음 — agentState 유지
    }

    tab.panelType = target;
    return { ...state };
  });
  persistLayoutJson();  // 디스크 저장
},
```

## 7. i18n 키

```json
{
  "switchAgentBlocked": "{{name}}이 실행 중입니다. 터미널에서 /quit 또는 Ctrl+D로 종료 후 다시 시도하세요",
  "codexNewConversation": "Codex 새 대화",
  "codexSessionList": "Codex 세션 목록",
  "codexStartSession": "Start Codex",
  "codexResumeLastSession": "이어서 시작",
  "codexInactiveMessage": "Codex 세션이 시작되지 않았습니다",
  "codexLastSessionLabel": "마지막 사용 세션:"
}
```

## 8. 데이터 타입 영향

| 타입 | 변경 |
| --- | --- |
| `TPanelType` | `'codex-cli'` 추가 |
| `ITab` | 변경 없음 (`panelType` enum 확장) |
| `IAgentState` | 변경 없음 — `providerId: 'codex'` 새 값 |

## 9. 컴포넌트 의존성

| 의존 | 위치 | 비고 |
| --- | --- | --- |
| `OpenAIIcon` | 기존 svg 컴포넌트 | 재사용 |
| `WebInputBar` | 공통 컴포넌트 | provider 분기로 send-keys 경로 다름 |
| `TimelineView` | Phase 3 마운트 | Phase 2엔 placeholder |
| `ContextRing` | 공통 컴포넌트 | provider별 토큰 합산 다름 (`codex-data-aggregation`) |
| `Permission Prompt Item` | 공통 컴포넌트 | provider 분기 (`codex-permission-prompt`) |

## 10. 캐싱 / 성능

| 영역 | 전략 |
| --- | --- |
| Panel 모듈 | `React.lazy` lazy import |
| Prefetch | 메뉴 hover 시 `import('./panels/codex-panel')` 트리거 |
| panelType 전환 | store update + React 재렌더 (< 16ms) |
| 잠금 검사 | store read 동기 — 비용 0 |
| 빈 상태 마지막 세션 | `useQuery` (react-query 또는 동등) — staleTime 30s |

## 11. 에러 처리

| 에러 | 처리 |
| --- | --- |
| 잠금 위반 | 토스트 + 변경 거부 |
| 미설치 + 단축키 | 토스트 A + 거부 |
| panelType 전환 시 store 갱신 실패 | logger.error + 토스트 |
| Lazy import 실패 (네트워크 등) | React Suspense fallback + 재시도 안내 |
| send-keys 실패 (Restart/Quit/Start) | 토스트 D + 패널 상태 복원 |

## 12. 실시간 업데이트

| 이벤트 | 채널 | 영향 |
| --- | --- | --- |
| cliState 변경 | sync-server `tab:status` | 헤더 인디케이터 + WebInputBar 활성/비활성 |
| agentInstalled 변경 (preflight 갱신) | sync-server `preflight:updated` | 메뉴 disabled 상태 + 빈 상태 표시 |
| `agentState` 갱신 (SessionStart hook) | store action | 헤더 모델명 + 마지막 세션 미리보기 |

## 13. 페이지네이션 / 정렬 / 필터

본 feature는 단일 패널 — 해당 없음. 빈 상태의 "마지막 세션"은 `listCodexSessions` 결과 첫 1개만 (별도 feature `codex-session-list`).
