# page-generator — 페이지 코드 생성

스펙 문서 기반으로 코드를 생성합니다.
컨텍스트를 깔끔하게 유지하고 정확한 코드를 생성하기 위해 **한 번에 하나의 feature만 처리**합니다.
"v1 visit-planning 구현해줘" 요청 시 사용합니다.

## Instructions

다음 단계를 순서대로 수행하세요.

### 1. 인자 확인

- 첫 번째 인자: 버전 (예: v1, v2)
- 두 번째 인자: feature명 (예: visit-planning)
- feature명이 없으면 "feature명을 지정해주세요. 예: `/4-build v1 visit-planning`" 안내 후 종료

### 2. CLAUDE.md 로드

- `CLAUDE.md`를 읽어 기술 스택, 코드 규칙, 참고 문서 링크 파악

### 3. 프로젝트 가이드 로드

- `spec.md`의 `depends_on`에 명시된 `docs/` 가이드를 로드하여 참조

### 4. 스펙 참조 및 코드 생성

다음 4개 스펙 문서를 모두 참조하여 코드를 생성합니다:

- `.specs/v{N}/features/{feature-name}/spec.md` — 페이지 개요, 주요 기능
- `.specs/v{N}/features/{feature-name}/detail/ui.md` — 화면 구성, 컴포넌트 매핑
- `.specs/v{N}/features/{feature-name}/detail/flow.md` — 사용자 흐름, 상태 전이
- `.specs/v{N}/features/{feature-name}/detail/api.md` — API 연동, 쿼리/뮤테이션

AI가 읽는 전체 컨텍스트:

```
CLAUDE.md (기술 스택 + 규칙 + 참고 문서 링크)
  + docs/{관련 가이드}.md
  + .specs/v{N}/features/{feature-name}/spec.md
  + .specs/v{N}/features/{feature-name}/detail/ui.md
  + .specs/v{N}/features/{feature-name}/detail/flow.md
  + .specs/v{N}/features/{feature-name}/detail/api.md
```

### 5. 기술 스택 준수

- `CLAUDE.md`의 기술 스택에 맞는 구조로 코드 생성
- 프로젝트의 기존 코드 패턴과 컨벤션 준수

### 6. 완료 안내

- 코드 생성 완료 후 다음 안내 메시지를 반드시 출력:

```
다음 feature를 빌드하려면 `/new` 후 `/4-build`를 실행하세요.
(컨텍스트를 정리하고 새로운 세션에서 더 정확한 코드를 생성합니다)
```

### 7. 품질 기준 필수 적용

생성하는 모든 코드는 아래 세 가지 기준을 충족해야 합니다. 미달 시 코드를 생성하지 않습니다.

#### 빠르다

- Optimistic UI 패턴 적용 (mutation 후 UI 즉시 반영, 실패 시 롤백)
- 스켈레톤 로딩 / 스피너를 모든 비동기 구간에 적용
- SWR/캐시 전략, prefetch, 지연 로딩(dynamic import) 활용
- 대량 목록은 가상 스크롤 또는 무한 스크롤 적용

#### 토스급 완성도

- 모든 비동기 UI에 로딩·빈·에러·성공 4가지 상태 구현
- 폼 유효성 실시간 검증, 토스트/알림 피드백
- 접근성: 키보드 내비게이션, 포커스 관리, 적절한 ARIA 속성
- "일단 동작하는" 수준의 코드는 절대 커밋하지 않는다

#### 포브스 TOP 10 기업 수준

- 스펙에 명시된 기능은 빠짐없이, 실무에서 바로 쓸 수 있는 깊이로 구현
- "되긴 되는" 수준이 아닌 "이 기능 하나로 충분하다"는 완결성을 목표
- 기능과 관련된 맥락 정보를 화면에 함께 제공하여 사용자가 추가 조작 없이 업무를 완료할 수 있게 한다
