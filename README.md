# Purple Terminal

웹 기반 tmux 터미널 클라이언트입니다.

## 특징

- **웹 기반** - 브라우저만 있으면 어디서든 터미널 사용. Tailscale과 조합하면 외부에서도 HTTPS로 안전하게 접근
- **모바일/태블릿 지원** - 반응형 UI로 모바일 기기에서도 터미널 조작 가능
- **Claude AI 연동** - 여러 Claude CLI 세션을 한눈에 모니터링. 작업 상태 표시(busy/idle/attention)로 확인이 필요한 세션을 바로 파악하고, 타임라인으로 진행 상황을 확인, 원클릭 세션 resume
- **멀티 디바이스 동기화** - 여러 기기에서 동시 접속, 워크스페이스 변경사항 실시간 반영
- **워크스페이스 영구 저장** - 분할 레이아웃, 탭, 실행 명령어를 저장하여 서버가 재시작되어도 이전 작업 환경을 그대로 복원

## 필수 요구사항

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/)
- [tmux](https://github.com/tmux/tmux) - **필수**

## 선택 요구사항

- [code-server](https://github.com/coder/code-server) - 웹 기반 VS Code 에디터 연동 시 필요

## 설치 및 실행

```bash
git clone https://github.com/subicura/pt.git
cd pt
pnpm install
pnpm start
```

브라우저에서 [http://localhost:8022](http://localhost:8022)으로 접속합니다.

### 개발 모드

```bash
pnpm dev
```

## 외부 접속 (Tailscale Serve)

[Tailscale](https://tailscale.com/)을 사용하면 로컬 서버를 Tailscale 네트워크 내에서 HTTPS로 접근할 수 있습니다.

```bash
tailscale serve --bg 8022
```

`https://<machine-name>.<tailnet>.ts.net`으로 접속합니다.

해제:

```bash
tailscale serve --bg off 8022
```
