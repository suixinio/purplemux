---
page: pane-shortcuts
title: Pane 분할/포커스 이동 단축키
route: /
status: DETAILED
complexity: Medium
depends_on:
  - .specs/v7/features/hotkey-system/spec.md
  - docs/STYLE.md
created: 2026-03-20
updated: 2026-03-20
assignee: ''
---

# Pane 분할/포커스 이동 단축키

## 개요

키보드 단축키로 Pane을 분할하고, 방향키로 인접 Pane 간 포커스를 이동한다. 모든 동작은 기존 UI 버튼과 동일한 함수를 호출하며, 별도의 분할/이동 로직을 구현하지 않는다.

## 주요 기능

### Pane 수직 분할

- `⌘D` / `Ctrl+D` — 포커스된 Pane을 오른쪽으로 분할
- 기존 탭 바 분할 버튼(`splitPane(paneId, 'vertical')`)과 동일한 함수 호출
- 새 Pane에 기본 탭 1개 생성, 포커스 자동 이동
- 작업 디렉토리 유지 — 기존 분할 로직 그대로 사용

### Pane 수평 분할

- `⌘⇧D` / `Ctrl+Shift+D` — 포커스된 Pane을 아래로 분할
- 기존 탭 바 분할 버튼(`splitPane(paneId, 'horizontal')`)과 동일한 함수 호출
- 수직 분할과 동일한 후처리 (기본 탭, 포커스 이동, cwd 유지)

### Pane 포커스 이동

- `⌥⌘←` / `Ctrl+Alt+←` — 왼쪽 Pane으로 포커스 이동
- `⌥⌘→` / `Ctrl+Alt+→` — 오른쪽 Pane으로 이동
- `⌥⌘↑` / `Ctrl+Alt+↑` — 위쪽 Pane으로 이동
- `⌥⌘↓` / `Ctrl+Alt+↓` — 아래쪽 Pane으로 이동

### 포커스 이동 판정 (레이아웃 트리 기반)

- 레이아웃 트리(ISplitNode/IPaneNode)를 탐색하여 인접 Pane을 판정
- 수평 split에서 좌/우 이동, 수직 split에서 상/하 이동은 형제 노드로 전환
- 현재 split 방향과 다른 방향의 이동 요청 시, 상위 split 노드까지 올라가서 탐색
- 해당 방향에 Pane이 없으면 무시 (아무 동작 없음)

### 포커스 이동 후처리

- 이동 대상 Pane의 활성 탭 터미널에 자동 포커스 (xterm.js `focus()`)
- 포커스 변경은 `focusPane()` 호출 → layout.json에 즉시 저장 (Phase 6 영속성)
- 포커스 이동 시 시각적 피드백: 포커스된 Pane의 탭 바 하이라이트 (기존 포커스 표시 스타일 활용)

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-03-20 | 초안 작성 | DRAFT |
