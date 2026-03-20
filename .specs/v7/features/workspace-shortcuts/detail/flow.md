# 사용자 흐름

## 1. Workspace 번호 전환 (⌘1~9)

```
1. 사용자가 ⌘2 / Ctrl+2 입력
2. useHotkeys 콜백 실행:
   a. ws.workspaces 배열 가져오기
   b. index 1 (2번째) 존재 여부 확인
   c. 존재하지 않으면 → return
   d. 이미 활성 Workspace이면 → return
   e. 기존 Workspace 전환 로직 호출:
      - layout.saveCurrentLayout() (현재 레이아웃 fire-and-forget 저장)
      - layout.clearLayout()
      - ws.switchWorkspace(workspaces[1].id)
3. switchWorkspace 내부 (기존 로직):
   a. setActiveWorkspaceId(targetId)
   b. saveActive({ activeWorkspaceId: targetId }) — 즉시 PATCH
4. useLayout hook → workspaceId 변경 감지 → GET /api/layout?workspace={targetId}
5. Pane 트리 렌더링 → WebSocket 연결 → 터미널 포커스
```

### ⌘9 (마지막 Workspace)

```
const lastWs = ws.workspaces[ws.workspaces.length - 1];
→ 이후 동일한 전환 흐름
```

### Optimistic UI

- 사이드바 활성 항목은 `setActiveWorkspaceId`로 즉시 갱신 (서버 응답 불필요)
- 메인 영역은 fadeOut → fetch → fadeIn 패턴 (기존과 동일)

### 실패 시 롤백

기존 `onFetchError` 로직 그대로:

```
레이아웃 fetch 3회 실패
→ prevWorkspaceIdRef에서 이전 ID 복원
→ switchWorkspace(prevId)
→ toast.error('전환할 수 없습니다')
```

## 2. 터미널 스크롤백 지우기 (⌘K)

```
1. 사용자가 ⌘K / Ctrl+K 입력
2. useHotkeys 콜백 실행:
   a. layout.layout null 체크
   b. focusedPaneId null 체크
   c. 포커스된 Pane의 터미널 clear() 호출
3. xterm.js clear() 내부:
   a. 스크롤백 버퍼 제거
   b. 현재 화면 내용 유지
   c. 스크롤 위치 최하단
```

### clear() 호출 방식

`use-terminal.ts`가 이미 `clear()` 함수를 노출:

```
const { clear } = useTerminal({ ... });
```

단축키 훅에서 포커스된 Pane의 `clear` 함수에 접근하는 방법:
- PaneContainer에서 터미널 ref를 통해 clear를 노출
- 또는 이벤트 기반: 커스텀 이벤트 `dispatchEvent` → PaneContainer에서 리스닝
- 또는 콜백 등록: `onClearTerminal` 콜백을 PaneContainer에 전달

## 3. 엣지 케이스

### Workspace 전환 중 추가 전환 요청

```
⌘1 → 전환 시작 (fadeOut + fetch)
├── 즉시 ⌘3 입력
├── layout.layout === null (clearLayout 후)
├── 단축키 콜백에서 layout null 체크 → return? 또는 전환 진행?
└── 기존 전환 로직의 동시성 처리에 위임
```

### Workspace 1개인 상태에서 ⌘1

```
Workspace 1개 → ⌘1 입력
├── workspaces[0].id === activeWorkspaceId
├── 이미 활성 → return
└── 무시
```

### 스크롤백 지우기 후 즉시 출력

```
⌘K → clear() 실행
├── 즉시 터미널 출력 발생 (실행 중인 프로세스)
└── 새 출력은 정상적으로 표시 (clear는 히스토리만 제거)
```

### 비활성 탭의 터미널

```
Pane에 Tab1(활성), Tab2 존재
├── ⌘K 입력
├── 활성 탭(Tab1)의 터미널만 clear
└── Tab2는 영향 없음
```
