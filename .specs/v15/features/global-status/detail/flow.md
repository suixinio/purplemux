# 사용자 흐름

## 1. 글로벌 요약 표시 흐름

```
1. App 렌더링 → app-header.tsx
2. useClaudeStatusStore.getGlobalStatus() 구독
3. 집계 결과:
   a. busyCount > 0 || attentionCount > 0 → 요약 텍스트 렌더링
   b. 양쪽 모두 0 → 요약 텍스트 미렌더링 (공간 점유 안 함)
4. 서버 status:update 수신 → 집계 자동 갱신
```

## 2. 드롭다운 → 탭 이동

```
1. 사용자: 요약 텍스트 클릭
2. Popover 열림 — 비-idle 세션 목록 표시
3. 목록 렌더링:
   a. needs-attention 항목 상단 (dot 아이콘)
   b. busy 항목 하단 (spinner 아이콘)
4. 사용자: 항목 클릭 (예: "frontend" / my-project)
5. 즉시 처리 (지연 없음):
   a. 해당 Workspace로 전환 (기존 Workspace 전환 로직)
   b. 해당 탭 활성화 (기존 탭 전환 로직)
   c. needs-attention이면 dismiss 처리
6. Popover 닫힘
```

## 3. 실시간 갱신 중 드롭다운

```
1. 드롭다운 열려 있는 상태
2. 서버에서 status:update 수신 (다른 탭 상태 변경)
3. 드롭다운 목록 자동 갱신:
   a. 새로 busy/needs-attention 된 탭 → 목록에 추가
   b. idle로 전환된 탭 → 목록에서 제거
   c. 상태 변경된 탭 → 아이콘 갱신 (spinner ↔ dot)
4. 모든 탭이 idle로 전환 → 드롭다운 자동 닫힘
```

## 4. 브라우저 탭 title 갱신

```
1. useClaudeStatusStore.getGlobalStatus() 구독
2. attentionCount 변경 감지 (useEffect)
3. attentionCount > 0:
   document.title = `(${attentionCount}) Purple Terminal`
4. attentionCount === 0:
   document.title = `Purple Terminal`
5. 다른 페이지(통계 등)에서는:
   document.title = `(${attentionCount}) 사용량 통계`
```

## 5. 모바일에서 축약 표시 → 드롭다운

```
1. 모바일 헤더: 아이콘 + 숫자만 표시
2. 터치 → Popover 열림 (데스크톱과 동일 드롭다운)
3. 항목 터치 → Workspace 전환 + 탭 활성화
4. Popover 닫힘
```

## 6. 키보드 네비게이션

```
1. Tab 키로 요약 텍스트에 포커스
2. Enter/Space → 드롭다운 열림
3. ↑↓ → 항목 간 이동 (포커스 하이라이트)
4. Enter → 선택한 항목으로 이동
5. Esc → 드롭다운 닫힘
```

## 7. 엣지 케이스

### 드롭다운에서 마지막 항목 dismiss

```
needs-attention 1개만 남은 드롭다운
├── 해당 항목 클릭 → dismiss → Workspace 전환
├── 목록 0개 → 드롭다운 닫힘
└── 요약 텍스트도 사라짐 (모두 idle)
```

### busy + needs-attention 동시 전환

```
탭 A: busy → idle (needs-attention 발생)
탭 B: idle → busy (Claude 시작)
├── 동시에 status:update 2건 수신
├── 집계: busyCount, attentionCount 각각 갱신
├── 요약 텍스트 + 드롭다운 즉시 반영
└── 리렌더 1회 (React batch)
```

### 매우 많은 항목 (20개+)

```
드롭다운 목록이 길 경우
├── max-h-64 overflow-y-auto
├── 스크롤 가능
└── 현재 포커스된 항목이 뷰포트 밖이면 스크롤 인투 뷰
```
