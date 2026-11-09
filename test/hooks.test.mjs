// The Claude Code adapter hooks, run as Claude Code runs them (JSON on stdin),
// in a throwaway repository synced from this checkout.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = resolve(fileURLToPath(import.meta.url), '..', '..');

function sh(dir, ...args) {
  const result = spawnSync(args[0], args.slice(1), { cwd: dir, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

/** A repository with the qa skill, the hooks, two crates and the given gates. */
function repo(gates) {
  const dir = mkdtempSync(join(tmpdir(), 'skills-hooks-'));
  sh(dir, 'git', 'init', '-q');
  sh(dir, 'git', 'config', 'user.email', 'test@example.invalid');
  sh(dir, 'git', 'config', 'user.name', 'test');
  mkdirSync(join(dir, '.agents'));
  writeFileSync(join(dir, '.agents/skills.json'), JSON.stringify({ skills: ['qa'], claudeHooks: true }));
  writeFileSync(join(dir, '.agents/gates.json'), JSON.stringify(gates));
  for (const name of ['alpha', 'beta']) {
    mkdirSync(join(dir, 'crates', name, 'src'), { recursive: true });
    writeFileSync(join(dir, 'crates', name, 'Cargo.toml'), `[package]\nname = "${name}"\nversion = "0.1.0"\nauthors = ["x"]\n`);
    writeFileSync(join(dir, 'crates', name, 'src/lib.rs'), '');
  }
  writeFileSync(join(dir, 'Cargo.toml'), '[workspace]\nmembers = ["crates/*"]\n');
  sh(dir, process.execPath, join(source, 'sync.mjs'), '--from', source);
  sh(dir, 'git', 'add', '-A');
  sh(dir, 'git', 'commit', '-qm', 'init');
  return dir;
}

function hook(dir, name, input) {
  const result = spawnSync(process.execPath, [join(dir, '.claude/hooks', name)], {
    cwd: dir,
    input: JSON.stringify({ cwd: dir, session_id: `t-${Math.random()}`, ...input }),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
  });
  return result.stdout ? JSON.parse(result.stdout) : null;
}

// A gate command that prints its arguments and fails when one of them is `beta`
const ECHO_FAIL_ON_BETA = `node -e "const a=process.argv.slice(1).join(' ');console.log('ARGS', a);process.exit(a.includes('beta')?1:0)" --`;

test('the Stop hook runs the stop list with {cargo-packages} for the changed crates only', () => {
  const dir = repo({
    stop: [{ id: 'clippy', name: 'clippy', command: `${ECHO_FAIL_ON_BETA} {cargo-packages}`, paths: ['crates/'] }],
    fast: [{ id: 'slow', name: 'slow', command: 'node -e "process.exit(1)"' }],
  });
  const sessionStart = hook(dir, 'session-start.mjs', { session_id: 's1' });
  assert.equal(sessionStart, null);

  writeFileSync(join(dir, 'crates/alpha/src/lib.rs'), 'pub fn a() {}\n');
  assert.equal(hook(dir, 'stop-gate.mjs', { session_id: 's1' }), null, 'alpha only: green, and the red fast list is not run');

  writeFileSync(join(dir, 'crates/beta/src/lib.rs'), 'pub fn b() {}\n');
  const blocked = hook(dir, 'stop-gate.mjs', { session_id: 's1' });
  assert.equal(blocked.decision, 'block');
  assert.match(blocked.reason, /ARGS -p alpha -p beta/);
});

test('the commit gate checks the fast gates of the staged files and denies a red commit', () => {
  const dir = repo({
    fast: [
      { id: 'clippy', name: 'clippy', command: `${ECHO_FAIL_ON_BETA} {cargo-packages}`, paths: ['crates/'] },
      { id: 'ui', name: 'ui check', command: 'node -e "process.exit(1)"', paths: ['ui/'] },
    ],
  });
  writeFileSync(join(dir, 'crates/alpha/src/lib.rs'), 'pub fn a() {}\n');
  writeFileSync(join(dir, 'crates/beta/src/lib.rs'), 'pub fn b() {}\n');
  sh(dir, 'git', 'add', 'crates/alpha');

  assert.equal(hook(dir, 'commit-gate.mjs', { tool_name: 'Bash', tool_input: { command: 'git status' } }), null);
  assert.equal(hook(dir, 'commit-gate.mjs', { tool_name: 'Bash', tool_input: { command: 'git commit -m "alpha"' } }), null, 'only alpha staged');

  const denied = hook(dir, 'commit-gate.mjs', { tool_name: 'Bash', tool_input: { command: 'git commit -am "both"' } });
  assert.equal(denied.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(denied.hookSpecificOutput.permissionDecisionReason, /clippy/);
  assert.doesNotMatch(denied.hookSpecificOutput.permissionDecisionReason, /ui check/);
});

test('the commit gate skips a tree on which gates.mjs fast was just green', () => {
  const dir = repo({ fast: [{ id: 'once', name: 'once', command: 'node -e "require(\'fs\').appendFileSync(\'runs.log\', \'x\')"', paths: ['crates/'] }] });
  writeFileSync(join(dir, '.gitignore'), 'runs.log\n');
  writeFileSync(join(dir, 'crates/alpha/src/lib.rs'), 'pub fn a() {}\n');
  sh(dir, 'git', 'add', '-A');
  sh(dir, process.execPath, join(dir, '.agents/skills/qa/scripts/gates.mjs'), 'fast');
  assert.equal(hook(dir, 'commit-gate.mjs', { tool_name: 'Bash', tool_input: { command: 'git commit -m a' } }), null);
  assert.equal(sh(dir, 'cat', 'runs.log'), 'x', 'the gate ran once, in gates.mjs, not again in the commit gate');
});
