# 화면 구성

## 개요

이 feature는 UI 컴포넌트가 없다. 파서 레벨에서 타입 정의와 엔트리 변환만 담당하며, 화면 구성은 `task-checklist-ui` feature에서 처리한다.

## 타입 정의

### ITimelineTaskProgress (파서 출력)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | `string` | nanoid() 생성 |
| `type` | `'task-progress'` | 리터럴 |
| `timestamp` | `number` | 엔트리 타임스탬프 |
| `action` | `'create' \| 'update'` | TaskCreate / TaskUpdate 구분 |
| `taskId` | `string` | create: `''`, update: input.taskId |
| `subject` | `string?` | create 시 input.subject |
| `description` | `string?` | create 시 input.description |
| `status` | `'pending' \| 'in_progress' \| 'completed'` | create: `'pending'`, update: input.status |

### ITaskItem (클라이언트 파생 상태)

| 필드 | 타입 | 설명 |
|------|------|------|
| `taskId` | `string` | 등장 순서 `"1"`, `"2"`, ... |
| `subject` | `string` | TaskCreate의 subject |
| `description` | `string?` | TaskCreate의 description |
| `status` | `'pending' \| 'in_progress' \| 'completed'` | 최종 상태 |
