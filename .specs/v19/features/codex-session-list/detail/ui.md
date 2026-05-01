# 화면 구성

## 1. Codex 세션 목록 Sheet (Desktop)

```
┌─────────────────────────────────────────────────────────┐
│  [OpenAIIcon] Codex 세션                            [X] │  ← 헤더
├─────────────────────────────────────────────────────────┤
│  [🔍 검색]                                              │  ← (v19 외부 — 검색 미지원)
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │ Add user authentication                         │   │
│  │ 3시간 전 · my-project · 12.4k tokens            │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Refactor session-meta-cache                     │   │
│  │ 어제 · my-project · 8.2k tokens                 │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Investigate ping-pong bug                       │   │
│  │ 2일 전 · my-project · 23.1k tokens              │   │
│  └─────────────────────────────────────────────────┘   │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

위치: 우측 사이드 sheet (모바일은 bottom sheet) — `Sheet` shadcn 사용.

## 2. Sheet 헤더

| 영역 | 컴포넌트 | 비고 |
| --- | --- | --- |
| 좌측 아이콘 | `OpenAIIcon` (`size-5`) | provider 식별 |
| 라벨 | "Codex 세션" | `text-base font-semibold` |
| 우측 닫기 | `X` button | `Sheet` 자체 close |
| 부제 | "현재 워크스페이스의 codex 세션" | `text-xs text-muted-foreground` |

## 3. 세션 항목 카드

| 영역 | 컴포넌트 | 스타일 |
| --- | --- | --- |
| 첫 user message 미리보기 | text | `text-sm font-medium` 1줄 truncate |
| 시작 시간 (relative) | text | `text-xs text-muted-foreground` |
| cwd (마지막 디렉토리명) | text | `text-xs text-muted-foreground` |
| cwd full path | tooltip | hover 시 표시 |
| 토큰 합계 (Phase 4 후) | text | `text-xs text-muted-foreground` 우측 정렬 |
| 모델명 (옵션) | tooltip | hover 시 |

### 카드 구조

```tsx
<button className="w-full p-3 rounded-md hover:bg-accent text-left">
  <div className="text-sm font-medium truncate">{firstUserMessage}</div>
  <div className="text-xs text-muted-foreground flex gap-2 mt-1">
    <span>{relativeTime}</span>
    <span>·</span>
    <Tooltip content={cwdFull}>
      <span>{cwdShort}</span>
    </Tooltip>
    <span>·</span>
    <span>{tokens}k tokens</span>
  </div>
</button>
```

## 4. 빈 상태

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   [OpenAIIcon · 회색 size-12]                           │
│                                                         │
│   이 워크스페이스에 codex 세션이 없습니다               │
│                                                         │
│   [Codex 새 대화]                                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 5. 로딩 상태 (Skeleton)

```
┌─────────────────────────────────────────────────────────┐
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                            │
│  ▓▓▓▓▓ · ▓▓▓▓▓▓▓ · ▓▓▓▓▓▓▓                            │
├─────────────────────────────────────────────────────────┤
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                            │
│  ▓▓▓▓▓ · ▓▓▓▓▓▓▓ · ▓▓▓▓▓▓▓                            │
├─────────────────────────────────────────────────────────┤
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                            │
│  ▓▓▓▓▓ · ▓▓▓▓▓▓▓ · ▓▓▓▓▓▓▓                            │
└─────────────────────────────────────────────────────────┘
```

`Skeleton` shadcn 3개 — 항목 placeholder.

## 6. 에러 상태

```
┌─────────────────────────────────────────────────────────┐
│   [AlertCircle · 빨간 size-8]                           │
│                                                         │
│   세션 목록을 불러오지 못했습니다                       │
│                                                         │
│   [Retry]                                               │
└─────────────────────────────────────────────────────────┘
```

## 7. 모바일 — Bottom sheet

| 영역 | 모바일 차이 |
| --- | --- |
| 위치 | 하단 fixed (drag handle 위) |
| 카드 항목 높이 | `min-h-14` (56px) — 터치 타겟 |
| 헤더 | 컴팩트 (높이 ↓) |
| 세션 항목 swipe 액션 | v19 미지원 (예정 작업) |

## 8. 인터랙션 피드백

| 액션 | 피드백 |
| --- | --- |
| 메뉴 hover | 200ms 후 sheet prefetch (`onMouseEnter`) |
| 메뉴 클릭 | 즉시 sheet 열림 (200ms slide-in) |
| 카드 hover | 배경 강조 + 모델명 tooltip (지연 100ms) |
| 카드 클릭 | 즉시 sheet 닫힘 (낙관적) + 새 탭 활성화 |
| Retry 버튼 | 즉시 skeleton 재진입 + listCodexSessions 재호출 |
| 검색 (v19 외부) | 실시간 필터링 |

## 9. 가상 스크롤 (성능)

100+ 세션 부드러운 스크롤 위해 `react-virtuoso` (또는 동등) 적용.

```tsx
<Virtuoso
  totalCount={sessions.length}
  itemContent={(index) => <SessionCard session={sessions[index]} />}
/>
```

각 카드 height 자동 측정 → 동적 가상화.

## 10. 빈 / 로딩 / 에러 정리

| 상태 | 트리거 | 표시 |
| --- | --- | --- |
| Loading | 첫 진입 또는 Retry | Skeleton 3개 |
| Empty | `sessions.length === 0` | 빈 상태 + Codex 새 대화 버튼 |
| Error | `listCodexSessions` 실패 | 에러 + Retry |
| Loaded | sessions 있음 | 가상 스크롤 |

## 11. 접근성

- Sheet는 `Dialog` semantics (focus trap, Esc 닫기)
- 카드는 `<button>` (keyboard accessible)
- 카드 내 정보는 `aria-label` 결합 (`{message} · {time} · {cwd}`)
- 빈 상태의 Codex 새 대화 버튼 자동 포커스 (`autoFocus`)
- Retry 버튼 동일

## 12. 반응형

- Desktop: 우측 sheet 폭 400px
- 태블릿: 우측 sheet 폭 360px
- 모바일: bottom sheet 전체 폭, 높이 80vh

## 13. STYLE.md 팔레트 준수

- 카드 hover 배경: `bg-accent`
- Provider 아이콘 색상: 기본 `text-foreground`, hover 시 강조
- 시간/cwd 메타: `text-muted-foreground`
- 토큰 수 우측 정렬은 monospace fallback (`font-mono text-xs`)
