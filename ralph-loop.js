#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const { spawn } = require('node:child_process');
const { existsSync, readFileSync, writeFileSync, mkdirSync } = require('node:fs');
const { join } = require('node:path');

const TASK_FILE = (v) => `.specs/${v}/task.md`;
const RESULT_DIR = (v, f) => `.specs/${v}/features/${f}/result`;
const PATCH_DONE = '보완이 완료되었습니다';
const MAX_VERIFY = 3;

(async () => {
  const chalk = (await import('chalk')).default;

  // ── Args ──────────────────────────────────────────────────
  const args = process.argv.slice(2);
  let version = null;
  let maxFeatures = Infinity;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-n' && args[i + 1]) {
      maxFeatures = parseInt(args[++i], 10);
    } else if (!version) {
      version = args[i];
    }
  }

  if (!version) {
    console.log('');
    console.log(chalk.red.bold('  version 인자가 필요합니다'));
    console.log(chalk.dim('  Usage:  node ralph-loop.js <version> [-n count]'));
    console.log(chalk.dim('  Example: node ralph-loop.js v1'));
    console.log(chalk.dim('           node ralph-loop.js v1 -n 3'));
    console.log('');
    process.exit(1);
  }

  // ── State ───────────────────────────────────────────────────
  const startTime = Date.now();
  let loop = 0;
  let built = 0;
  let interrupted = false;
  let activeChild = null;

  // ── Helpers ───────────────────────────────────────────────
  const LINE = chalk.dim('─'.repeat(60));
  const pad2 = (n) => String(n).padStart(2, '0');

  const elapsed = () => {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const ts = () => chalk.dim(new Date().toLocaleTimeString());

  const banner = (title) => {
    console.log('');
    console.log(LINE);
    console.log(chalk.bold(`  ${title}`));
    console.log(LINE);
    console.log('');
  };

  const info = (label, value) => {
    console.log(`  ${chalk.cyan(label)} ${value}`);
  };

  const summary = () => {
    banner('Done');
    info('Features built:', chalk.green.bold(String(built)));
    info('Total loops:   ', chalk.bold(String(loop)));
    info('Elapsed:       ', chalk.bold(elapsed()));
    console.log('');
  };

  const formatElapsed = (ms) => {
    const secs = Math.round(ms / 1000);
    if (secs < 60) return `${secs}초`;
    return `${Math.floor(secs / 60)}분 ${secs % 60}초`;
  };

  // ── Result saver ────────────────────────────────────────
  const saveResult = (feature, step, output, meta = {}) => {
    const dir = RESULT_DIR(version, feature);
    mkdirSync(dir, { recursive: true });

    const now = new Date();
    const timestamp = `${now.toISOString().slice(0, 10)} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
    const header = [
      `---`,
      `step: ${step}`,
      `timestamp: ${timestamp}`,
      ...(meta.elapsed ? [`elapsed: ${meta.elapsed}`] : []),
      ...(meta.status ? [`status: ${meta.status}`] : []),
      ...(meta.round ? [`round: ${meta.round}`] : []),
      `---`,
      ``,
    ].join('\n');

    const filePath = join(dir, `${step}.md`);
    writeFileSync(filePath, header + output, 'utf-8');
    console.log(`  ${ts()} ${chalk.dim(`결과 저장 → ${filePath}`)}`);
  };

  // ── Task parser ───────────────────────────────────────────
  const taskFile = TASK_FILE(version);

  const findNextTask = () => {
    const content = readFileSync(taskFile, 'utf-8');
    const lines = content.split('\n').filter((l) => l.startsWith('|'));
    const rows = lines.slice(2);

    for (const row of rows) {
      const cols = row.split('|').map((c) => c.trim());
      const [, feature, , , buildCol, verifyCol] = cols;

      if (!buildCol || buildCol.includes('⬜')) return { feature, step: 'build' };
      if (!verifyCol || verifyCol.includes('⬜')) return { feature, step: 'verify' };
    }

    return null;
  };

  // ── Claude runner ─────────────────────────────────────────
  const runClaude = (prompt) =>
    new Promise((resolve) => {
      let stdout = '';
      const runStart = Date.now();

      process.stderr.write('\x1b[?25l');
      const timer = setInterval(() => {
        const secs = Math.round((Date.now() - runStart) / 1000);
        process.stderr.write(
          `\r  ${chalk.dim('│')} ${chalk.dim(`⏱ ${pad2(Math.floor(secs / 60))}:${pad2(secs % 60)}`)}`,
        );
      }, 1000);

      const proc = spawn('claude', ['--dangerously-skip-permissions', '-p', prompt], {
        stdio: ['ignore', 'pipe', 'inherit'],
        cwd: process.cwd(),
      });

      activeChild = proc;

      proc.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        stdout += text;
        process.stdout.write(text);
      });

      const cleanup = (code) => {
        clearInterval(timer);
        process.stderr.write('\r\x1b[K\x1b[?25h');
        activeChild = null;
        const runElapsed = formatElapsed(Date.now() - runStart);
        resolve({ code: code ?? 1, stdout, elapsed: runElapsed });
      };

      proc.on('error', () => cleanup(1));
      proc.on('close', cleanup);
    });

  // ── Commit helper ─────────────────────────────────────────
  const doCommit = async (label) => {
    banner(`Loop #${loop}  Commit (${label})`);
    console.log(`  ${ts()} Committing changes...`);
    console.log('');

    const commit = await runClaude('/commit-commands:commit');

    if (interrupted) return commit;

    if (commit.code !== 0) {
      console.log(chalk.red(`\n  ✗ commit 실패 (${commit.elapsed}) — 중단합니다`));
      process.exit(1);
    }

    console.log(chalk.green(`\n  ✓ commit 완료 (${commit.elapsed})`));
    return commit;
  };

  // ── Task update helper ────────────────────────────────────
  const updateTask = async (feature, column, value) => {
    const now = new Date();
    const timestamp = `${now.toISOString().slice(0, 10)} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

    return runClaude(
      [
        `${taskFile} 파일에서 feature가 "${feature}"인 행을 찾아서`,
        `${column} 컬럼을 "${value}"로, updated 컬럼을 "${timestamp}"로 변경해줘.`,
        `해당 행만 수정하고 다른 행은 건드리지 마.`,
      ].join(' '),
    );
  };

  // ── SIGINT ────────────────────────────────────────────────
  process.on('SIGINT', () => {
    process.stderr.write('\x1b[?25h');

    if (activeChild) {
      interrupted = true;
      console.log('');
      console.log(chalk.yellow('  중단 요청 — Claude 종료 대기 중...'));
      activeChild.kill('SIGTERM');
      setTimeout(() => {
        try {
          activeChild?.kill('SIGKILL');
        } catch {}
      }, 10_000);
      return;
    }

    console.log('');
    summary();
    console.log(chalk.yellow('  중단된 작업이 있을 수 있습니다. 변경사항을 정리하려면:'));
    console.log(chalk.dim('    git restore --staged .    # staged 파일 해제'));
    console.log(chalk.dim('    git restore .             # 수정된 파일 되돌리기'));
    console.log(chalk.dim('    git clean -fd             # 새로 생성된 파일 삭제'));
    console.log('');
    process.exit(130);
  });

  // ── Init task.md ───────────────────────────────────────────
  if (!existsSync(taskFile)) {
    banner('Init task.md');
    console.log(`  ${ts()} ${taskFile} 생성 중...`);
    console.log('');

    const init = await runClaude(
      [
        `.specs/${version}/features/ 아래 모든 feature 디렉토리를 확인하고,`,
        `.specs/${version}/PRD.md의 페이지 목록 테이블에서 각 feature의 우선순위(P0~P3)와 Phase(Phase 1~4) 정보를 읽어서`,
        `${taskFile}을 생성해줘.`,
        ``,
        `정렬 규칙:`,
        `1. Phase 오름차순 (Phase 1 → Phase 2 → Phase 3 → Phase 4)`,
        `2. 같은 Phase 안에서는 Priority 오름차순 (P0 → P1 → P2 → P3)`,
        `3. PRD에 없는 feature(예: app-shell, ai-chat-panel 등 공통/인프라 feature)는 Phase 0, P0으로 취급하여 맨 위에 배치`,
        ``,
        `형식:`,
        `| feature | phase | priority | build | verify | updated |`,
        `|---|---|---|---|---|---|`,
        `| feature-name | Phase 0 | P0 | ⬜ | ⬜ | |`,
        ``,
        `모든 feature를 포함해줘.`,
      ].join('\n'),
    );

    if (init.code !== 0) {
      console.log(chalk.red(`\n  ✗ task.md 생성 실패`));
      process.exit(1);
    }

    console.log(chalk.green(`\n  ✓ task.md 생성 완료 (${init.elapsed})`));
  }

  // ── Main loop ─────────────────────────────────────────────
  banner(`Ralph Loop  /4-build + /5-verify ${version}`);
  info('Version:', chalk.bold(version));
  info('Task:   ', chalk.bold(taskFile));
  info('Started:', chalk.bold(new Date().toLocaleString()));
  info('Features:  ', chalk.bold(maxFeatures === Infinity ? 'all' : `${maxFeatures}`));
  info('Max verify:', chalk.bold(`${MAX_VERIFY} rounds per feature`));

  while (!interrupted) {
    loop++;

    // ── Find next task from task.md ─────────────────────────
    const next = findNextTask();

    if (!next) {
      console.log('');
      console.log(`  ${ts()} ${chalk.dim('모든 feature 완료')}`);
      break;
    }

    const { feature, step } = next;

    banner(`Loop #${loop}  ${feature} → ${step}`);
    console.log(`  ${ts()} ${chalk.cyan(feature)} → ${chalk.bold(step)}`);

    // ── Build ───────────────────────────────────────────────
    if (step === 'build') {
      banner(`Loop #${loop}  /4-build ${version} ${feature}`);
      console.log(`  ${ts()} Building ${feature}...`);
      console.log('');

      const build = await runClaude(`/4-build ${version} ${feature}`);

      if (interrupted) break;

      if (build.code !== 0) {
        console.log(chalk.red(`\n  ✗ build 실패 (${build.elapsed})`));
        process.exit(1);
      }

      console.log(chalk.green(`\n  ✓ build 완료 (${build.elapsed})`));
      saveResult(feature, 'build', build.stdout, { elapsed: build.elapsed, status: 'completed' });
      built++;

      await updateTask(feature, 'build', '✅');
      if (interrupted) break;

      await doCommit('build');
      if (interrupted) break;

      continue;
    }

    // ── Verify ──────────────────────────────────────────────
    if (step === 'verify') {
      let verifyRound = 0;
      let verified = false;

      while (verifyRound < MAX_VERIFY && !interrupted) {
        verifyRound++;

        banner(`Loop #${loop}  /5-verify ${version} ${feature} (${verifyRound}/${MAX_VERIFY})`);
        console.log(`  ${ts()} Verifying against spec...`);
        console.log('');

        const verify = await runClaude(`/5-verify ${version} ${feature}`);

        if (interrupted) break;

        if (verify.code !== 0) {
          console.log(chalk.yellow(`\n  ⚠ verify 실패 (${verify.elapsed})`));
          saveResult(feature, `verify-${verifyRound}`, verify.stdout, {
            elapsed: verify.elapsed,
            status: 'failed',
            round: `${verifyRound}/${MAX_VERIFY}`,
          });
          break;
        }

        if (verify.stdout.includes(PATCH_DONE)) {
          console.log('');
          console.log(
            `  ${ts()} ${chalk.yellow(`Patches applied (${verify.elapsed})`)} — committing & re-verifying...`,
          );
          saveResult(feature, `verify-${verifyRound}`, verify.stdout, {
            elapsed: verify.elapsed,
            status: 'patched',
            round: `${verifyRound}/${MAX_VERIFY}`,
          });

          await doCommit(`verify patch #${verifyRound}`);
          if (interrupted) break;

          continue;
        }

        verified = true;
        saveResult(feature, `verify-${verifyRound}`, verify.stdout, {
          elapsed: verify.elapsed,
          status: 'verified',
          round: `${verifyRound}/${MAX_VERIFY}`,
        });
        console.log(chalk.green(`\n  ✓ verify 완료 (${verify.elapsed})`));
        break;
      }

      if (interrupted) break;

      if (verified) {
        console.log(`  ${ts()} ${chalk.green.bold('VERIFIED')} after ${verifyRound} round(s)`);
      } else {
        console.log(`  ${ts()} ${chalk.yellow(`Verify ${MAX_VERIFY}회 완료`)}`);
      }

      await updateTask(feature, 'verify', `✅ ${verifyRound}/${verified}`);
      if (interrupted) break;

      await doCommit('verify');
      if (interrupted) break;
    }

    console.log('');
    console.log(`  ${ts()} ${chalk.green(`Loop #${loop} done`)} ${chalk.dim(`| 총 ${elapsed()}`)}`);

    if (built >= maxFeatures) {
      console.log('');
      console.log(`  ${ts()} ${chalk.cyan(`Reached -n ${maxFeatures} limit.`)}`);
      break;
    }
  }

  // ── Summary ───────────────────────────────────────────────
  summary();

  if (interrupted) {
    console.log(chalk.yellow('  중단된 작업이 있을 수 있습니다. 변경사항을 정리하려면:'));
    console.log(chalk.dim('    git restore --staged .    # staged 파일 해제'));
    console.log(chalk.dim('    git restore .             # 수정된 파일 되돌리기'));
    console.log(chalk.dim('    git clean -fd             # 새로 생성된 파일 삭제'));
    console.log('');
  }
})().catch((err) => {
  console.error(`Fatal: ${err.message}`);
  process.exit(1);
});
