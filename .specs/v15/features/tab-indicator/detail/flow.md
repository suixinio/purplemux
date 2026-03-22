# 사용자 흐름

## 1. 탭 인디케이터 표시 흐름

```
1. Claude Code Panel이 있는 탭이 존재
2. useClaudeStatusStore에서 해당 탭의 상태 구독
3. 상태 판단:
   a. busy → spinner 렌더링
   b. needs-attention + 비활성 탭 → dot 렌더링
   c. needs-attention + 활성 탭 → 즉시 dismiss (dot 안 뜸)
   d. idle → 인디케이터 미렌더링
4. 서버에서 status:update 수신 시 자동 갱신
```

## 2. 탭 전환 → 자동 dismiss

```
1. 사용자: needs-attention dot이 있는 탭 클릭
2. 로컬 처리 (즉시, optimistic):
   a. useClaudeStatusStore.dismissTab(tabId) 호출
   b. dot 즉시 제거 (리렌더)
3. 서버 알림 (비동기):
   a. WebSocket으로 status:tab-dismissed { tabId } 전송
   b. 서버 → 다른 클라이언트에 broadcast
4. 탭 콘텐츠 표시 (기존 탭 전환 로직)
```

## 3. busy → needs-attention 전이

```
1. Claude가 응답 생성 중 → 탭에 spinner 표시
2. Claude 처리 완료 → 프롬프트 복귀
3. 서버: cliState busy → idle, dismissed = false
4. 서버 → 클라이언트: status:update
5. 해당 탭이 활성 탭?
   a. 예 → 즉시 dismiss (dot 안 뜸, 이미 보고 있으므로)
   b. 아니오 → spinner → dot으로 전환
```

## 4. Claude 시작/종료

```
Claude 시작 (inactive → busy):
1. 서버: cliState = busy 감지
2. 서버 → 클라이언트: status:update
3. 탭에 spinner 표시

Claude 종료 (busy/idle → inactive):
1. 서버: cliState = inactive 감지
2. 서버 → 클라이언트: status:update
3. spinner/dot 즉시 제거 → idle (표시 없음)
```

## 5. 엣지 케이스

### 빠른 연속 상태 변경

```
Claude busy → idle → busy (짧은 간격)
├── spinner → dot → spinner (각 상태가 순차 반영)
├── 중간 dot 표시 시간이 매우 짧을 수 있음
└── 문제 없음 — 상태 그대로 반영
```

### 탭이 많은 경우

```
탭 20개, 그 중 5개 busy
├── 각 탭이 독립적으로 자신의 상태만 구독
├── 한 탭 상태 변경이 다른 탭 리렌더를 유발하지 않음
└── Zustand selector: (state) => state.tabs[tabId]
```

### 드래그 정렬 중 인디케이터

```
탭 드래그 중에도 인디케이터 유지
├── 드래그 ghost 요소에도 spinner/dot 포함
└── 드롭 후 인디케이터 정상 표시
```
