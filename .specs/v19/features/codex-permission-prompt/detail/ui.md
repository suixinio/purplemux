# 화면 구성

## 1. 권한 요청 카드 — Codex 패널 인라인

```
┌────────────────────────────────────────────────────┐
│  [AlertCircle · 파란]  권한 요청                   │
│  ──────────────────────────────────────────────    │
│                                                    │
│  Exec command 실행을 허용할까요?                   │
│                                                    │
│  $ rm -rf node_modules                             │
│  cwd: /Users/.../my-project                        │
│                                                    │
│  [▼ 자세히 보기]                                   │
│                                                    │
│  [Yes (y)]  [No (n)]                               │
└────────────────────────────────────────────────────┘
```

위치: `WebInputBar` 위쪽 fixed 영역. cliState='needs-input' 동안만 표시.

## 2. 카드 구성

| 영역 | 컴포넌트 | 비고 |
| --- | --- | --- |
| 좌측 아이콘 | `AlertCircle` 파란 (`text-blue-500`) | request 종류별 분기 |
| 헤더 라벨 | "권한 요청" | `text-sm font-semibold` |
| Request 종류 배지 | `Badge` shadcn | "Exec" / "Apply Patch" / "Permission" |
| 메인 메시지 | text | request 종류별 동적 |
| 대상 정보 | code block | `font-mono text-sm` |
| 자세히 보기 | toggle | collapsed/expanded (default collapsed) |
| Yes/No 버튼 | `Button` shadcn | `min-h-11` (모바일 터치) |

## 3. Request 종류별 표시

### ExecApprovalRequest

| 영역 | 표시 |
| --- | --- |
| 메시지 | "다음 명령을 실행할까요?" |
| 대상 | `$ {command}` + `cwd: {cwd}` |
| 자세히 보기 | command 전체 (긴 경우) + 환경변수 |

### ApplyPatchApprovalRequest

| 영역 | 표시 |
| --- | --- |
| 메시지 | "다음 파일 변경을 허용할까요?" |
| 대상 | 파일 목록 (3개까지, 더 있으면 "외 N개") |
| 자세히 보기 | diff preview (collapsed default) — 기존 ToolCall diff 컴포넌트 재사용 |

### RequestPermissions

| 영역 | 표시 |
| --- | --- |
| 메시지 | "다음 권한이 필요합니다" |
| 대상 | 권한 목록 (예: `network`, `file-write`) |
| 자세히 보기 | 각 권한 상세 설명 |

## 4. Yes/No 버튼

```tsx
<div className="flex gap-3 mt-4">
  <Button
    variant="default"
    className="flex-1 min-h-11"
    onClick={handleYes}
    disabled={isSending}
  >
    {isSending ? <Spinner /> : <>Yes <kbd>y</kbd></>}
  </Button>
  <Button
    variant="outline"
    className="flex-1 min-h-11"
    onClick={handleNo}
    disabled={isSending}
  >
    {isSending ? <Spinner /> : <>No <kbd>n</kbd></>}
  </Button>
</div>
```

- 키 표시: `<kbd>` 우측 작게 — 사용자에게 키보드 단축 안내
- `min-h-11` (44px) — 모바일 터치 타겟
- 송신 중 spinner — 더블 클릭 방지

## 5. Visual cue — 깜박임 애니메이션

권한 요청 도착 시:

| 영역 | 애니메이션 |
| --- | --- |
| 패널 헤더 인디케이터 dot | `animate-pulse` 무한 (파란) |
| 카드 좌측 띠 (border-l-4) | `animate-pulse` 3회 후 정적 |
| `[ ! ] Action Required` 페인 타이틀 | tmux 자동 (기존 메커니즘) |
| 알림음 (옵션, 사용자 설정) | 기본 off |

## 6. 송신 중 상태 (`isSending: true`)

```
┌────────────────────────────────────────────────────┐
│  [AlertCircle · 파란]  권한 요청                   │
│  ...                                               │
│  [⏳ 응답 전송 중...]   [⏳ 응답 전송 중...]       │
└────────────────────────────────────────────────────┘
```

- 두 버튼 모두 disabled + spinner
- 사용자 추가 클릭 차단

## 7. 응답 후 — 성공

- 카드 fade-out (200ms) → 사라짐
- 토스트 (옵션, 짧게): "권한 부여됨" 또는 "권한 거부됨" (1.5초)
- cliState='busy' 또는 'idle'로 자연 전환

## 8. 응답 후 — 실패 (E)

```
┌────────────────────────────────────────────────────┐
│  [XCircle · 빨간]                                  │
│  권한 응답 전송 실패. 다시 시도해 주세요.          │
│  [재시도]                                          │
└────────────────────────────────────────────────────┘
```

- 토스트 (`codexApprovalSendFailed`)
- 카드 내 Yes/No 버튼 재활성화

## 9. Timeout fallback (E2) — 3초 후

```
┌────────────────────────────────────────────────────┐
│  [AlertTriangle · 노랑]                            │
│  응답이 codex에 닿지 않았습니다.                   │
│  keymap을 확인하세요.                              │
│  [재시도]                                          │
└────────────────────────────────────────────────────┘
```

토스트만 — 카드는 그대로 유지 (재시도 가능).

## 10. 자세히 보기 토글

```
[▼ 자세히 보기]   ←→   [▲ 접기]
```

- 클릭 시 height transition (200ms ease-out)
- 내용:
  - Exec: full command + env vars + estimated duration (옵션)
  - Patch: diff preview (구문 강조 — 기존 컴포넌트 재사용)
  - Permission: 각 권한 description

## 11. 키보드 단축

- 패널 포커스 시 `y` → Yes 송신
- `n` 또는 `Esc` → No 송신
- `e` → 자세히 보기 토글 (선택)
- `Tab` → Yes/No 버튼 간 이동

## 12. 빈 / 로딩 / 에러 상태

| 상태 | 표시 |
| --- | --- |
| 권한 요청 없음 (cliState ≠ 'needs-input') | 카드 표시 안 함 |
| 권한 요청 도착 | 카드 + 깜박임 |
| 송신 중 | 버튼 disabled + spinner |
| 송신 실패 (E) | 토스트 + 버튼 재활성화 |
| 응답 무반응 (E2) | 토스트 + 카드 유지 |

## 13. 인터랙션 피드백

| 액션 | 피드백 |
| --- | --- |
| 카드 표시 | slide-down (200ms ease-out) + 깜박임 |
| Yes/No hover | 배경 강조 |
| Yes/No 클릭 | 즉시 spinner |
| 자세히 보기 토글 | height 부드러운 transition |
| 응답 성공 | 카드 fade-out + 토스트 |

## 14. 접근성

- 카드 `role="alertdialog"` (사용자 액션 필수)
- 메인 메시지 `aria-live="assertive"` (즉시 안내)
- Yes/No 버튼 keyboard accessible
- `<kbd>` 표시는 시각만 — 실제 키 핸들러는 별도 등록
- `prefers-reduced-motion` 환경: 깜박임 정적, transition 즉시

## 15. 모바일

- 카드 폭 100% (패딩 `p-4`)
- 자세히 보기 expanded는 스크롤 가능 (`max-h-60 overflow-y-auto`)
- diff preview는 가로 스크롤 (`overflow-x-auto`)
- Yes/No 버튼 `min-h-12` (48px) — 모바일 권장

## 16. STYLE.md 팔레트 준수

- 배경: `bg-card`
- 좌측 띠: `border-l-4 border-l-blue-500`
- 아이콘 색상: 파란 (`text-blue-500`)
- 깜박임: `animate-pulse` (Tailwind 기본)
