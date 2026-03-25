# Task 체크리스트 실시간 표시

## 배경

Claude Code CLI는 복잡한 작업 시 `TaskCreate`/`TaskUpdate` 도구를 호출하여 진행 상황을 추적한다.
현재 이 호출들은 타임라인에서 일반 tool-call로만 표시되어, 전체 task 진행률을 한눈에 파악하기 어렵다.

## 원하는 기능

1. TaskCreate 도구 호출을 감지하면 task 목록에 추가
2. TaskUpdate 도구 호출을 감지하면 해당 task 상태 변경 (pending → in_progress → completed)
3. 타임라인 상단에 task 체크리스트 UI 표시
4. 실시간 업데이트 (기존 jsonl 파싱 파이프라인 활용)

## 데이터 소스

### TaskCreate (jsonl 내 assistant 엔트리의 tool_use 블록)

```json
{
  "type": "tool_use",
  "name": "TaskCreate",
  "input": {
    "subject": "checkJsonlIdle mtime 캐시 적용",
    "description": "status-manager.ts의 checkJsonlIdle에 mtime 기반 캐시 추가",
    "activeForm": "checkJsonlIdle mtime 캐시 적용 중"
  }
}
```

### TaskUpdate (jsonl 내 assistant 엔트리의 tool_use 블록)

```json
{
  "type": "tool_use",
  "name": "TaskUpdate",
  "input": {
    "taskId": "1",
    "status": "in_progress" | "completed"
  }
}
```

- taskId는 1부터 시작하는 순서 번호 (문자열)
- TaskCreate 순서대로 1, 2, 3... 할당

## 기존 인프라

- session-parser.ts: parseSingleEntry()에서 tool_use를 tool-call 엔트리로 변환
- timeline-server.ts: fs.watch → parseIncremental → WebSocket broadcast
- use-timeline.ts: entries 배열 상태 관리, handleAppend로 실시간 추가
- timeline-view.tsx: entries 렌더링, groupTimelineEntries로 tool-call 그룹화

## UI 참고

- opencode 프로젝트: 프롬프트 입력 위에 dock 형태로 체크리스트 표시
- 상태별 아이콘: ☐ pending, 🔄 in_progress (펄스 애니메이션), ✅ completed
- 진행률 카운터: "2 / 4" 형태
- task가 없으면 숨김, 전부 완료되면 자동 접힘
