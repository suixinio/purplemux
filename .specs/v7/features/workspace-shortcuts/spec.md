---
page: workspace-shortcuts
title: Workspace 전환 + 터미널 단축키
route: /
status: DETAILED
complexity: Low
depends_on:
  - .specs/v7/features/hotkey-system/spec.md
  - docs/STYLE.md
created: 2026-03-20
updated: 2026-03-20
assignee: ''
---

# Workspace 전환 + 터미널 단축키

## 개요

키보드 단축키로 Workspace를 번호로 전환하고, 터미널 스크롤백을 지운다. Workspace 전환은 기존 사이드바 클릭과 동일한 함수를 호출하며, 별도의 전환 로직을 구현하지 않는다.

## 주요 기능

### Workspace 번호 전환

- `⌘1` ~ `⌘8` / `Ctrl+1` ~ `Ctrl+8` — N번째 Workspace로 전환 (사이드바 목록 순서 기준, 1-indexed)
- `⌘9` / `Ctrl+9` — 마지막 Workspace로 전환
- 기존 `switchWorkspace(workspaceId)` 함수 호출
- 존재하지 않는 번호는 무시 (아무 동작 없음)
- 이미 활성 Workspace이면 무시

### Workspace 전환 시 복원

- 전환 시 해당 Workspace의 Pane 레이아웃 + 포커스 Pane이 복원 (기존 전환 로직)
- 각 Pane의 활성 탭에 WebSocket 재연결
- 포커스 Pane의 터미널에 자동 포커스
- 사이드바 활성 항목 하이라이트 즉시 갱신

### 터미널 스크롤백 지우기

- `⌘K` / `Ctrl+K` — 포커스된 터미널의 스크롤백 버퍼 초기화
- xterm.js의 `clear()` 메서드 호출
- 현재 화면의 내용은 유지하고 스크롤백 히스토리만 제거

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-03-20 | 초안 작성 | DRAFT |
