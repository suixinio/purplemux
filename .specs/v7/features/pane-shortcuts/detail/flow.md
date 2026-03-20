# 사용자 흐름

## 1. Pane 수직 분할 (⌘D)

```
1. 사용자가 ⌘D / Ctrl+D 입력
2. useHotkeys 콜백 실행:
   a. layout.layout null 체크 → null이면 return
   b. focusedPaneId null 체크 → null이면 return
   c. canSplit 체크 → false이면 return
   d. layout.splitPane(focusedPaneId, 'vertical') 호출
3. splitPane 내부 (기존 로직):
   a. isSplitting = true
   b. 활성 탭의 cwd 가져오기 (GET /api/layout/pane/{id}/cwd)
   c. POST /api/layout/pane → 새 Pane + Tab 생성
   d. 레이아웃 트리 변환: Pane → Split(기존Pane, 새Pane)
   e. focusedPaneId = 새Pane.id
   f. isSplitting = false
4. PaneContainer useEffect → isFocused 변경 감지 → 새 Pane 터미널 focus()
5. 레이아웃 변경 → 자동 저장 (Phase 6)
```

### Optimistic UI

- 트리 변환은 서버 응답(POST) 후 실행 → optimistic이 아닌 서버 확정 기반
- splitPane 중 isSplitting 플래그로 중복 방지
- 분할 실패 시 레이아웃 변경 없음 (사용자에게 영향 없음)

## 2. Pane 수평 분할 (⌘⇧D)

수직 분할과 동일. `orientation` 파라미터만 `'horizontal'`로 변경.

## 3. Pane 포커스 이동 (⌥⌘ + 방향키)

```
1. 사용자가 ⌥⌘→ / Ctrl+Alt+→ 입력
2. useHotkeys 콜백 실행:
   a. layout.layout null 체크
   b. focusedPaneId null 체크
   c. findAdjacentPaneInDirection(layout.root, focusedPaneId, 'right') 호출
3. 방향 판정 (레이아웃 트리 기반):
   a. focusedPaneId에서 트리 위로 탐색
   b. 수직 split의 오른쪽 자식에 있으면 → 상위로 계속 탐색
   c. 수직 split의 왼쪽 자식에 있으면 → 오른쪽 자식의 첫 번째 Pane 반환
   d. 적절한 Pane을 찾지 못하면 → null 반환
4. 결과 Pane이 있으면:
   a. layout.focusPane(targetPaneId) 호출
   b. PaneContainer useEffect → isFocused 변경 감지 → xterm focus()
5. 결과 Pane이 없으면:
   a. 무시 (아무 동작 없음)
```

### 방향별 판정 규칙

| 입력 방향 | 탐색 대상 split | 탐색 방향 |
|---|---|---|
| `←` (left) | `orientation: 'vertical'` | 현재가 오른쪽 자식 → 왼쪽 자식의 마지막 Pane |
| `→` (right) | `orientation: 'vertical'` | 현재가 왼쪽 자식 → 오른쪽 자식의 첫 번째 Pane |
| `↑` (up) | `orientation: 'horizontal'` | 현재가 아래 자식 → 위쪽 자식의 마지막 Pane |
| `↓` (down) | `orientation: 'horizontal'` | 현재가 위쪽 자식 → 아래쪽 자식의 첫 번째 Pane |

### 중첩 분할 예시

```
Split(vertical)
├── Pane A
└── Split(horizontal)
    ├── Pane B
    └── Pane C

포커스: Pane A
├── ⌥⌘→ → 수직 split의 왼쪽 → 오른쪽 자식의 첫 번째 Pane → Pane B
├── ⌥⌘↓ → 수직 split에서 위/아래 관계 없음 → 상위 탐색 → null → 무시
└── ⌥⌘← → 수직 split의 왼쪽, 더 이상 상위 없음 → null → 무시

포커스: Pane B
├── ⌥⌘← → 수평 split에서 좌/우 관계 없음 → 상위(수직 split)의 오른쪽 → 왼쪽 자식 → Pane A
├── ⌥⌘↓ → 수평 split의 위쪽 → 아래쪽 자식 → Pane C
└── ⌥⌘→ → 상위(수직 split)의 오른쪽, 더 이상 오른쪽 없음 → null → 무시
```

## 4. 엣지 케이스

### 단일 Pane에서 분할 후 즉시 포커스 이동

```
Pane 1개 → ⌘D (수직 분할) → 포커스 새 Pane
→ 즉시 ⌥⌘← → 기존 Pane으로 이동
→ 정상 동작 (splitPane 완료 후 트리 업데이트되어 있음)
```

### 최대 Pane 수 도달 (10개)

```
paneCount === 10 → ⌘D 입력
├── canSplit === false
└── 무시 — 별도 에러 표시 없음
```

### Pane 1개인 상태에서 모든 방향 포커스 이동

```
Pane 1개 → ⌥⌘←/→/↑/↓
├── findAdjacentPaneInDirection → null (형제 없음)
└── 모두 무시
```
