---
step: build
timestamp: 2026-03-21 09:50
elapsed: 14분 35초
status: completed
---
구현이 완료되었습니다. 변경 사항 요약:

## 서버 사이드

### `src/types/timeline.ts`
- `ITimelineResumeMessage` (클라이언트→서버) 추가
- `ITimelineResumeStartedMessage`, `ITimelineResumeBlockedMessage`, `ITimelineResumeErrorMessage` (서버→클라이언트) 추가

### `src/types/terminal.ts`
- `ITab`에 `claudeSessionId?: string | null` 필드 추가

### `src/lib/tmux.ts`
- `getPaneCurrentCommand()` — 현재 포그라운드 프로세스 조회
- `checkTerminalProcess()` — 셸 여부 판별 (bash/zsh/fish/sh/dash)
- `sendKeys()` — tmux send-keys 실행

### `src/lib/timeline-server.ts`
- `resolveJsonlPath()` — sessionId → JSONL 파일 경로 매핑
- `handleResumeMessage()` — 프로세스 상태 확인 → send-keys → claudeSessionId 저장 → 응답 전송
- `timeline:resume` 메시지 핸들링 추가

### `src/lib/layout-store.ts`
- `parseSessionName()` — 세션 이름에서 워크스페이스/페인/탭 ID 추출
- `updateTabClaudeSessionId()` — layout.json에 claudeSessionId 저장

## 클라이언트 사이드

### 훅
- `src/hooks/use-session-list.ts` — 세션 목록 페칭, 페이지네이션, 리프레시
- `src/hooks/use-session-view.ts` — 뷰 전환 상태 머신 (list/empty/timeline)
- `src/hooks/use-timeline-websocket.ts` — `sendResume()`, resume 응답 핸들러 추가
- `src/hooks/use-timeline.ts` — `sendResume` 노출, resume 콜백 전파

### 컴포넌트
- `src/components/features/terminal/session-list-item.tsx` — 세션 항목 (시간, 메시지, 턴 수, 하이라이트, 스피너)
- `src/components/features/terminal/session-list-view.tsx` — 세션 목록 (헤더, 스켈레톤, 에러, 스크롤 페이지네이션)
- `src/components/features/terminal/session-empty-view.tsx` — 빈 상태 안내
- `src/components/features/terminal/session-nav-bar.tsx` — "← 세션 목록" 네비게이션
- `src/components/features/terminal/claude-code-panel.tsx` — 오케스트레이터 (뷰 전환 + resume 흐름 통합)
- `src/components/features/terminal/pane-container.tsx` — `claudeSessionId` prop 전달

---

다음 feature를 빌드하려면 `/new` 후 `/4-build`를 실행하세요.
(컨텍스트를 정리하고 새로운 세션에서 더 정확한 코드를 생성합니다)
