---
page: git-branch-api
title: Git 브랜치 조회 API
route: /api/git/branch
status: CONFIRMED
complexity: Low
depends_on: []
created: 2026-03-21
updated: 2026-03-21
assignee: ''
---

# Git 브랜치 조회 API

## 개요

tmux 세션의 cwd를 기반으로 현재 git 브랜치를 조회하는 서버 API. 메타 바에서 30초 간격 폴링으로 호출하며, 단순한 `git rev-parse` 래퍼이다.

## 주요 기능

### 브랜치 조회

- tmux 세션명을 받아 cwd를 조회
- cwd에서 `git rev-parse --abbrev-ref HEAD` 실행
- 브랜치명 반환

### 에러 처리

- tmux 세션 없음 → 404
- cwd가 git 저장소가 아님 → `{ branch: null }` (에러 아님, git이 아닌 디렉토리일 수 있음)
- git 명령어 실패 → 500

### 성능

- `git rev-parse`는 ~5ms 이내 실행되는 가벼운 명령
- 캐싱 불필요 (30초 폴링이므로 호출 빈도 낮음)

## 하위 문서

- [화면 구성](./detail/ui.md)
- [사용자 흐름](./detail/flow.md)
- [API 연동](./detail/api.md)

## 변경 이력

| 날짜       | 변경 내용 | 상태  |
| ---------- | --------- | ----- |
| 2026-03-21 | 초안 작성 | DRAFT |
