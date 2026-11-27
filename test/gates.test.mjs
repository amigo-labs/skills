// The gate runner of the qa skill: per-gate time limits (`timeoutMinutes`).

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { gateTimeoutMs, invalidTimeouts, runGates } from '../skills/qa/scripts/lib.mjs';

const source = resolve(fileURLToPath(import.meta.url), '..', '..');
// A command that runs about two seconds
const SLOW = `"${process.execPath}" -e "setTimeout(() => {}, 2000)"`;

test('gateTimeoutMs takes the gate’s minutes, else the fallback', () => {
  assert.equal(gateTimeoutMs({ id: 'a', timeoutMinutes: 45 }, 1000), 45 * 60000);
  assert.equal(gateTimeoutMs({ id: 'a', timeoutMinutes: 0.5 }, 1000), 30000);
  assert.equal(gateTimeoutMs({ id: 'a' }, 1000), 1000);
});

test('invalidTimeouts names the gates whose timeoutMinutes is no number above 0', () => {
  const gates = [
    { id: 'ok', name: 'fine', timeoutMinutes: 45 },
    { id: 'none', name: 'unset' },
    { id: 'zero', name: 'zero', timeoutMinutes: 0 },
    { id: 'neg', name: 'negative', timeoutMinutes: -1 },
    { id: 'text', name: 'text', timeoutMinutes: '45' },
    { id: 'nan', name: 'nan', timeoutMinutes: Number.NaN },
    { id: 'inf', timeoutMinutes: Number.POSITIVE_INFINITY },
  ];
  assert.deepEqual(invalidTimeouts(gates), ['zero', 'negative', 'text', 'nan', 'inf']);
});

test('runGates applies a gate’s timeoutMinutes only with perGateTimeouts', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'skills-gates-'));
  const short = { id: 'short', name: 'short', command: SLOW, timeoutMinutes: 0.005 };
  const free = { id: 'free', name: 'free', command: SLOW };
  const withLimits = await runGates(dir, [short, free], { timeoutMs: 60000, perGateTimeouts: true });
  assert.deepEqual(
    withLimits.map(result => result.status),
    ['timeout', 'ok'],
  );
  const without = await runGates(dir, [short], { timeoutMs: 60000 });
  assert.equal(without[0].status, 'ok');
  // The caller's limit still holds for a gate without its own.
  const tight = await runGates(dir, [free], { timeoutMs: 300, perGateTimeouts: true });
  assert.equal(tight[0].status, 'timeout');
});

/** A repository with the qa skill synced from this checkout and the given gates. */
function repo(gates) {
  const dir = mkdtempSync(join(tmpdir(), 'skills-gates-repo-'));
  mkdirSync(join(dir, '.agents'));
  writeFileSync(join(dir, '.agents/skills.json'), JSON.stringify({ skills: ['qa'] }));
  writeFileSync(join(dir, '.agents/gates.json'), JSON.stringify(gates));
  const sync = spawnSync(process.execPath, [join(source, 'sync.mjs'), '--from', source], { cwd: dir, encoding: 'utf8' });
  assert.equal(sync.status, 0, sync.stderr);
  return dir;
}

function gates(dir, list) {
  return spawnSync(process.execPath, [join(dir, '.agents/skills/qa/scripts/gates.mjs'), list], { cwd: dir, encoding: 'utf8' });
}

test('gates.mjs refuses a list with an invalid timeoutMinutes and runs nothing', () => {
  const marker = 'ran-marker';
  const dir = repo({
    full: [
      { id: 'probe', name: 'probe', command: `"${process.execPath}" -e "require('fs').writeFileSync('${marker}','x')"` },
      { id: 'bad', name: 'bad limit', command: 'node -v', timeoutMinutes: 0 },
    ],
  });
  const result = gates(dir, 'full');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /timeoutMinutes must be a number above 0 \(gate: bad limit\)/);
  assert.equal(spawnSync('test', ['-e', join(dir, marker)]).status, 1);
});

test('gates.mjs reports a gate’s own limit when it runs out', () => {
  const dir = repo({ full: [{ id: 'slow', name: 'slow', command: SLOW, timeoutMinutes: 0.005 }] });
  const result = gates(dir, 'full');
  assert.equal(result.status, 1);
  assert.match(result.stdout, /\| slow \| .* \| time limit \(0\.005 min\) \|/);
});
