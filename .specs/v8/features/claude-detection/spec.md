---
page: claude-detection
title: claude 명령어 감지
route: /
status: DETAILED
complexity: Low
depends_on:
  - .specs/v8/features/panel-type-system/spec.md
  - .specs/v8/features/session-detection/spec.md
  - docs/STYLE.md
created: 2026-03-21
updated: 2026-03-21
assignee: ''
---

# claude 명령어 감지

## 개요

tmux 세션 내에서 `claude` 프로세스 실행을 자동 감지하여 Panel 타입을 `terminal`에서 `claude-code`로 전환한다. 기존 tmux `set-titles-string`과 xterm `onTitleChange` 흐름을 활용하여 별도 서버 폴링 없이 클라이언트에서 실시간 감지한다.

## 핵심 설계: 기존 탭 타이틀 흐름 재활용

현재 탭바에 프로세스명을 표시하는 흐름이 이미 존재한다:

```
tmux set-titles-string "#{pane_current_command}|#{pane_current_path}"
  → xterm onTitleChange 이벤트
  → formatTabTitle()로 파싱 → 탭바 표시
```

이 흐름에서 프로세스명 파싱을 공통 함수로 분리하고, claude 감지 로직을 추가한다.

## 주요 기능

### 공통 함수: parseCurrentCommand

`tab-title.ts`에 tmux 타이틀 문자열에서 프로세스명을 추출하는 공통 함수를 추가한다.

```typescript
// src/lib/tab-title.ts

// tmux set-titles-string 원본에서 현재 프로세스명 추출
export const parseCurrentCommand = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const pipeIdx = trimmed.indexOf('|');
  if (pipeIdx > 0) return trimmed.slice(0, pipeIdx);
  return null;
};

// claude 프로세스 여부 판정
export const isClaudeProcess = (raw: string): boolean => {
  const cmd = parseCurrentCommand(raw);
  return cmd === 'claude';
};
```

- `formatTabTitle`도 내부에서 `parseCurrentCommand`를 활용하도록 리팩토링
- 프로세스명 파싱 로직이 한 곳에서만 관리됨

### 클라이언트 감지 흐름

기존 `onTitleChange` 콜백에 claude 감지 로직을 추가한다:

```
xterm onTitleChange(raw)
├── parseCurrentCommand(raw) → 프로세스명 추출
├── formatTabTitle(raw) → 탭 타이틀 업데이트 (기존)
└── isClaudeProcess(raw) → true이면 panelType 자동 전환
```

### 감지 조건

- `parseCurrentCommand(raw)` 결과가 정확히 `'claude'`인 경우만 감지
- `claude-cli`, `claude_runner` 등 유사 프로세스는 감지하지 않음
- 이미 `panelType === 'claude-code'`인 탭에서는 중복 전환하지 않음

### 자동 전환 로직

- `claude` 감지 시:
  1. 해당 탭의 `panelType`을 `claude-code`로 변경 (onUpdateTabPanelType 호출)
  2. session-detection을 통해 활성 세션 JSONL 파일 매핑
  3. 타임라인 자동 표시
- `claude` 프로세스가 종료되어도 `claude-code` 타입 유지 (자동 복귀하지 않음)

### 수동 전환 후 재감지 억제

- 사용자가 수동으로 `claude-code` → `terminal` 전환 시, 일정 시간(10초) 동안 자동 전환을 억제
- 억제 상태는 탭 단위로 관리

### 에러 처리

- `onTitleChange` 이벤트가 발생하지 않는 경우 → 감지 불가 (정상 동작)
- tmux 세션 미생성 상태 → `onTitleChange` 미발생 → 세션 생성 후 자동 동작

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용                                                | 상태     |
| ---------- | -------------------------------------------------------- | -------- |
| 2026-03-21 | 초안 작성                                                | DRAFT    |
| 2026-03-21 | 서버 폴링 → 클라이언트 onTitleChange 기반으로 방식 변경  | DETAILED |
