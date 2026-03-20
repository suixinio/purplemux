---
page: surface-shortcuts
title: Surface 탭 단축키
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

# Surface 탭 단축키

## 개요

키보드 단축키로 포커스된 Pane 내의 탭을 생성/닫기/전환한다. 모든 동작은 기존 탭 바 UI(버튼 클릭, X 버튼)와 동일한 함수를 호출하며, 별도의 탭 관리 로직을 구현하지 않는다.

## 주요 기능

### 새 탭 생성

- `⌘T` / `Ctrl+T` — 포커스된 Pane에 새 탭 생성 + 활성화
- 기존 탭 바 `+` 버튼(`createTabInPane(paneId)`)과 동일한 함수 호출
- 생성 후 새 탭으로 자동 전환 + 터미널 포커스

### 탭 닫기

- `⌘W` / `Ctrl+W` — 포커스된 Pane의 활성 탭 닫기
- 기존 탭 바 X 버튼(`deleteTabInPane(paneId, tabId)`)과 동일한 함수 호출 — 코드 중복 없음
- 엣지 케이스는 기존 X 버튼 로직이 그대로 처리:
  - 마지막 탭 닫기 → Pane 자동 제거, 인접 Pane으로 포커스 이동
  - Workspace의 최후 Pane/탭 → 기존 X 버튼 동작과 동일

### 이전/다음 탭 전환

- `⌘⇧[` / `Ctrl+Shift+[` — 이전 탭으로 전환
- `⌘⇧]` / `Ctrl+Shift+]` — 다음 탭으로 전환
- 탭 순서는 Pane 내 탭 배열 순서 기준
- 첫 번째/마지막 탭에서 순환하지 않음 (끝에서 멈춤)
- 전환 시 해당 탭의 터미널에 자동 포커스

### 번호로 탭 이동

- `⌃1` ~ `⌃8` / `Alt+1` ~ `Alt+8` — N번째 탭으로 이동
- `⌃9` / `Alt+9` — 마지막 탭으로 이동
- 존재하지 않는 번호의 탭은 무시 (아무 동작 없음)
- 이미 활성 탭이면 무시

### 탭 전환 시 피드백

- 탭 전환 즉시 해당 탭의 터미널 렌더링 (기존 탭 클릭과 동일한 반응 속도)
- 활성 탭 하이라이트 스타일 즉시 갱신
- 탭 전환에 따른 WebSocket 연결은 기존 로직 활용 (활성 탭만 연결)

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-03-20 | 초안 작성 | DRAFT |
