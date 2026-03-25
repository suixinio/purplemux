---
step: build
timestamp: 2026-03-25 16:14
elapsed: 7분 34초
status: completed
---
TypeScript 타입 체크 통과, 린트 에러 없음 (기존 `use-tmux-info.ts` 에러만 존재).

## 구현 요약

### 신규 파일
| 파일 | 설명 |
|------|------|
| `src/hooks/use-message-history.ts` | fetch/add/delete 훅 — 낙관적 업데이트, fire-and-forget 패턴 |
| `src/components/features/terminal/message-history-picker.tsx` | 데스크톱/모바일 분기 래퍼 (Clock 아이콘 트리거) |
| `src/components/features/terminal/message-history-popover.tsx` | Popover + Command 조합 (데스크톱) |
| `src/components/features/terminal/message-history-drawer.tsx` | Drawer + Command 조합 (모바일) |
| `src/components/ui/command.tsx` | shadcn command 컴포넌트 |
| `src/components/ui/drawer.tsx` | shadcn drawer 컴포넌트 |

### 수정 파일
| 파일 | 변경 |
|------|------|
| `src/hooks/use-web-input.ts` | `onMessageSent` 콜백 추가 — 전송 후 슬래시 커맨드 제외하고 호출 |
| `src/components/features/terminal/web-input-bar.tsx` | `wsId` prop 추가, `useMessageHistory` 훅 연결, Clock 아이콘 + Picker 삽입 |
| `src/components/features/terminal/pane-container.tsx` | `layoutWsId` 구독, WebInputBar에 `wsId` 전달 |

### 핵심 동작
- **입력창 레이아웃**: `[Clock] [Textarea] [Send]`
- **Popover 열기**: Clock 클릭 → 매번 fetch → 최신 히스토리 표시
- **항목 선택**: 입력창에 전체 메시지 채움 → Popover 닫힘 → textarea 포커스
- **항목 삭제**: X 버튼 → 낙관적 제거 → 실패 시 롤백
- **메시지 전송 시 저장**: send() 성공 후 fire-and-forget으로 addHistory 호출
- **제외 조건**: 슬래시 커맨드(`/`), RESTART_COMMANDS, 빈 메시지
- **중복 처리**: 동일 메시지 전송 시 기존 항목 제거 → 최상단 재삽입

---

다음 feature를 빌드하려면 `/new` 후 `/4-build`를 실행하세요.
(컨텍스트를 정리하고 새로운 세션에서 더 정확한 코드를 생성합니다)
