---
step: build
timestamp: 2026-05-01 20:57
elapsed: 13분 20초
status: completed
---
v19 codex-session-list 구현을 완료했습니다.

**생성한 파일**
- `src/lib/codex-session-list.ts` — `~/.codex/sessions/YYYY/MM/DD/*.jsonl` 스캐너 (최근 30일, 첫 줄 `session_meta` + `user_message` 추출, mtime 기반 file-level cache, globalThis 싱글턴)
- `src/pages/api/codex/sessions.ts` — `GET /api/codex/sessions?cwd=...&daysBack=30`
- `src/hooks/use-codex-sessions.ts` — `useCodexSessions(cwd, enabled)` + `useCodexSessionsPrefetch()` (SWR, 30s dedup)
- `src/components/features/workspace/codex-session-list-sheet.tsx` — 우측 sheet (데스크톱 400px) / bottom sheet (모바일 80vh + drag handle), skeleton/empty/error/loaded 4-상태, 카드별 첫 메시지+상대시간+cwd 마지막 세그먼트+토큰+모델 tooltip

**수정한 파일**
- `src/components/features/workspace/pane-new-tab-menu.tsx` — `codex` 메뉴 항목 → sheet 오픈, `onMouseEnter` 프리페치
- `src/components/features/mobile/mobile-new-tab-dialog.tsx` — 모바일 동일 흐름
- `src/components/features/workspace/pane-tab-bar.tsx`, `pane-container.tsx` — `onCreateTab` 시그니처에 `resumeSessionId` 추가
- `src/hooks/use-layout.ts` — `createTabInPane` 4번째 인자로 `resumeSessionId` 전달 (기존 API route가 `provider.buildResumeCommand` 호출 → tmux로 `codex resume <id>` 발사)
- `src/components/features/mobile/mobile-terminal-page.tsx` — `handleCreateTab`에 `resumeSessionId` 포워딩
- `messages/{ko,en,ja}/terminal.json` — 6개 새 키 한/일/영 번역, 나머지 8개 로케일은 영문 fallback (v19 codex-panel-ui 패턴)

**검증**
- `pnpm tsc --noEmit` ✅
- `pnpm lint` ✅
- 브라우저에서 실제 sheet 열기/카드 클릭 → resume 동작은 직접 검증하지 못했습니다. dev 서버 실행하여 Codex 세션이 있는 워크스페이스에서 새 탭 메뉴 → "Codex 세션 목록" 클릭 시나리오를 한 번 돌려보시면 좋을 것 같습니다.

다음 feature를 빌드하려면 `/new` 후 `/4-build`를 실행하세요.
(컨텍스트를 정리하고 새로운 세션에서 더 정확한 코드를 생성합니다)
