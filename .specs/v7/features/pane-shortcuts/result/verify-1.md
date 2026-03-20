---
step: verify-1
timestamp: 2026-03-20 00:24
elapsed: 3분 24초
status: verified
round: 1/3
---
## 검증 결과: pane-shortcuts

### 구현 완료 항목

#### spec.md 대조
- [x] **Pane 수직 분할 (⌘D / Ctrl+D)** — `keyboard-shortcuts.ts:11`, `use-keyboard-shortcuts.ts:65-73`에서 `splitPane(paneId, 'vertical')` 호출
- [x] **Pane 수평 분할 (⌘⇧D / Ctrl+Shift+D)** — `keyboard-shortcuts.ts:12`, `use-keyboard-shortcuts.ts:76-83`에서 `splitPane(paneId, 'horizontal')` 호출
- [x] **새 Pane에 기본 탭 1개 생성, 포커스 자동 이동** — `use-layout.ts:348-366`에서 newPane 생성 후 `focusedPaneId = newPaneId` 설정
- [x] **작업 디렉토리 유지** — `use-layout.ts:328-338`에서 기존 탭의 cwd를 가져와 전달
- [x] **4방향 포커스 이동 (⌥⌘+방향키)** — `use-keyboard-shortcuts.ts:87-104`에서 4방향 개별 등록
- [x] **레이아웃 트리 기반 인접 Pane 판정** — `use-layout.ts:43-78` `findAdjacentPaneInDirection` 순수 함수
- [x] **상위 split 노드까지 올라가서 탐색** — `use-layout.ts:66` 역방향 path 탐색 구현
- [x] **해당 방향에 Pane 없으면 무시** — `use-keyboard-shortcuts.ts:96` `if (targetId)` 가드
- [x] **포커스 이동 후 xterm.js focus()** — `pane-container.tsx:273-280` isFocused useEffect
- [x] **focusPane() 호출로 focusedPaneId 갱신** — `use-layout.ts:415-423`
- [x] **포커스 Pane 탭 바 하이라이트** — `pane-container.tsx:361` `border-ui-purple` 적용

#### ui.md 대조
- [x] **분할 전/후 레이아웃** — splitPane이 split 노드를 생성하고 ratio: 50으로 균등 분할 (`use-layout.ts:358-363`)
- [x] **분할 불가 상태 (canSplit === false) 시 단축키 무시** — `use-keyboard-shortcuts.ts:69,80` `!l.canSplit` 가드
- [x] **canSplit = paneCount < 10 && !isSplitting** — `use-layout.ts:318`
- [x] **포커스 표시 (탭 바 하이라이트)** — `pane-container.tsx:360-361` border 스타일 적용
- [x] **방향에 Pane 없을 때 시각적 변화 없음** — `findAdjacentPaneInDirection` → null → 무시
- [x] **로딩 상태 (layout === null) 시 단축키 무시** — `use-keyboard-shortcuts.ts:69,80,90` `!l.layout?.focusedPaneId` 가드
- [x] **분할 진행 중 (isSplitting) 시 추가 분할 무시** — canSplit에 isSplitting 포함

#### flow.md 대조
- [x] **수직 분할 흐름 (1~5단계)** — layout null 체크 → focusedPaneId 체크 → canSplit 체크 → splitPane 호출 → xterm focus
- [x] **수평 분할 흐름** — 수직과 동일, orientation만 `'horizontal'`
- [x] **포커스 이동 흐름** — layout 체크 → focusedPaneId 체크 → findAdjacentPaneInDirection → focusPane → xterm focus
- [x] **방향별 판정 규칙 (left/right/up/down)** — `use-layout.ts:62-74` targetOrientation/fromChildIndex 매핑 정확
- [x] **중첩 분할 예시 (Pane A/B/C)** — 알고리즘 검증 완료 (모든 방향 케이스 일치)
- [x] **서버 확정 기반 (Optimistic UI 아님)** — POST 응답 후 트리 변환 (`use-layout.ts:340-367`)
- [x] **isSplitting 플래그로 중복 방지** — `use-layout.ts:323,326,371` try/finally 패턴
- [x] **엣지 케이스: 단일 Pane에서 분할 후 즉시 이동** — 정상 (splitPane 완료 후 트리 갱신됨)
- [x] **엣지 케이스: 최대 Pane 수 (10개) 도달** — canSplit + collectPanes 이중 체크
- [x] **엣지 케이스: Pane 1개에서 모든 방향 이동** — findAdjacentPaneInDirection → null → 무시

#### api.md 대조
- [x] **⌘D → splitPane → POST /api/layout/pane** — `use-layout.ts:340-346`
- [x] **⌘⇧D → splitPane → POST /api/layout/pane** — 동일 함수, orientation 차이
- [x] **⌥⌘+방향키 → focusPane → API 호출 없음 (로컬 state)** — `use-layout.ts:415-423` setLayout만
- [x] **findAdjacentPaneInDirection 순수 함수** — `use-layout.ts:43-78` 부수 효과 없음
- [x] **focusPane 서버 저장은 Phase 6 자동 저장** — beforeunload beacon + updateAndSave 시 동기화
- [x] **xterm.js 앱 단축키 인터셉션** — `keyboard-shortcuts.ts:35-107` isAppShortcut Set 기반

### 누락/불일치 항목

없음.

### 품질 미달 항목

없음.

### 요약

| 항목 | 수 |
|---|---|
| 전체 항목 | 27개 |
| 구현 완료 | 27개 |
| 누락/불일치 | 0개 |
| 품질 미달 | 0개 |

---

모든 항목이 통과했습니다. 스펙 대비 구현이 완전히 일치합니다.

핵심 구현 포인트:
- `findAdjacentPaneInDirection` 알고리즘이 중첩 분할 케이스까지 정확하게 동작
- 모든 단축키 핸들러에 layout/focusedPaneId/canSplit 가드가 일관되게 적용
- xterm.js와의 단축키 충돌이 `isAppShortcut` Set으로 해결됨
- 포커스 변경 시 자동 xterm focus() + resize 동기화 구현
