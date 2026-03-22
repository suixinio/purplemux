# 사용자 흐름

## 1. 사이드바 인디케이터 표시 흐름

```
1. 사이드바 렌더링 → 각 Workspace 항목
2. useClaudeStatusStore.getWorkspaceStatus(wsId) 구독
3. 집계 결과:
   a. busyCount > 0 → spinner 렌더링
   b. attentionCount > 0 → 숫자 뱃지 렌더링
   c. 양쪽 모두 > 0 → spinner + 뱃지 모두
   d. 모두 0 → 인디케이터 미렌더링
4. 서버에서 status:update 수신 → 해당 Workspace의 집계 자동 갱신
```

## 2. Workspace 전환 → 탭 확인

```
1. 사용자: 뱃지(needs-attention)가 있는 비활성 Workspace 클릭
2. Workspace 전환 (기존 로직)
3. 해당 Workspace의 탭 바 표시
4. needs-attention 탭에 dot 표시 (아직 개별 방문 안 함)
5. Workspace 전환만으로는 dismiss 안 됨
6. 사용자: dot 있는 탭 클릭 → 해당 탭 dismiss
7. 모든 탭 확인 시 → 사이드바 뱃지 사라짐
```

## 3. 다른 Workspace에서 작업 중 상태 변경

```
1. 사용자: Workspace A에서 작업 중
2. Workspace B의 탭에서 Claude 실행 완료 (서버 폴링 감지)
3. 서버 → 클라이언트: status:update (Workspace B의 탭)
4. Workspace B의 집계 갱신: attentionCount 1 증가
5. 사이드바의 Workspace B 항목에 뱃지 표시 (또는 숫자 증가)
6. 사용자: 사이드바 뱃지 보고 Workspace B로 전환
7. 해당 탭 방문 → dismiss → 뱃지 숫자 감소 (0이면 사라짐)
```

## 4. 여러 탭 순차 확인

```
1. Workspace A: 3개 탭 needs-attention → 뱃지 "3"
2. 사용자: 탭 1 클릭 → dismiss → 뱃지 "2"
3. 사용자: 탭 2 클릭 → dismiss → 뱃지 "1"
4. 사용자: 탭 3 클릭 → dismiss → 뱃지 사라짐
```

## 5. busy → needs-attention 전이

```
1. Workspace A: 탭 2개 busy → spinner 표시
2. 탭 1: busy → idle → needs-attention
3. 집계: busyCount=1, attentionCount=1 → spinner + 뱃지 "1"
4. 탭 2: busy → idle → needs-attention
5. 집계: busyCount=0, attentionCount=2 → 뱃지 "2" (spinner 사라짐)
```

## 6. 엣지 케이스

### Workspace에 Claude Code 탭이 없는 경우

```
Workspace 내 모든 탭이 일반 터미널
├── 상태 스토어에 해당 탭 없음
├── 집계: busyCount=0, attentionCount=0
└── 인디케이터 표시 없음 (항상 idle)
```

### 9개 초과 needs-attention

```
Workspace에 15개 탭 모두 needs-attention
├── 뱃지 표시: "9+"
└── 전체 수를 표시하면 뱃지가 너무 넓어짐 방지
```

### Workspace 삭제

```
1. Workspace 삭제
2. 해당 Workspace의 모든 탭 상태 → 서버에서 제거
3. status:update broadcast → 클라이언트 스토어에서 제거
4. 사이드바에서 해당 항목 자체 사라짐
```
