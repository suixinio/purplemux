# v14 요구사항 정리

## 출처

- `.specs/v14/requirements/overview.md` — 프로젝트 개요 및 로드맵
- `.specs/v14/requirements/phase14-skill.md` — Phase 14 스킬 시스템 PRD

## 페이지 목록 (도출)

v14는 기존 Claude Code Panel의 입력창에 스킬 시스템을 추가하고, 설정 페이지에 스킬 관리 UI를 제공한다.

| 페이지 | 설명 | 우선순위 |
|---|---|---|
| Suggest UI | 입력창 위에 스킬 버튼을 노출하는 suggest 바 | P0 |
| 스킬 실행 엔진 | 스킬 파일 파싱 + `!command` 치환 + 프롬프트 생성 서버 API | P0 |
| 스킬 설정 | 설정 페이지에서 스킬 on/off 토글 관리 | P0 |

---

## 주요 요구사항

### 스킬 정의 포맷

- 마크다운 파일 1개 = 스킬 1개
- YAML front matter: `name`, `description`, `allowed-tools` (선택적)
- 본문: 프롬프트 텍스트 + `` !`command` `` 동적 컨텍스트 문법
- `` !`command` `` → 서버에서 실행 → 결과로 치환 (프롬프트에 인라인 삽입)
- Claude Code 플러그인 포맷 호환

### 빌트인 스킬 — "커밋하기"

1차 구현에서는 빌트인 스킬 1개만 탑재:

```markdown
---
name: 커밋하기
description: 변경사항을 분석하고 커밋합니다
allowed-tools: [Bash, Read]
---
다음 변경사항을 분석하고 적절한 커밋 메시지를 작성하여 커밋해주세요.
!`git status`
!`git diff HEAD`
!`git log --oneline -10`
```

- 서버에 내장 (별도 설치 불필요)
- git 상태 자동 수집 → Claude Code가 분석 + 스테이징 + 커밋

### Suggest UI

- 위치: 입력창 바로 위, 가로 나열
- 각 버튼: 스킬 이름 텍스트 (pill 형태)
- 표시 조건: Claude Code `idle` 상태일 때만 (busy/inactive에서는 숨김)
- 비활성화(off)된 스킬은 숨김
- 클릭 → 스킬 실행 → 프롬프트 생성 → 입력창에 표시 또는 즉시 전송
- 모바일에서도 동일하게 표시

### 스킬 실행 엔진 (서버)

- REST API: `POST /api/skills/execute`
  - 요청: `{ skillId, tmuxSession }` (tmuxSession으로 cwd 조회)
  - 서버: 스킬 마크다운 읽기 → `` !`command` ``를 cwd에서 실행 → 결과 치환
  - 응답: `{ prompt }` (완성된 프롬프트 텍스트)
- `` !`command` `` 실행은 해당 tmux 세션의 cwd에서 수행
- 명령어 실행 타임아웃: 10초
- 실패 시: 해당 `` !`command` `` 영역에 에러 메시지 삽입 (전체 실패 아님)

### 스킬 설정 관리

- 설정 페이지(또는 설정 모달)에서 스킬 목록 표시
- 각 스킬: 이름 + 설명 + on/off 토글 (shadcn/ui `Switch`)
- 설정 저장: `~/.purple-terminal/skills.json`
- 기본값: 모든 빌트인 스킬 `enabled: true`
- 스킬 목록 조회: `GET /api/skills` (빌트인 목록 + 활성 상태)

### 프롬프트 전송 방식

스킬 실행 후 생성된 프롬프트를 Claude Code에 전달하는 방식:

- **옵션 A: 입력창에 표시 후 사용자 확인** — 프롬프트가 입력창에 채워지고, 사용자가 확인/수정 후 Enter로 전송
- **옵션 B: 즉시 전송** — 프롬프트를 바로 PTY에 전송 (확인 없이)
- 1차 구현: **옵션 B (즉시 전송)** — 빌트인 스킬은 신뢰할 수 있으므로 확인 불필요. 추후 커스텀 스킬에서는 옵션 A 고려

---

## 제약 조건 / 참고 사항

### 기술적 제약

- **`` !`command` `` 보안**: 빌트인 스킬만 존재하므로 1차에서는 위험 없음. 추후 커스텀 스킬 허용 시 실행 가능 명령어 화이트리스트 또는 샌드박싱 필요
- **cwd 의존**: `` !`command` ``는 해당 Surface의 tmux 세션 cwd에서 실행. cwd가 변경되면 결과가 달라짐
- **프롬프트 크기**: git diff가 매우 큰 경우 프롬프트가 수천 줄이 될 수 있음. Claude Code의 입력 제한에 주의. 필요 시 truncate

### UX 고려사항

- **Suggest 버튼 스타일**: pill 형태, `variant="outline" size="sm"`, `text-xs`, `border-dashed`
- **스킬 실행 중 피드백**: suggest 버튼 클릭 후 → 버튼에 스피너 표시 (`` !`command` `` 실행 중) → 완료 후 전송
- **에러 표시**: 스킬 실행 실패 시 sonner 토스트로 에러 메시지 (예: "git이 설치되지 않았습니다")

### 성능

- `` !`command` `` 치환은 `git status`, `git diff`, `git log` 정도 — 각각 수 ms
- 전체 스킬 실행: 100ms 이내 (네트워크 포함)
- 스킬 목록 로드: 서버 시작 시 빌트인 파일 읽기 (1회)

---

## 미확인 사항

- [ ] 프롬프트가 매우 긴 경우 (git diff 수천 줄) — Claude Code 입력 제한과의 상호작용. truncate 기준 필요
- [ ] 설정 UI를 기존 설정 페이지에 섹션으로 추가할지, 별도 모달로 할지
- [ ] 모바일에서 suggest 버튼이 입력창 위에 겹치면서 화면을 차지하는 정도 — 모바일은 suggest를 접히는 형태로 변경할 수 있음
