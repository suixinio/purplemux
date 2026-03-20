---
page: web-terminal
title: 웹 터미널 (Phase 2 변경)
route: /
status: DRAFT
complexity: Low
depends_on:
  - docs/STYLE.md
created: 2026-03-20
updated: 2026-03-20
assignee: ''
---

# 웹 터미널 (Phase 2 변경)

## 개요

Phase 1에서 구현한 웹 터미널의 클라이언트 측 변경 사항. tmux 백엔드 전환에 따라 프론트엔드 변경은 최소화하되, 세션 영속성에 맞는 UX를 보강한다. 기존 WebSocket 바이너리 프로토콜, 재연결 로직, 상태 머신은 그대로 유지한다.

핵심 변경: **세션 종료 UI에 명시적 종료 버튼 추가 + 재연결 시 자연스러운 화면 복원.**

## 주요 기능

### 기존 유지 (변경 없음)

- xterm.js 터미널 렌더링 (전체 화면, WebGL, addon-fit, addon-web-links)
- Muted 팔레트 다크 테마 + JetBrains Mono 폰트
- WebSocket 바이너리 프로토콜 (0x00~0x03)
- 자동 재연결 (지수 백오프, 최대 5회)
- 연결 상태 인디케이터 (connecting/connected/reconnecting/disconnected)
- ResizeObserver 기반 리사이즈 (디바운스 100ms)
- requestAnimationFrame 기반 대량 출력 처리
- 한글 IME 입력 처리

### 재연결 시 화면 복원

- 서버 재시작/새로고침 후 자동 재연결 시 tmux가 화면을 redraw
- xterm.js는 redraw된 데이터를 수신하여 이전 화면 상태를 자연스럽게 복원
- 사용자에게 "새 터미널"이 아닌 "이어지는 터미널"로 느껴져야 함
- 재연결 과정에서 xterm.js 인스턴스를 초기화하지 않고, WebSocket만 재연결하여 깜빡임 최소화
- 재연결 성공 후 reconnecting 상태 표시가 자연스럽게 사라짐 (fade 150ms)

### 세션 종료 UI 보강

- 기존 session-ended 오버레이에 더해, 정상 운영 중에도 세션을 종료할 수 있는 UI 필요
- 세션 종료 시 서버에 종료 요청을 전달하는 메커니즘 (새 WebSocket 메시지 타입 또는 HTTP API)
- 종료 후 session-ended 오버레이 → "새 세션 시작" 버튼으로 새 tmux 세션 생성

### close code별 동작 분기

기존 close code 처리를 유지하되, Phase 2에서의 의미 변화를 반영:

| close code | Phase 1 동작 | Phase 2 동작 (변경점) |
|---|---|---|
| 1000 | session-ended UI | session-ended UI (동일, tmux 세션도 이미 소멸) |
| 1001 | 자동 재연결 → 새 PTY | 자동 재연결 → **기존 tmux 세션에 attach** (화면 복원) |
| 1011 | 에러 표시 | 에러 표시 (동일, tmux 관련 에러 메시지로 변경) |
| 1013 | 에러 표시 | 에러 표시 (동일) |

- 1001 재연결 시 사용자 경험이 달라짐: Phase 1에서는 빈 터미널이었지만, Phase 2에서는 이전 상태가 복원됨
- 클라이언트 코드 변경은 불필요 — 서버가 알아서 기존 세션에 attach하고, tmux가 화면을 redraw

### 새로고침 시 UX

- 브라우저 새로고침 시 WebSocket이 끊기고 페이지가 리로드됨
- 페이지 로드 후 WebSocket 자동 연결 → 서버가 기존 tmux 세션에 attach → 화면 복원
- 사용자에게는 "터미널이 잠깐 깜빡이고 이어지는" 경험
- 세션 종료 UI가 표시되면 안 됨 (서버 측 `detaching` 플래그로 보장)

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-03-20 | 초안 작성 | DRAFT |
