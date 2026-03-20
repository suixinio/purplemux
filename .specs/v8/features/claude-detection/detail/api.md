# API 연동

## 개요

claude 명령어 감지는 클라이언트에서 기존 xterm `onTitleChange` 이벤트를 활용한다. 별도 REST API나 서버 폴링 모듈이 필요하지 않다.

## 기존 인프라 활용

### tmux 타이틀 전파 (이미 동작 중)

```bash
# src/config/tmux.conf
set -g set-titles on
set -g set-titles-string "#{pane_current_command}|#{pane_current_path}"
set -g status-interval 2
```

- tmux가 2초 간격으로 포그라운드 프로세스 변경을 감지하여 타이틀 업데이트
- OSC 제어 시퀀스를 통해 xterm.js에 전달

### xterm onTitleChange (이미 동작 중)

```typescript
// src/hooks/use-terminal.ts
terminal.onTitleChange((title) => {
  callbacksRef.current.onTitleChange?.(title);
});
```

## 공통 함수 추가: src/lib/tab-title.ts

기존 `formatTabTitle`의 파싱 로직을 공통 함수로 분리한다.

### parseCurrentCommand

```typescript
export const parseCurrentCommand = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const pipeIdx = trimmed.indexOf('|');
  if (pipeIdx > 0) return trimmed.slice(0, pipeIdx);
  return null;
};
```

- tmux `set-titles-string` 형식(`#{pane_current_command}|#{pane_current_path}`)에서 프로세스명 추출
- `|` 구분자가 없는 경우(fallback 형식) → `null` 반환

### isClaudeProcess

```typescript
export const isClaudeProcess = (raw: string): boolean => {
  const cmd = parseCurrentCommand(raw);
  return cmd === 'claude';
};
```

- 정확히 `'claude'`만 매칭 (대소문자 구분)

### formatTabTitle 리팩토링

```typescript
export const formatTabTitle = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // 공통 함수로 프로세스명 추출
  const cmd = parseCurrentCommand(raw);
  if (cmd !== null) {
    const path = trimmed.slice(trimmed.indexOf('|') + 1);
    if (SHELL_NAMES.has(cmd)) return extractBasename(path);
    return cmd;
  }

  // fallback 로직 (기존과 동일)
  // ...
};
```

## 감지 로직 위치: pane-container.tsx

### onTitleChange 콜백 확장

```typescript
// src/components/features/terminal/pane-container.tsx
onTitleChange: (title) => {
  const tabId = activeTabIdRef.current;
  if (!tabId) return;

  // 기존: 탭 타이틀 업데이트
  const formatted = formatTabTitle(title);
  setTabTitles((prev) => {
    if (prev[tabId] === formatted) return prev;
    return { ...prev, [tabId]: formatted };
  });
  scheduleTitleSave();

  // 신규: claude 감지
  if (isClaudeProcess(title)) {
    const tab = tabsRef.current.find((t) => t.id === tabId);
    if (tab?.panelType !== 'claude-code') {
      onUpdateTabPanelType(paneId, tabId, 'claude-code');
    }
  }
},
```

### 수동 전환 후 재감지 억제

```typescript
const manualToggleCooldownRef = useRef<Record<string, number>>({});

const handleTogglePanelType = useCallback(() => {
  if (!activeTabId) return;
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const current = activeTab?.panelType ?? 'terminal';
  const next: TPanelType = current === 'terminal' ? 'claude-code' : 'terminal';

  // claude-code → terminal 수동 전환 시 쿨다운 설정
  if (current === 'claude-code' && next === 'terminal') {
    manualToggleCooldownRef.current[activeTabId] = Date.now();
  }

  onUpdateTabPanelType(paneId, activeTabId, next);
}, [paneId, activeTabId, tabs, onUpdateTabPanelType]);
```

onTitleChange에서 쿨다운 확인:

```typescript
if (isClaudeProcess(title)) {
  const cooldownTime = manualToggleCooldownRef.current[tabId];
  const isCoolingDown = cooldownTime && Date.now() - cooldownTime < 10_000;
  if (!isCoolingDown) {
    const tab = tabsRef.current.find((t) => t.id === tabId);
    if (tab?.panelType !== 'claude-code') {
      onUpdateTabPanelType(paneId, tabId, 'claude-code');
    }
  }
}
```

## 성능

| 지표 | 값 |
|---|---|
| 감지 방식 | xterm onTitleChange (이벤트 기반) |
| 감지 지연 | tmux status-interval (2초) + 이벤트 전파 (~즉시) |
| 서버 부하 | 추가 부하 없음 (기존 tmux 타이틀 메커니즘 그대로) |
| 추가 프로세스 실행 | 없음 (tmux CLI 폴링 제거) |

## 파일 변경 범위

| 파일 | 변경 내용 |
|---|---|
| `src/lib/tab-title.ts` | `parseCurrentCommand`, `isClaudeProcess` 추가, `formatTabTitle` 리팩토링 |
| `src/components/features/terminal/pane-container.tsx` | `onTitleChange`에 claude 감지 추가, 수동 전환 쿨다운 |
