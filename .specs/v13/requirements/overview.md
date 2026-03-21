# Purple Terminal v13 — 프로젝트 개요

## 비전

웹 기반 영속적 작업 환경. 로컬 PC에 서버를 띄우고, 브라우저에서 터미널 + Claude Code를 통합 관리하는 도구.

**핵심 가치**: 한번 열어둔 작업이 서버 재시작 후에도 그 자리에 그대로 있는 것.

## 계층 구조

```
Server (= Window)
└── Workspace (사이드바 항목 = 프로젝트)
    └── Pane (분할 영역)
        └── Surface (탭)
            └── Panel (콘텐츠)
```

| 계층 | 역할 |
|---|---|
| Server | 로컬 서버 프로세스 하나 = 하나의 Window |
| Workspace | 프로젝트와 1:1 매핑. 독립적인 Pane 레이아웃 보유 |
| Pane | 수평/수직 분할 영역. 하나 이상의 Surface(탭) 포함 |
| Surface | Pane 내의 탭. 하나의 Panel을 렌더링 |
| Panel | 실제 콘텐츠 단위. Terminal, Claude Code, Statistics 등 |

## 완료 사항

| 항목 | 상태 |
|---|---|
| Phase 1~7: 웹 터미널, tmux, Surface, Pane, Workspace, 영속성, 단축키 | ✅ 완료 |
| Phase 8: Claude Code Panel (타임라인 뷰, 세션 파싱, 실시간 감시, Panel 전환) | ✅ 완료 |
| Phase 9: 세션 탐색 (세션 목록, resume, 세션 ID 영속화, 자동 resume) | ✅ 완료 |
| Phase 10: Web 입력창 (텍스트 전송, 여러 줄, CLI 상태 감지, 중단) | ✅ 완료 |
| Phase 11: 세션 메타 상단 바 (제목, 시간, 메시지 수, git 브랜치, 토큰) | ✅ 완료 |
| Phase 12: 사용량 통계 페이지 (차트, 기간 필터, 2단계 로딩) | ✅ 완료 |

## 구현 로드맵

| Phase | 핵심 | 의존 | 상태 |
|---|---|---|---|
| 1~7 | 터미널 기반 인프라 | - | ✅ 완료 |
| 8 | Claude Code Panel | Phase 6 | ✅ 완료 |
| 9 | 세션 탐색 | Phase 8 | ✅ 완료 |
| 10 | Web 입력창 | Phase 8 | ✅ 완료 |
| 11 | 세션 메타 상단 바 | Phase 8 | ✅ 완료 |
| 12 | 사용량 통계 | Phase 1 | ✅ 완료 |
| **13. 모바일 뷰** | **모바일 반응형 + 트리 탐색** | **Phase 5** | **← v13 범위** |
