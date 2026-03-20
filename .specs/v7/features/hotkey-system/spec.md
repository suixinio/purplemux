---
page: hotkey-system
title: 단축키 시스템 인프라
route: /
status: DETAILED
complexity: Medium
depends_on:
  - docs/STYLE.md
created: 2026-03-20
updated: 2026-03-20
assignee: ''
---

# 단축키 시스템 인프라

## 개요

`react-hotkeys-hook` (v5) 기반의 중앙 집중식 단축키 시스템을 구축한다. 키 매핑 상수를 분리하고, xterm.js 터미널과의 키 입력 충돌을 해결하여, 터미널 포커스 상태에서도 앱 단축키가 정상 동작하는 기반을 마련한다. macOS/Windows/Linux 크로스플랫폼을 지원한다.

## 주요 기능

### 키 매핑 상수 파일

- 전체 단축키 조합을 한 파일에서 관리하는 상수 정의
- OS 감지 (`navigator.platform` 또는 `navigator.userAgent`) 후 macOS/Windows·Linux 키 분기
  - macOS: `meta` (⌘) 기반
  - Windows/Linux: `ctrl` 기반
  - macOS: `ctrl` (⌃) → Windows/Linux: `alt`
- react-hotkeys-hook 키 문법으로 매핑 (예: `meta+d`, `ctrl+d`)
- 각 단축키는 고유한 액션 이름으로 식별 (예: `SPLIT_VERTICAL`, `NEW_TAB`)

### 단축키 훅 (`use-keyboard-shortcuts`)

- `useHotkeys` 훅으로 각 단축키를 선언적 등록
- 공통 옵션 적용: `preventDefault: true`, `enableOnFormTags: true`
- 액션 콜백은 기존 `useLayout`, `useWorkspace` 훅의 함수를 직접 호출 — 새로운 로직 없이 연결만 담당
- 단축키 훅은 터미널 페이지 컴포넌트에서 한 번만 호출

### xterm.js 키 이벤트 분리

- `attachCustomKeyEventHandler` 에서 앱 단축키 조합 판별
- 앱 단축키에 해당하는 키 조합 → `return false` (터미널에서 무시, 브라우저로 전파 → useHotkeys가 처리)
- 일반 키 입력 → `return true` (터미널이 처리)
- `⌘C`/`⌘V` (복사/붙여넣기)는 앱 단축키로 등록하지 않으므로 터미널/브라우저 기본 동작 유지
- 판별 로직은 키 매핑 상수를 참조하여 중복 정의 방지

### 브라우저 기본 동작 차단

- `⌘T`/`Ctrl+T` (새 브라우저 탭), `⌘W`/`Ctrl+W` (브라우저 탭 닫기), `⌘1~9`/`Ctrl+1~9` (브라우저 탭 전환) 등을 `preventDefault`로 차단
- 앱 단축키가 아닌 `⌘C`, `⌘V`, `⌘A` 등은 차단하지 않음

### 성능

- 단축키 입력 → 콜백 실행은 동기적으로 즉시 처리 (체감 지연 0ms)
- layout 저장 등 API 호출은 비동기이되, UI는 optimistic update로 즉시 반영
- xterm.js `attachCustomKeyEventHandler`의 판별 함수는 O(1) 룩업 (Set 또는 Map 사용)

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-03-20 | 초안 작성 | DRAFT |
