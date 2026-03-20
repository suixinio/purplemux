# v4 요구사항 정리

## 출처

- `.specs/v4/requirements/overview.md` — 프로젝트 개요, 완료 사항, 기술 스택, 로드맵
- `.specs/v4/requirements/phase4-pane.md` — Phase 4 Pane(분할) 상세 요구사항

## 프로젝트 비전

웹 기반 영속적 작업 환경. 로컬 PC에 서버를 띄우고, 브라우저에서 터미널 + Claude Code를 통합 관리하는 도구.

**핵심 가치**: 한번 열어둔 작업이 서버 재시작 후에도 그 자리에 그대로 있는 것.

## 완료 사항

| 항목 | 상태 |
|---|---|
| Phase 1: 웹 터미널 (xterm.js + node-pty + WebSocket) | ✅ 완료 |
| Custom Server 전환 (API Route → server.ts) | ✅ 완료 |
| Phase 2: tmux 백엔드 (세션 영속성, detaching 플래그, close code 정책) | ✅ 완료 |
| Phase 3: Surface (탭 바 UI, 탭 생성/전환/삭제/순서 변경/이름 변경, 탭 영속성) | ✅ 완료 |

## v4 목표

**Phase 4 — Pane(분할)**: 단일 Pane 탭 인터페이스를 확장하여 화면을 수평/수직으로 분할하고, 각 Pane이 독립적인 Surface(탭) 그룹과 xterm.js 인스턴스를 가지도록 한다. 사용자는 여러 터미널을 동시에 보며 작업할 수 있다.

**완료 조건**: 화면을 분할하여 여러 터미널을 동시에 보며 작업할 수 있다. 각 Pane은 독립적인 탭 그룹을 가지며, Pane 간 포커스 이동이 가능하고, 레이아웃이 서버 재시작/새로고침 후에도 복원된다.

## 아키텍처 변경

```
Phase 3 (현재):
┌─ Tab 1 ──┬─ Tab 2 ──┬─ Tab 3 ──┬─ + ─┐
│                                        │
│          활성 탭의 터미널                 │
│          (단일 Pane, 단일 xterm.js)     │
│                                        │
└────────────────────────────────────────┘

Phase 4 (목표):
┌─ Tab A1 ─┬─ Tab A2 ─┬─ + ─┐│┌─ Tab B1 ─┬─ + ─┐
│                             ││                   │
│     Pane A (활성 탭 터미널)   ││  Pane B (터미널)   │
│     (포커스)                 ││                   │
│                             ││                   │
├─────────────────────────────┤│                   │
│┌─ Tab C1 ─┬─ Tab C2 ─┬─ + ┐││                   │
│                             ││                   │
│     Pane C (터미널)          ││                   │
│                             ││                   │
└─────────────────────────────┘└───────────────────┘
```

## 페이지 목록 (도출)

| 페이지 | 설명 | 우선순위 | 변경 사항 |
|---|---|---|---|
| `/` (메인) | Pane 분할 레이아웃 + 각 Pane별 탭 바 + 터미널 | P0 | 단일 Pane → 트리 기반 분할 레이아웃, Pane별 독립 xterm.js/WebSocket |
| `/api/terminal` | WebSocket 엔드포인트 | P0 | 변경 없음 (Pane당 독립 WebSocket 연결, 기존 프로토콜 유지) |
| `/api/layout` (신규) | 레이아웃 조회/관리 REST API | P0 | 신규 — Pane 트리 구조 + 탭 목록 통합 관리 |
| `/api/tabs` (기존) | 탭 관리 REST API | P1 | `/api/layout`으로 통합 또는 Pane별 탭 관리로 확장 |

## 주요 요구사항

### 메인 페이지 (`/`)

#### Pane 레이아웃 트리

- 전체 레이아웃을 **이진 트리**로 관리한다
  - **리프 노드**: 개별 Pane (탭 바 + 터미널 영역)
  - **내부 노드**: 분할 컨테이너 (방향 `horizontal`/`vertical` + 분할 비율)
- 초기 상태는 단일 리프 노드 (Phase 3과 동일한 UX)
- 트리를 재귀적으로 렌더링하여 중첩 분할을 지원한다

#### Pane 분할

- 포커스된 Pane에서 **수직 분할**(좌/우) 또는 **수평 분할**(상/하)을 실행한다
- 분할 시 현재 리프 노드가 내부 노드로 변환: 기존 Pane → 첫 번째 자식, 새 Pane → 두 번째 자식
- 새 Pane은 기본 탭 1개("Terminal 1")와 새 tmux 세션으로 시작한다
- 새 Pane의 터미널은 **원래 Pane의 현재 작업 디렉토리(CWD)를 유지**한다
  - CWD 조회: `tmux -L purple display-message -p -t {session} '#{pane_current_path}'`
- 초기 분할 비율: 50:50
- 분할 트리거: 탭 바 영역의 분할 버튼 (수평/수직 아이콘) 또는 단축키
- 새 Pane 생성 시 자동으로 포커스 이동

#### Pane별 독립 터미널

- **Pane당 1개의 xterm.js 인스턴스**를 생성한다 (Phase 3의 단일 인스턴스 재활용 방식에서 전환)
- 각 Pane은 활성 탭의 WebSocket 연결을 독립적으로 관리한다
- 각 xterm.js는 Pane 컨테이너 크기에 맞게 cols/rows를 계산한다 (FitAddon)
- Pane 생성 시 xterm.js 인스턴스 + WebSocket 연결 생성, Pane 닫기 시 정리

#### Pane별 독립 탭 그룹

- 각 Pane은 자체 **탭 바, 탭 목록, 활성 탭**을 가진다
- 탭 생성/전환/삭제/순서 변경/이름 변경은 Phase 3과 동일한 동작을 **Pane 단위**로 수행한다
- Pane 내 탭 전환: 해당 Pane의 WebSocket만 끊고 재연결 (다른 Pane에 영향 없음)
- Pane의 마지막 탭에서 `exit` 실행 시:
  - Pane이 1개뿐이면: 새 탭 자동 생성 (Phase 3 동작 유지)
  - 복수 Pane이면: 해당 Pane 닫기

#### Pane 리사이즈

- 인접 Pane 사이의 **분할선(divider)을 드래그**하여 크기를 변경한다
- 최소 비율 제한: 10% (너무 작은 Pane 방지)
- 리사이즈 시 영향 받는 Pane의 xterm.js + tmux 세션 크기 동기화 (resize 메시지 전송)
- 드래그 중 실시간 레이아웃 갱신
- 리사이즈 완료 시 비율을 `layout.json`에 저장 (디바운스)

#### Pane 닫기

- Pane 닫기 버튼 클릭 시:
  - 해당 Pane의 **모든 tmux 세션**을 `kill-session`으로 종료
  - 해당 Pane의 xterm.js 인스턴스 + WebSocket 연결 정리
  - 형제 Pane이 부모 노드의 영역 전체를 차지 (트리 재구성)
  - 닫힌 Pane이 포커스 Pane이었으면 형제 Pane으로 포커스 이동
- **마지막 Pane은 닫을 수 없다** (빈 화면 방지)

#### Pane 포커스 관리

- Pane 영역 클릭 시 해당 Pane에 포커스 설정
- 포커스된 Pane만 키 입력을 수신
- 포커스된 Pane은 **시각적으로 구분** (보더 하이라이트 — Muted 팔레트 `ui-blue` 또는 `ui-purple` 계열)
- 단축키로 포커스를 인접 Pane으로 이동 (상/하/좌/우)
- 비포커스 Pane의 터미널은 출력만 표시 (키 입력 불가)

### 서버 — WebSocket (`/api/terminal`)

#### 변경 없음

- 기존 WebSocket 프로토콜(STDIN/STDOUT/RESIZE/HEARTBEAT/KILL_SESSION) 그대로 유지
- Pane당 독립 WebSocket 연결: 각 Pane이 자체 `clientId`로 `/api/terminal?clientId={id}&session={sessionName}` 연결
- 서버 입장에서는 단순히 동시 WebSocket 연결 수가 증가하는 것
- **MAX_CONNECTIONS 상향 필요**: 현재 10개 → Pane 수 × 활성 탭 기준으로 조정 (예: 20~30개)

### 서버 — 레이아웃 API (`/api/layout`, 신규)

#### 레이아웃 조회

- 클라이언트 페이지 로드 시 전체 레이아웃 트리를 조회한다
- 서버는 `~/.purple-terminal/layout.json` + tmux 세션 크로스 체크하여 반환
  - layout.json에 있지만 tmux 세션이 없는 탭 → 해당 탭 제거
  - tmux 세션이 있지만 layout.json에 없는 세션 → 첫 번째 Pane에 탭으로 추가 (orphan 복구)
  - 모든 Pane의 탭이 비어있으면 → 기본 탭 1개 자동 생성
- 응답: 레이아웃 트리 전체 (분할 구조 + 각 Pane의 탭 목록 + 활성 탭 + 포커스 Pane)

#### 레이아웃 저장

- Pane 분할/닫기/리사이즈, 탭 생성/삭제/이름 변경/순서 변경 시 `layout.json`에 자동 저장
- **디바운스 적용** (300ms)으로 빈번한 디스크 I/O 방지

#### layout.json 데이터 구조 (예시)

```json
{
  "root": {
    "type": "split",
    "direction": "vertical",
    "ratio": 0.6,
    "children": [
      {
        "type": "split",
        "direction": "horizontal",
        "ratio": 0.5,
        "children": [
          {
            "type": "pane",
            "id": "pane-abc123",
            "tabs": [
              { "id": "tab-x1", "sessionName": "pt-a1-b2-c3", "name": "Terminal 1", "order": 0 },
              { "id": "tab-x2", "sessionName": "pt-d4-e5-f6", "name": "Terminal 2", "order": 1 }
            ],
            "activeTabId": "tab-x1"
          },
          {
            "type": "pane",
            "id": "pane-def456",
            "tabs": [
              { "id": "tab-y1", "sessionName": "pt-g7-h8-i9", "name": "Terminal 1", "order": 0 }
            ],
            "activeTabId": "tab-y1"
          }
        ]
      },
      {
        "type": "pane",
        "id": "pane-ghi789",
        "tabs": [
          { "id": "tab-z1", "sessionName": "pt-j1-k2-l3", "name": "build", "order": 0 }
        ],
        "activeTabId": "tab-z1"
      }
    ]
  },
  "focusedPaneId": "pane-abc123",
  "updatedAt": "2026-03-20T10:00:00.000Z"
}
```

#### tabs.json → layout.json 마이그레이션

- `layout.json`이 없고 `tabs.json`이 존재하는 경우: `tabs.json`의 탭 배열을 단일 Pane 레이아웃으로 자동 변환
- 마이그레이션 후 `tabs.json`은 그대로 보존 (롤백 가능)
- `layout.json`이 존재하면 `tabs.json`은 무시

### 레이아웃 영속성

- **서버 재시작**: `layout.json` + tmux 세션 크로스 체크 → Pane 트리 + 탭 목록 복원 → 클라이언트 재연결 시 전체 레이아웃 렌더링
- **새로고침**: 페이지 로드 시 `/api/layout`으로 전체 레이아웃 조회 → 트리 렌더링 → 각 Pane이 활성 탭의 세션에 WebSocket 연결
- **Pane 닫기**: 트리 재구성 → layout.json 갱신
- **Pane 내 exit**: 탭 제거 → Pane 탭이 비면 Pane 닫기 (복수 Pane 시) 또는 새 탭 생성 (단일 Pane 시)

## 비기능 요구사항

| 항목 | 요구사항 |
|---|---|
| 분할/리사이즈 성능 | Pane 분할과 리사이즈가 즉각적으로 느껴져야 함. 리사이즈 중 터미널 렌더링이 끊기지 않아야 함. 리사이즈 시 xterm.js `fit()` + tmux `resize-window`를 디바운스/스로틀하여 과도한 호출 방지 |
| 다중 Pane 메모리 | Pane당 xterm.js 인스턴스(WebGL 렌더러 포함) + WebSocket 연결을 유지하므로 메모리 증가. 4~6개 Pane에서 문제 없어야 함 |
| 독립 세션 유지 | 각 Pane의 모든 tmux 세션(활성/비활성 탭)이 백그라운드에서 독립 실행. Pane 간 세션 간섭 없음 |
| Phase 3 호환 | 단일 Pane 상태에서 Phase 3과 동일한 UX. 탭 관리 동작 변경 없음 |
| 레이아웃 정합성 | 서버 재시작/새로고침 후 Pane 분할 구조, 비율, 각 Pane의 탭 목록, 활성 탭, 포커스 상태가 정확하게 복원 |
| 포커스 표시 | 포커스된 Pane이 시각적으로 명확하게 구분. Muted 팔레트 보더 하이라이트 적용 |
| 프로토콜 호환 | 기존 바이너리 프로토콜(0x00~0x04) 변경 없음 |
| Phase 2 정책 유지 | detaching 플래그, close code 정책 (1000/1001/1011/1013) 그대로 유지 |

## 기술 구성

```
Browser                                    Server (Custom)                  tmux (-L purple)
┌────────────────────────────────────┐     ┌─────────────────┐              ┌──────────────┐
│ ┌─Tab A1─┬─Tab A2─┬─+─┐│┌─Tab B1─┐│     │  server.ts      │              │ pt-...-A1    │
│ │ Pane A (xterm)   ││ Pane B  │ │ WS×N │  (다중 세션 관리) │   attach     │ pt-...-A2    │
│ │                  ││(xterm)  │ │◄────►│                 │ ◄──────────► │ pt-...-B1    │
│ ├──────────────────┤│         │ │     │  /api/layout    │              │ pt-...-C1    │
│ │┌─Tab C1─┬─+─┐   ││         │ │     │  (레이아웃 관리)  │              │ pt-...-C2    │
│ │ Pane C (xterm)   ││         │ │ HTTP │                 │              └──────────────┘
│ │                  ││         │ │◄────►│                 │   layout.json
│ └──────────────────┘└─────────┘ │     └─────────────────┘   ~/.purple-terminal/
└────────────────────────────────────┘
```

| 항목 | Phase 3 | Phase 4 |
|---|---|---|
| Pane 수 | 1개 (고정) | N개 (트리 기반 분할) |
| xterm.js | 단일 인스턴스 재활용 | Pane당 1개 인스턴스 |
| WebSocket | 단일 연결 (탭 전환 시 재연결) | Pane당 1개 연결 (각 Pane의 활성 탭) |
| 탭 그룹 | 전역 1개 (`useTabs` 훅) | Pane별 독립 |
| 탭 상태 | `~/.purple-terminal/tabs.json` (플랫 배열) | `~/.purple-terminal/layout.json` (트리 구조) |
| 리사이즈 | 브라우저 리사이즈만 | 브라우저 리사이즈 + Pane 분할선 드래그 |
| 포커스 | 항상 단일 터미널 | Pane별 포커스 관리 |
| 서버 MAX_CONNECTIONS | 10 | 상향 (20~30) |

### 주요 코드 변경 영역 (예상)

| 파일/모듈 | 변경 내용 |
|---|---|
| `terminal-page.tsx` | 단일 Pane → 트리 기반 레이아웃 렌더러로 전면 재구성 |
| `tab-bar.tsx` | Pane별 독립 탭 바 (paneId prop 추가) |
| `use-tabs.ts` | 전역 탭 관리 → Pane별 탭 관리로 변경 |
| `use-terminal.ts` | Pane별 독립 인스턴스 생성 (변경 최소화 예상) |
| `use-terminal-websocket.ts` | Pane별 독립 연결 (변경 최소화 예상) |
| `tab-store.ts` (서버) | `tabs.json` → `layout.json` 트리 구조 저장으로 전환 |
| `server.ts` | MAX_CONNECTIONS 상향, `/api/layout` 라우팅 추가 |
| `terminal-server.ts` | MAX_CONNECTIONS 상향 |
| 신규: `pane-layout.tsx` | Pane 트리 렌더러, 분할 컨테이너, 분할선(divider) 컴포넌트 |
| 신규: `layout-store.ts` (서버) | `layout.json` 관리, 마이그레이션 로직 |
| 신규: `/api/layout/*.ts` | 레이아웃 CRUD API 엔드포인트 |

## 검증 시나리오

1. **수직 분할**: 분할 버튼 클릭 시 화면이 좌/우로 나뉘고 각각 독립 터미널이 동작한다
2. **수평 분할**: 분할 버튼 클릭 시 화면이 상/하로 나뉘고 각각 독립 터미널이 동작한다
3. **중첩 분할**: Pane A를 수직 분할 → Pane B를 수평 분할 → 3개 Pane이 정상 동작한다
4. **Pane별 탭 관리**: 각 Pane에서 독립적으로 탭 생성/전환/삭제가 가능하다
5. **Pane 리사이즈**: 분할선 드래그 시 Pane 크기가 변경되고 터미널이 올바르게 리사이즈된다
6. **Pane 닫기**: Pane 닫기 시 모든 세션이 종료되고 나머지 Pane이 영역을 채운다
7. **마지막 Pane 보호**: 마지막 남은 Pane은 닫을 수 없다
8. **포커스 이동 (클릭)**: Pane 클릭 시 포커스가 이동하고 키 입력은 포커스된 Pane에만 전달된다
9. **포커스 이동 (단축키)**: 단축키로 상/하/좌/우 인접 Pane으로 포커스가 이동한다
10. **작업 디렉토리 유지**: `~/projects/my-app`에서 분할 시 새 Pane의 터미널이 같은 디렉토리에서 시작된다
11. **서버 재시작 복원**: 서버 재시작 후 Pane 분할 구조, 비율, 각 Pane의 탭, 포커스 상태가 모두 복원된다
12. **새로고침 복원**: 브라우저 새로고침 후 레이아웃이 그대로 복원된다
13. **다중 Pane 동시 실행**: 여러 Pane에서 각각 빌드/테스트 등 프로세스 실행 중 모두 독립적으로 동작한다
14. **단일 Pane 호환**: Pane이 1개인 상태에서 Phase 3과 동일한 UX가 제공된다
15. **tabs.json 마이그레이션**: Phase 3에서 업그레이드 시 기존 탭이 단일 Pane 레이아웃으로 정상 복원된다
16. **Pane 내 exit (복수 Pane)**: 복수 Pane에서 마지막 탭에 exit 실행 시 해당 Pane이 닫힌다
17. **Pane 내 exit (단일 Pane)**: 단일 Pane에서 마지막 탭에 exit 실행 시 새 탭이 자동 생성된다
18. **포커스 시각 표시**: 포커스된 Pane의 보더 하이라이트가 Muted 팔레트에 맞게 표시된다
19. **브라우저 리사이즈**: 브라우저 창 크기 변경 시 모든 Pane의 터미널이 올바르게 리사이즈된다

## 범위 제외 (Phase 4에서 하지 않는 것)

| 항목 | 담당 Phase |
|---|---|
| 프로젝트(Workspace) 관리 | Phase 5 |
| Workspace별 레이아웃 분리 | Phase 6 |
| 전체 단축키 체계 (cmux 호환) | Phase 7 |
| Claude Code 연동 | Phase 8 |
| Pane 간 탭 이동 (드래그 앤 드롭) | 추후 |
| Pane 최대화/최소화 토글 | 추후 |
| 인증/보안 | 추후 |

## 제약 조건 / 참고 사항

- **Pane당 독립 xterm.js**: Phase 3의 단일 인스턴스 재활용 방식은 동시 표시에 사용할 수 없다. Pane당 인스턴스를 생성하되, WebGL 렌더러가 GPU 리소스를 소비하므로 과도한 Pane 수(8개 이상)에서 성능 저하 가능. 필요 시 WebGL → Canvas 렌더러 폴백 로직 검토
- **동시 WebSocket 연결**: Pane당 1개 WebSocket(활성 탭)이므로, 3개 Pane = 3개 동시 WebSocket. 서버의 MAX_CONNECTIONS(현재 10)을 상향해야 함. Pane 수 제한은 별도로 두지 않되, 합리적 범위(4~6개) 내에서 테스트
- **리사이즈 디바운스**: 분할선 드래그 중 xterm.js `fit()` + tmux `resize-window`가 과도하게 호출되면 성능 저하. `requestAnimationFrame` 또는 `throttle`(16ms)로 제어
- **레이아웃 트리 정합성**: 트리 조작(분할, 닫기) 시 무효한 상태(빈 내부 노드, 자식 1개인 내부 노드 등)가 발생하지 않도록 정규화 로직 필요
- **tabs.json 마이그레이션**: `layout.json`이 없고 `tabs.json`이 있으면 자동 변환. 변환 후 `tabs.json`은 보존(롤백용). `layout.json`이 존재하면 `tabs.json`은 무시
- **분할선 디자인**: Muted 팔레트에 맞게 분할선은 얇고 낮은 투명도 (`oklch` 기반, `0.5px` ~ `2px`). 호버 시 약간 밝아지는 피드백. STYLE.md의 "장식 요소 최소화" 원칙 준수
- **포커스 보더**: 포커스된 Pane의 보더는 `ui-purple` 또는 `ui-blue` 계열, 얇은 보더(1~2px). 비포커스 Pane은 보더 없음 또는 매우 연한 보더
- **Phase 2 정책 유지**: detaching 플래그, close code 정책(1000/1001/1011/1013) 그대로 유지. Pane 닫기 시 해당 Pane의 WebSocket 연결은 "의도적 detach"로 처리
- **Phase 3 탭 API 호환**: `/api/tabs`를 즉시 폐기하지 않고, `/api/layout`이 안정화될 때까지 병행 가능. 단, 새 레이아웃 시스템이 주(primary) 데이터 소스

## 확정된 결정사항

| 항목 | 결정 | 근거 |
|---|---|---|
| 레이아웃 구조 | 이진 트리 (리프=Pane, 내부=분할 컨테이너) | 수평/수직 중첩 분할을 자연스럽게 표현, VS Code/tmux와 동일한 모델 |
| xterm.js 전략 | Pane당 독립 인스턴스 | 동시 표시를 위해 필수 |
| WebSocket 전략 | Pane당 독립 연결 (활성 탭) | 각 Pane이 독립적으로 터미널 표시 |
| 상태 저장 | `~/.purple-terminal/layout.json` (트리 구조) | 플랫 배열로는 분할 구조 표현 불가 |
| tabs.json 마이그레이션 | layout.json 없을 시 자동 변환 | Phase 3 → Phase 4 무중단 업그레이드 |
| 분할 초기 비율 | 50:50 | 가장 자연스러운 기본값 |
| 새 Pane CWD | 원래 Pane의 활성 세션 CWD 유지 | 같은 프로젝트 디렉토리에서 작업 연속성 |
| 최소 Pane 비율 | 10% | 너무 작은 Pane 방지, 최소 cols/rows 확보 |
| MAX_CONNECTIONS | 10 → 20~30으로 상향 | 다중 Pane 동시 WebSocket 지원 |

## 미확인 사항

- [ ] Pane 분할 최대 깊이 제한이 필요한가? (예: 트리 깊이 4~5 수준으로 제한하여 너무 작은 Pane 방지)
- [ ] WebGL 렌더러를 다수 Pane에서 동시에 사용할 때 GPU 리소스 한계 확인 필요 — 특정 Pane 수 이상에서 Canvas 렌더러로 자동 전환하는 것이 나은지?
- [ ] 분할선(divider)의 최적 히트 영역(hit area) 크기 확인 필요 — 시각적으로는 1~2px이지만 드래그를 위해 6~8px 정도의 투명 히트 영역이 필요할 수 있음
- [ ] Pane 간 탭 이동(드래그 앤 드롭) 기능을 Phase 4에 포함할지 추후로 미룰지 확정 필요
- [ ] 브라우저 창이 매우 좁아졌을 때(모바일 등) 분할 레이아웃의 최소 너비/높이 정책 확인 필요
- [ ] 키보드 단축키 체계: Phase 4에서 최소한의 Pane 이동 단축키만 구현할지, Phase 7까지 완전히 미룰지 확정 필요
