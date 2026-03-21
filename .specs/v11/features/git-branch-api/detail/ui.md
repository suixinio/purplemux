# 화면 구성

## 개요

git-branch-api는 서버 전용 REST API이므로 직접적인 UI는 없다. 메타 바의 상세 모드에서 브랜치명이 표시되며, 해당 UI는 session-meta-bar에서 정의한다.

## 응답 데이터 → UI 매핑

| API 응답 | UI 표시 |
|---|---|
| `{ branch: "feature/fix-bug" }` | `GitBranch` 아이콘 + "feature/fix-bug" (`font-mono text-xs`) |
| `{ branch: null }` | 브랜치 항목 숨김 (git 저장소 아님) |
| 에러 (404, 500) | 브랜치 항목 숨김 |
| 로딩 중 | "로드 중..." (`text-muted-foreground/50 text-xs`) |
