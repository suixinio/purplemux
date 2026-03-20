---
step: build
timestamp: 2026-03-20 01:48
elapsed: 6분 45초
status: completed
---
구현 완료. 변경 사항 요약:

### 변경된 파일

| 파일 | 변경 내용 |
|------|----------|
| `src/types/terminal.ts` | `TPanelType` union type 추가, `ITab.panelType?` 필드 추가 |
| `src/hooks/use-layout.ts` | `updateTabPanelType(paneId, tabId, panelType)` 함수 추가 |
| `src/components/features/terminal/claude-code-panel.tsx` | **신규** — 스켈레톤 로딩 UI 포함 ClaudeCodePanel |
| `src/components/features/terminal/pane-container.tsx` | panelType 기반 분기 렌더링 + 토글 핸들러 |
| `src/components/features/terminal/pane-tab-bar.tsx` | Panel 전환 토글 버튼 (Bot/SquareTerminal 아이콘) |
| `src/components/features/terminal/pane-layout.tsx` | `onUpdateTabPanelType` 프롭 전달 |
| `src/components/features/terminal/terminal-page.tsx` | `onUpdateTabPanelType` 연결 |

### 설계 결정

- **하위 호환**: `panelType`은 optional이며 기본값 `'terminal'` — 기존 layout.json 마이그레이션 불필요
- **WebSocket 유지**: 터미널 모드 전환 시 TerminalContainer를 `hidden`으로 숨김 (언마운트 X) → xterm.js 인스턴스와 WebSocket 연결 보존
- **Optimistic UI**: `updateTabPanelType`은 `updateAndSave` 패턴으로 로컬 즉시 반영 → 서버 비동기 저장
- **토글 버튼**: 탭 바 액션 영역에 추가 (+ 버튼 다음, Split 버튼 이전). 현재 모드에 따라 아이콘 변경 (Bot → Claude Code로 전환, SquareTerminal → 터미널로 전환)

---

다음 feature를 빌드하려면 `/new` 후 `/4-build`를 실행하세요.
(컨텍스트를 정리하고 새로운 세션에서 더 정확한 코드를 생성합니다)
