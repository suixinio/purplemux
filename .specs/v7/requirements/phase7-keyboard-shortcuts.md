# Phase 7 — 단축키 PRD

## 목표

cmux 호환 단축키로 키보드 중심 조작을 구현하는 것.

마우스 없이 단축키만으로 Pane 분할/이동, Surface 탭 전환/생성/삭제, Workspace 전환 등 전체 조작이 가능해야 한다.

## 완료 조건

마우스 없이 단축키만으로 전체 조작이 가능하다.

---

## 현재 상태 (Phase 6 완료)

### 이미 구현된 것

- Pane: 분할(수평/수직), 닫기, 리사이즈(드래그), 탭 이동(드래그)
- Surface: 탭 생성/삭제/전환/순서 변경/이름 변경 — 모두 마우스 클릭 기반
- Workspace: 생성/삭제/전환/이름 변경 — 사이드바 클릭 기반
- 사이드바: 접기/펼치기, 너비 조절 — 마우스 기반 + 키보드(ArrowLeft/Right) 일부 지원
- 키보드 이벤트: 인라인 핸들러만 존재 (탭/Workspace 이름 변경 시 Enter/Escape). 중앙 집중식 단축키 시스템 없음

### Phase 7에서 추가할 것

- 중앙 집중식 키보드 단축키 시스템 구축
- cmux 호환 단축키 매핑
- 단축키와 xterm.js 터미널 입력 간 충돌 해결

---

## 단축키 매핑 (cmux 호환)

### 설계 원칙

- cmux 단축키 체계를 기본으로 사용 (prefix key 없이 macOS 표준 ⌘ 기반)
- 크로스플랫폼 지원: macOS는 `⌘`(meta), Windows/Linux는 `Ctrl`로 매핑
- 브라우저 기본 단축키와 충돌하는 경우 cmux 단축키를 우선하되, 불가피한 경우 대안 키 배정
- xterm.js 터미널이 포커스된 상태에서도 단축키가 동작해야 함

### Pane 조작

| 동작 | macOS | Windows/Linux | 비고 |
|---|---|---|---|
| 오른쪽으로 분할 (수직) | `⌘D` | `Ctrl+D` | cmux 호환 |
| 아래로 분할 (수평) | `⌘⇧D` | `Ctrl+Shift+D` | cmux 호환 |
| Pane 포커스 이동 (좌) | `⌥⌘←` | `Ctrl+Alt+←` | cmux 호환 |
| Pane 포커스 이동 (우) | `⌥⌘→` | `Ctrl+Alt+→` | cmux 호환 |
| Pane 포커스 이동 (상) | `⌥⌘↑` | `Ctrl+Alt+↑` | cmux 호환 |
| Pane 포커스 이동 (하) | `⌥⌘↓` | `Ctrl+Alt+↓` | cmux 호환 |
| Pane 닫기 | 마지막 탭 닫기로 대체 | 동일 | Pane 내 탭이 모두 닫히면 Pane 자동 제거 |

### Surface (탭) 조작

| 동작 | macOS | Windows/Linux | 비고 |
|---|---|---|---|
| 새 탭 생성 | `⌘T` | `Ctrl+T` | cmux 호환 |
| 탭 닫기 | `⌘W` | `Ctrl+W` | cmux 호환, 포커스된 Pane의 활성 탭 닫기 |
| 이전 탭 | `⌘⇧[` | `Ctrl+Shift+[` | cmux 호환 |
| 다음 탭 | `⌘⇧]` | `Ctrl+Shift+]` | cmux 호환 |
| 탭 1~8로 이동 | `⌃1` ~ `⌃8` | `Alt+1` ~ `Alt+8` | cmux 호환 |
| 마지막 탭으로 이동 | `⌃9` | `Alt+9` | cmux 호환 |

### Workspace 조작

| 동작 | macOS | Windows/Linux | 비고 |
|---|---|---|---|
| Workspace 1~8로 이동 | `⌘1` ~ `⌘8` | `Ctrl+1` ~ `Ctrl+8` | cmux 호환 |
| 마지막 Workspace로 이동 | `⌘9` | `Ctrl+9` | cmux 호환 |

### 터미널

| 동작 | macOS | Windows/Linux | 비고 |
|---|---|---|---|
| 스크롤백 지우기 | `⌘K` | `Ctrl+K` | cmux 호환 |

---

## 요구사항

### REQ-1: react-hotkeys-hook 기반 단축키 시스템

`react-hotkeys-hook` 라이브러리를 사용하여 단축키 시스템을 구축한다.

- `useHotkeys` 훅으로 각 단축키를 선언적으로 등록
- 단축키 매핑 정의를 별도 설정 파일로 분리 (키 조합 상수)
- 각 단축키는 **액션 함수**를 호출하는 방식 (컴포넌트 직접 참조 없음)
- `preventDefault: true` 옵션으로 브라우저 기본 동작 차단 (`⌘T`, `⌘W`, `⌘1~9` 등)
- `enableOnFormTags: true` 옵션으로 터미널 포커스 상태에서도 동작 보장

### REQ-2: xterm.js 터미널과의 키 입력 충돌 해결

터미널이 포커스된 상태에서도 앱 단축키가 정상 동작해야 한다.

- xterm.js는 포커스 시 대부분의 키 이벤트를 가로챔
- xterm.js의 `attachCustomKeyEventHandler`를 사용하여 앱 단축키에 해당하는 키 조합을 터미널로 전달하지 않고 브라우저로 버블링
- 앱 단축키가 아닌 일반 키 입력은 터미널이 그대로 처리
- `⌘C`(복사), `⌘V`(붙여넣기) 등 브라우저/터미널 공용 단축키는 터미널이 처리하도록 유지

### REQ-3: Pane 분할 단축키

포커스된 Pane을 단축키로 분할한다. 기존 탭 바 분할 버튼과 동일한 함수를 호출한다 (별도 구현하지 않음).

- `⌘D`: 포커스된 Pane을 수직 분할 (오른쪽에 새 Pane) — 기존 splitPane 함수 호출
- `⌘⇧D`: 포커스된 Pane을 수평 분할 (아래에 새 Pane) — 기존 splitPane 함수 호출
- 새 Pane에는 기본 탭 1개가 생성되고 포커스 이동
- 분할 시 기존 Pane의 작업 디렉토리 유지 — 기존 분할 로직 그대로 사용

### REQ-4: Pane 포커스 이동 단축키

방향키로 인접한 Pane으로 포커스를 이동한다. 레이아웃 트리 기반으로 인접 Pane을 판정한다.

- `⌥⌘←/→/↑/↓`: 현재 포커스된 Pane에서 해당 방향의 인접 Pane으로 포커스 이동 (레이아웃 트리 기반 판정)
- 포커스 이동 시 해당 Pane의 활성 탭 터미널에 자동 포커스
- 해당 방향에 Pane이 없으면 무시 (아무 동작 없음)
- 포커스 변경은 layout.json에 즉시 저장 (Phase 6 영속성 활용)

### REQ-5: Surface (탭) 단축키

포커스된 Pane 내에서 탭을 단축키로 조작한다.

- `⌘T`: 포커스된 Pane에 새 탭 생성 + 포커스 이동
- `⌘W`: 포커스된 Pane의 활성 탭 닫기 — 기존 탭 바 X 버튼과 동일한 함수 호출 (코드 중복 없이)
  - 마지막 탭 닫기 → Pane 자동 제거, 인접 Pane으로 포커스 이동
  - Workspace의 최후 Pane/탭 → 기존 X 버튼 동작과 동일하게 처리
- `⌘⇧[`: 포커스된 Pane에서 이전 탭으로 전환
- `⌘⇧]`: 포커스된 Pane에서 다음 탭으로 전환
  - 첫 번째/마지막 탭에서 순환하지 않음 (끝에서 멈춤)
- `⌃1` ~ `⌃8`: 포커스된 Pane의 N번째 탭으로 이동
- `⌃9`: 포커스된 Pane의 마지막 탭으로 이동
  - 존재하지 않는 번호의 탭은 무시

### REQ-6: Workspace 전환 단축키

사이드바의 Workspace를 단축키로 전환한다.

- `⌘1` ~ `⌘8`: N번째 Workspace로 전환 (사이드바 목록 순서 기준)
- `⌘9`: 마지막 Workspace로 전환
- 존재하지 않는 번호의 Workspace는 무시
- 전환 시 해당 Workspace의 Pane 레이아웃 + 포커스 Pane이 복원됨

### REQ-7: 터미널 스크롤백 지우기

- `⌘K`: 포커스된 터미널의 스크롤백 버퍼를 지움
- xterm.js의 `clear()` 메서드 호출

---

## 비기능 요구사항

### NFR-1: 응답성

단축키 입력 후 동작이 즉시 반영되어야 한다. 체감 지연 없음.

### NFR-2: 터미널 입력 투명성

앱 단축키로 등록되지 않은 모든 키 입력은 터미널에 그대로 전달되어야 한다. 터미널 사용 경험에 영향을 주지 않는다.

### NFR-3: 확장성

향후 단축키 추가/변경이 단축키 매핑 설정만 수정하면 되도록 설계한다. 컴포넌트 코드 변경 없이 단축키를 추가할 수 있어야 한다.

### NFR-4: 기존 기능 호환

단축키 추가로 인해 기존 마우스 기반 조작이 영향받지 않아야 한다. 마우스와 단축키 모두 동일하게 동작한다.

---

## 범위 제외 (Phase 7에서 하지 않는 것)

| 항목 | 사유 |
|---|---|
| 단축키 커스터마이징 UI | 추후 설정 페이지에서 구현 |
| Workspace 생성/삭제/이름 변경 단축키 | 사이드바 UI로 충분, 추후 필요 시 추가 |
| Pane 리사이즈 단축키 | 마우스 드래그로 충분, 추후 필요 시 추가 |
| 명령 팔레트 (Command Palette) | 별도 Phase로 분리 |
| 글꼴 크기 조절 단축키 | 브라우저 기본 줌으로 대체 |
| 찾기 단축키 | 터미널 자체 검색 기능 추후 구현 |
| Claude Code Panel 전환 단축키 | Phase 8 범위 |

---

## 기술 구성

### 단축키 시스템 아키텍처

```
react-hotkeys-hook (useHotkeys)
├── document 레벨 keydown 리스너 (라이브러리 내부)
├── 키 매칭 → 등록된 콜백 실행
│   ├── Pane 분할/포커스 이동 → useLayout 훅 호출
│   ├── 탭 생성/삭제/전환 → useLayout 훅 호출
│   └── Workspace 전환 → useWorkspace 훅 호출
└── 매칭 안 됨 → 이벤트 통과 (터미널로 전달)

xterm.js (attachCustomKeyEventHandler)
├── 앱 단축키 키 조합 → return false (브라우저로 버블링 → useHotkeys가 처리)
└── 일반 키 입력 → return true (터미널 처리)
```

### useHotkeys 사용 패턴

```typescript
// 단축키 훅에서 useHotkeys를 사용하는 예시 패턴
useHotkeys('meta+d', () => splitPane('vertical'), {
  preventDefault: true,
  enableOnFormTags: true,
});

useHotkeys('meta+shift+d', () => splitPane('horizontal'), {
  preventDefault: true,
  enableOnFormTags: true,
});

useHotkeys('meta+1', () => switchWorkspace(0), {
  preventDefault: true,
  enableOnFormTags: true,
});
```

### 키 충돌 해결 전략

| 키 조합 (macOS / Win·Linux) | 브라우저 기본 | 앱 동작 | 해결 |
|---|---|---|---|
| `⌘T` / `Ctrl+T` | 새 브라우저 탭 | 새 Surface 탭 | `preventDefault: true` — 앱 우선 |
| `⌘W` / `Ctrl+W` | 브라우저 탭 닫기 | Surface 탭 닫기 | `preventDefault: true` — 앱 우선 |
| `⌘1~9` / `Ctrl+1~9` | 브라우저 탭 전환 | Workspace 전환 | `preventDefault: true` — 앱 우선 |
| `⌘C` / `Ctrl+C` | 복사 | 복사 | 충돌 없음 — useHotkeys에 등록하지 않음 |
| `⌘V` / `Ctrl+V` | 붙여넣기 | 붙여넣기 | 충돌 없음 — useHotkeys에 등록하지 않음 |
| `⌘K` / `Ctrl+K` | — | 스크롤백 지우기 | `preventDefault: true` — 앱 처리 |

### xterm.js 키 이벤트 처리 흐름

```
키 입력
├── xterm.js attachCustomKeyEventHandler
│   ├── 앱 단축키 조합? → return false (터미널에서 무시, 브라우저로 전파)
│   └── 아님 → return true (터미널이 처리)
└── react-hotkeys-hook (document keydown)
    ├── useHotkeys에 등록된 키 조합? → preventDefault + 콜백 실행
    └── 아님 → 무시
```

---

## 검증 시나리오

1. **Pane 수직 분할**: 터미널 포커스 상태에서 `⌘D` → 오른쪽에 새 Pane 생성, 포커스 이동
2. **Pane 수평 분할**: 터미널 포커스 상태에서 `⌘⇧D` → 아래에 새 Pane 생성, 포커스 이동
3. **Pane 포커스 이동**: 2개 이상 Pane 상태에서 `⌥⌘→` → 오른쪽 Pane으로 포커스 이동, 터미널 자동 포커스
4. **방향에 Pane 없음**: 단일 Pane 상태에서 `⌥⌘→` → 아무 동작 없음
5. **새 탭 생성**: `⌘T` → 포커스된 Pane에 새 탭 생성 + 활성화
6. **탭 닫기**: `⌘W` → 활성 탭 닫기, 인접 탭으로 전환
7. **마지막 탭 닫기**: Pane에 탭 1개인 상태에서 `⌘W` → Pane 제거, 인접 Pane으로 포커스 이동
8. **최후의 Pane 탭 닫기**: Workspace에 Pane 1개 + 탭 1개인 상태에서 `⌘W` → 기본 탭 재생성
9. **이전/다음 탭**: 탭 3개 상태에서 `⌘⇧[`, `⌘⇧]` → 탭 순차 이동
10. **탭 번호 이동**: `⌃2` → 2번째 탭으로 전환
11. **Workspace 전환**: Workspace 3개 상태에서 `⌘2` → 2번째 Workspace로 전환, 레이아웃 복원
12. **존재하지 않는 Workspace**: Workspace 2개인데 `⌘5` → 아무 동작 없음
13. **터미널 입력 투명성**: `ls -la` 입력 → 터미널에 정상 전달, 앱 단축키 간섭 없음
14. **⌘C/⌘V 정상 동작**: 터미널에서 텍스트 선택 후 `⌘C` → 클립보드 복사 정상 동작
15. **스크롤백 지우기**: 출력이 많은 상태에서 `⌘K` → 스크롤백 버퍼 초기화
16. **영속성 연동**: 단축키로 Pane 분할/탭 생성 후 브라우저 새로고침 → 변경 상태 복원
17. **마우스 조작 호환**: 단축키 시스템 추가 후에도 기존 마우스 기반 분할/탭 전환/드래그 모두 정상 동작

---

## 확정된 결정사항

| 항목 | 결정 | 근거 |
|---|---|---|
| 단축키 체계 | cmux 호환 (prefix key 없음, ⌘/Ctrl 기반) | 설계 문서 명시, 네이티브 UX |
| 크로스플랫폼 | macOS `⌘` → Windows/Linux `Ctrl`, macOS `⌃` → Windows/Linux `Alt` | OS별 표준 modifier 키 매핑 |
| 키 충돌 해결 | 앱 단축키 우선 (⌘T, ⌘W 등 브라우저 기본 동작 차단) | 터미널 앱으로서 자체 단축키가 우선 |
| xterm.js 연동 | `attachCustomKeyEventHandler`로 앱 단축키 분리 | xterm.js 공식 API 활용 |
| 탭 순환 | 순환하지 않음 (끝에서 멈춤) | cmux 동작 방식 |
| Workspace 전환 | ⌘1~9 / Ctrl+1~9 (사이드바 순서 기준) | cmux 호환 |
| Surface 탭 전환 | ⌃1~9 / Alt+1~9 (Pane 내 탭 순서 기준) | cmux 호환 — Workspace와 키 분리 |
| 단축키 라이브러리 | react-hotkeys-hook (v5) | React Hook API, Scopes 지원, 주간 200만 다운로드, 활발한 관리 |
| 단축키 관리 | useHotkeys 훅 + 키 매핑 상수 분리 | 유지보수성, 확장성 |
| Pane 포커스 판정 | 레이아웃 트리 기반 | 물리적 좌표 대비 구현 단순, 트리 구조와 일관 |
| 분할/닫기 구현 | 기존 함수 재사용 (별도 구현 없음) | 코드 중복 방지 |
| 단축키 충돌 알림 | 무시 (별도 알림 없음) | 현 단계에서 불필요 |
