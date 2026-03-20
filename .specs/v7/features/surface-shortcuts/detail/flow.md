# 사용자 흐름

## 1. 새 탭 생성 (⌘T)

```
1. 사용자가 ⌘T / Ctrl+T 입력
2. useHotkeys 콜백 실행:
   a. layout.layout null 체크 → null이면 return
   b. focusedPaneId null 체크 → null이면 return
   c. layout.createTabInPane(focusedPaneId) 호출
3. createTabInPane 내부 (기존 로직):
   a. 활성 탭의 cwd 가져오기
   b. POST /api/layout/pane/{id}/tabs → 새 Tab + tmux 세션 생성
   c. 로컬 layout에 탭 추가
   d. activeTabId = 새 탭 ID
4. PaneContainer → 활성 탭 변경 감지 → WebSocket 연결 → 터미널 렌더링
5. xterm.js focus()
```

## 2. 탭 닫기 (⌘W)

```
1. 사용자가 ⌘W / Ctrl+W 입력
2. useHotkeys 콜백 실행:
   a. layout.layout null 체크
   b. focusedPaneId null 체크
   c. focusedPane에서 activeTabId 가져오기
   d. activeTabId null 체크 → null이면 return
   e. layout.deleteTabInPane(focusedPaneId, activeTabId) 호출
3. deleteTabInPane 내부 (기존 X 버튼과 동일한 함수):
   a. 로컬에서 탭 제거
   b. activeTabId를 인접 탭으로 갱신
   c. 탭이 0개 → closePane 호출 (paneCount > 1이면)
   d. DELETE /api/layout/pane/{id}/tabs/{tabId}
4. 탭이 남아 있으면 → 인접 탭 활성화 + 터미널 전환
5. Pane이 제거되면 → 인접 Pane으로 포커스 이동
```

### Workspace 최후의 Pane/탭 닫기

```
paneCount === 1, tabs.length === 1
→ ⌘W 입력
→ deleteTabInPane 호출
→ 기존 X 버튼 로직이 처리 (별도 단축키 로직 없음)
```

## 3. 이전/다음 탭 전환 (⌘⇧[ / ⌘⇧])

```
1. 사용자가 ⌘⇧] / Ctrl+Shift+] 입력 (다음 탭)
2. useHotkeys 콜백 실행:
   a. focusedPane의 tabs 배열 가져오기
   b. 현재 activeTabId의 인덱스 찾기
   c. 다음 인덱스 계산: currentIndex + 1
   d. 범위 초과 (마지막 탭) → return (순환 없음)
   e. layout.switchTabInPane(focusedPaneId, tabs[nextIndex].id) 호출
3. switchTabInPane 내부 (기존 로직):
   a. pane.activeTabId = 새 탭 ID (로컬 state)
4. PaneContainer → 활성 탭 변경 → WebSocket 전환 → 터미널 렌더링
```

### 이전 탭 (⌘⇧[)

동일한 흐름. `currentIndex - 1`, 인덱스 < 0이면 return.

## 4. 번호로 탭 이동 (⌃1~9)

```
1. 사용자가 ⌃3 / Alt+3 입력
2. useHotkeys 콜백 실행:
   a. focusedPane의 tabs 배열 가져오기
   b. 3번째 탭 (index 2) 존재 여부 확인
   c. 존재하지 않으면 → return
   d. 이미 활성 탭이면 → return
   e. layout.switchTabInPane(focusedPaneId, tabs[2].id) 호출
3. 나머지는 이전/다음 탭 전환과 동일
```

### ⌃9 (마지막 탭)

```
tabs[tabs.length - 1].id로 switchTabInPane 호출
```

## 5. 엣지 케이스

### 탭 1개인 Pane에서 ⌘⇧[ / ⌘⇧]

```
tabs.length === 1
├── currentIndex === 0
├── 이전: index -1 → 범위 초과 → return
├── 다음: index 1 → 범위 초과 → return
└── 무시
```

### 빠른 연속 탭 전환

```
⌘⇧] 빠르게 3회 입력
├── 각각 독립적으로 switchTabInPane 호출
├── switchTabInPane은 로컬 state만 변경 (동기적)
└── 마지막 상태가 최종 반영
```

### 탭 생성 중 닫기 요청

```
⌘T → createTabInPane 진행 중 (POST 대기)
├── 즉시 ⌘W 입력
├── 현재 activeTabId (기존 탭) 닫기 시도
├── createTabInPane 완료 후 새 탭이 활성화
└── 충돌 없음 (각각 독립 동작)
```
