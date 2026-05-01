---
step: build
timestamp: 2026-05-01 20:30
elapsed: 12분 51초
status: completed
---
Lint과 type-check 모두 통과했습니다. v19 codex-permission-prompt 구현 완료.

## 구현 요약

**서버 측 (hook payload → `cliState='needs-input'` + permissionRequest 메타)**
- `src/types/codex-permission.ts` (신규) — `IPermissionRequest` discriminated union (Exec / ApplyPatch / Permission)
- `src/lib/providers/codex/work-state-observer.ts` — `parseCodexPermissionRequest()` 추가 (exec_command/apply_patch/requested_permissions 파싱)
- `src/lib/providers/codex/hook-handler.ts` — PermissionRequest 시 메타에 permissionRequest 첨부, Stop 시 클리어
- `src/lib/status-manager.ts` — `applyCodexHookMeta`에 permissionRequest 인자, `applyCliState`가 `needs-input` 이탈 시 자동 클리어, `broadcastUpdate` 페이로드에 포함
- `src/types/status.ts` — `ITabStatusEntry`/`IStatusUpdateMessage`에 `permissionRequest` 필드

**클라이언트 측 (실시간 수신 + UI)**
- `src/hooks/use-tab-store.ts` — `permissionRequest` 필드 추가, sync/update 양 경로에서 머지
- `src/hooks/use-claude-status.ts` — WS `status:update`에서 `permissionRequest` 전달
- `src/components/features/timeline/permission-prompt-card.tsx` (신규) — 핵심 카드 컴포넌트
  - `role="alertdialog"` + `aria-live="assertive"`
  - 좌측 4px 파란 띠(`border-l-ui-blue`) + 도착 시 0.9초 깜박임 (`prefers-reduced-motion` 자동 무시)
  - request 종류별 아이콘/배지/본문 분기 (Exec / Apply Patch / Permission)
  - 자세히 보기 토글 (3개 초과 파일 숨김, env / diff preview)
  - Y/N 버튼 `min-h-11` + `<kbd>` 단축키 표시 + spinner with disabled
  - 키보드 핸들러: `y`/`n`/`Esc` (입력 위젯 포커스 시 차단, 카드 내/body 포커스만 처리)
  - Optimistic spinner → 실패 시(E) 토스트 + 버튼 재활성화
  - 3초 timeout(E2) → `notifyCodexApprovalNotApplied` 토스트 + 재시도 액션 (sendResponseRef 통해 stale closure 방지)
  - 송신은 단일 글자 `y`/`n` (`/api/tmux/send-input`)
- `src/components/features/workspace/codex-panel.tsx` — `cliState='needs-input'` 시 placeholder 대신 카드 표시
- `src/components/features/mobile/mobile-codex-panel.tsx` + `mobile-surface-view.tsx` — 모바일도 동일 카드 노출

**i18n** — 11개 로케일 `terminal.json`에 23개 키 추가 (ko 한국어 번역, 그 외 영어 fallback)

다음 feature를 빌드하려면 `/new` 후 `/4-build`를 실행하세요.
(컨텍스트를 정리하고 새로운 세션에서 더 정확한 코드를 생성합니다)
