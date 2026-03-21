# 사용자 흐름

## 1. 메타 바 초기화 흐름

```
1. Claude Code Panel 마운트 → 타임라인 뷰 진입
2. timeline:init 수신 → 전체 엔트리 로드
3. 메타 데이터 계산:
   a. 제목: entries에서 첫 user-message 텍스트 (또는 summary 필드)
   b. 생성 시간: entries[0].timestamp
   c. 수정 시간: entries[entries.length - 1].timestamp
   d. 메시지 수: user-message / assistant-message 각각 카운트
   e. 토큰: 모든 엔트리의 usage 합산 (input_tokens, output_tokens)
4. 메타 바 렌더링 (컴팩트 모드)
5. git 브랜치 조회: GET /api/git/branch (비동기, 메타 바와 독립)
```

## 2. 실시간 갱신 흐름

```
1. Claude Code가 작업 수행 → JSONL에 새 엔트리 기록
2. timeline:append 수신 → 새 엔트리 배열
3. 증분 업데이트:
   a. 새 엔트리 중 user-message → userCount += 1
   b. 새 엔트리 중 assistant-message → assistantCount += 1
   c. 새 엔트리의 usage → inputTokens += usage.input_tokens, outputTokens += usage.output_tokens
   d. 수정 시간 = 마지막 엔트리 타임스탬프
4. 메타 바 UI 즉시 갱신
```

## 3. 컴팩트 ↔ 상세 전환 흐름

```
1. 컴팩트 모드에서 메타 바 클릭
2. 상세 모드로 확장:
   a. height transition 150ms
   b. git 브랜치 정보 표시 (이미 로드됨)
   c. 접기 아이콘(▾) 표시
3. 상세 모드에서:
   a. 재클릭 → 컴팩트로 접기
   b. 외부 클릭 → 컴팩트로 접기
   c. Escape → 컴팩트로 접기
4. 접기 시 height transition 150ms
```

## 4. git 브랜치 폴링 흐름

```
1. 메타 바 마운트 시 → GET /api/git/branch?tmuxSession={name}
2. 응답:
   a. { branch: "feature/fix-bug" } → 브랜치명 표시
   b. { branch: null } → git 저장소 아님 → 브랜치 항목 숨김
   c. 에러 → 브랜치 항목 숨김 (조용히 실패)
3. 30초 후 재조회 (setInterval)
4. 메타 바 언마운트 시 인터벌 해제
```

## 5. 세션 전환 시 메타 바 갱신 흐름

```
1. timeline:session-changed 수신 (새 세션 시작 또는 resume)
2. 메타 데이터 초기화:
   a. 제목, 시간, 메시지 수, 토큰 → 모두 리셋
3. timeline:init 수신 → 새 세션 기준 전체 재계산
4. 메타 바 갱신
5. git 브랜치: 기존 폴링 유지 (cwd 변경 없으면 동일)
```

## 6. 상대 시간 자동 갱신 흐름

```
1. 메타 바 마운트 시 setInterval(60초)
2. 매 60초: dayjs fromNow 재계산
   - "방금 전" → "1분 전" → "2분 전" → ... → "1시간 전"
3. 메타 바 언마운트 시 인터벌 해제
```

## 7. 엣지 케이스

### 빈 세션 (엔트리 0개)

```
timeline:init → entries = []
├── 제목: "(새 세션)"
├── 시간: 없음 (대시 표시)
├── 메시지 수: 0턴
├── 토큰: 0
└── 메타 바는 표시하되 정보 최소화
```

### usage 필드가 없는 엔트리

```
timeline:append → 새 엔트리에 usage 없음
├── 해당 엔트리의 토큰 기여: 0
├── 기존 합계 유지
└── 에러 없이 정상 처리
```

### 매우 긴 세션 제목

```
첫 user-message가 200자 이상
├── 컴팩트: max-w-[200px] + truncate + ellipsis
├── 상세: 전체 표시 (여러 줄 가능, max-h 제한)
└── Tooltip: 전체 텍스트
```

### 탭 전환 후 복귀

```
다른 탭 → Claude Code Panel 탭 복귀
├── 메타 바 state 유지 (컴포넌트 숨김 상태에서도 state 보존)
├── timeline:append 계속 수신 중이었으므로 최신 데이터
└── 즉시 표시
```

### 토큰 단위 전환

```
토큰 합계가 999 → 1,000:
├── "999" → "1.0K" (K 단위 전환)
├── 숫자 변경 시 깜빡임 없이 자연스럽게 전환
└── 1,000,000+ → "1.0M"
```
