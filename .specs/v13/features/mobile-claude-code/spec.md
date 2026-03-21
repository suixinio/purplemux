---
page: mobile-claude-code
title: 모바일 Claude Code Panel
route: /
status: DETAILED
complexity: Medium
depends_on:
  - .specs/v13/features/mobile-layout/spec.md
  - .specs/v8/features/claude-code-panel/spec.md
  - .specs/v10/features/web-input/spec.md
  - .specs/v11/features/session-meta-bar/spec.md
  - docs/STYLE.md
created: 2026-03-21
updated: 2026-03-21
assignee: ''
---

# 모바일 Claude Code Panel

## 개요

데스크톱의 타임라인+터미널 분할 레이아웃을 모바일에 맞게 재구성한다. 타임라인과 터미널을 탭 형태로 전환하고, 입력창은 화면 하단에 고정한다. 세션 메타 바는 컴팩트 모드만 표시하고, 세션 목록은 전체 화면 리스트로 제공한다.

## 주요 기능

### 타임라인/터미널 탭 전환

데스크톱의 상하 분할 대신, 탭으로 전환한다:

| 탭 | 내용 |
|---|---|
| 타임라인 (기본) | 타임라인 뷰 전체 화면 — 데스크톱과 동일한 컴포넌트 재활용 |
| 터미널 | xterm.js 전체 화면 — 축소 없이 100% 크기 |

- 토글 버튼: 네비게이션 바 우측에 `Terminal`/`MessageSquare` 아이콘
- 현재 활성 탭 표시 (아이콘 `text-foreground`, 비활성은 `text-muted-foreground`)
- 전환 시 fade 애니메이션 (100ms)
- 터미널 탭에서도 입력창은 하단에 표시 (Claude Code 활성일 때)

### 하단 고정 입력창

- 화면 최하단에 고정 (`position: sticky` 또는 `fixed`)
- Safe Area 대응: `padding-bottom: env(safe-area-inset-bottom)`
- 데스크톱의 WebInputBar 컴포넌트 재활용 (동일한 모드 전환: 입력/중단/비활성)
- 모바일 키보드 올라올 때: 키보드 위에 자연스럽게 배치
- 입력창 높이: 기본 1줄, 자동 확장 (최대 3줄 — 모바일은 5줄 대신 3줄로 제한)

### 세션 메타 바

- 타임라인 뷰 상단에 컴팩트 모드만 표시 (한 줄)
- 상세 확장: 데스크톱의 인라인 확장 대신 **바텀 시트** (shadcn/ui `Sheet` 또는 `Drawer`)
- 컴팩트 바 클릭 → 바텀 시트 열림 → 상세 정보 표시
- 바텀 시트 외부 클릭 또는 하단 스와이프로 닫기

### 세션 목록

- 활성 세션 없을 때: 전체 화면 세션 리스트
- 데스크톱의 SessionListView 컴포넌트 재활용
- 항목 클릭 → resume + 타임라인 뷰로 전환
- 빈 상태: 데스크톱과 동일한 안내 메시지

### 세션 네비게이션

- 타임라인 뷰 상단: `← 세션 목록` 버튼 (데스크톱과 동일)
- 클릭 → 세션 목록으로 복귀

### 다크 모드

- 데스크톱과 동일한 토큰 사용
- 입력창: `bg-background`, `border-t`
- 탭 전환 버튼: 기존 아이콘 스타일

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-03-21 | 초안 작성 | DRAFT |
