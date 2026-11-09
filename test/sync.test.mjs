// End-to-end tests of sync.mjs against a throwaway consumer repository,
// with this checkout as the source (--from).

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const source = resolve(fileURLToPath(import.meta.url), '..', '..');

function consumer(config, extra = () => {}) {
  const dir = mkdtempSync(join(tmpdir(), 'skills-consumer-'));
  mkdirSync(join(dir, '.agents'), { recursive: true });
  writeFileSync(join(dir, '.agents', 'skills.json'), JSON.stringify(config));
  writeFileSync(join(dir, 'AGENTS.md'), '# AGENTS.md\n\nProject text.\n');
  extra(dir);
  return dir;
}

function sync(dir, ...args) {
  const script = existsSync(join(dir, '.agents', 'sync.mjs')) && !args.includes('--from') ? join(dir, '.agents', 'sync.mjs') : join(source, 'sync.mjs');
  return spawnSync(process.execPath, [script, ...args], { cwd: dir, encoding: 'utf8' });
}

const FULL = { skills: ['spec', 'spec-build', 'spec-check', 'spec-extract', 'spec-fix', 'qa'], mirrors: ['.claude/skills'], claudeHooks: true, agentsMd: ['spec-workflow'] };

test('sync vendors skills, mirrors them, installs hooks and the AGENTS.md block', () => {
  const dir = consumer(FULL);
  const result = sync(dir, '--from', source);
  assert.equal(result.status, 0, result.stderr);
  for (const name of FULL.skills) {
    assert.ok(existsSync(join(dir, '.agents/skills', name, 'SKILL.md')), name);
    assert.equal(readFileSync(join(dir, '.claude/skills', name, 'SKILL.md'), 'utf8'), readFileSync(join(dir, '.agents/skills', name, 'SKILL.md'), 'utf8'));
  }
  assert.ok(existsSync(join(dir, '.claude/hooks/stop-gate.mjs')));
  assert.ok(existsSync(join(dir, '.agents/sync.mjs')));
  const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  assert.match(agents, /Project text\./);
  assert.match(agents, /<!-- amigo-skills:begin spec-workflow -->[\s\S]*## Spec-driven workflow[\s\S]*<!-- amigo-skills:end spec-workflow -->/);
  assert.equal(sync(dir, '--check').status, 0);
});

test('check fails on a local edit of a vendored file, a stale mirror or an edited block', () => {
  const dir = consumer(FULL);
  sync(dir, '--from', source);
  appendFileSync(join(dir, '.agents/skills/qa/SKILL.md'), 'local edit\n');
  let result = sync(dir, '--check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /qa\/SKILL\.md: changed locally/);

  sync(dir, '--from', source);
  appendFileSync(join(dir, '.claude/skills/spec/SKILL.md'), 'edited mirror\n');
  result = sync(dir, '--check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /\.claude\/skills differs/);

  sync(dir, '--from', source);
  writeFileSync(join(dir, 'AGENTS.md'), readFileSync(join(dir, 'AGENTS.md'), 'utf8').replace('### Triage', '### Sorting'));
  result = sync(dir, '--check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /managed block "spec-workflow" changed locally/);
});

test('a repository-own skill is mirrored, never overwritten, and --mirror refreshes it', () => {
  const dir = consumer({ ...FULL, mirrors: ['.claude/skills', '.grok/skills'] }, root => {
    mkdirSync(join(root, '.agents/skills/own'), { recursive: true });
    writeFileSync(join(root, '.agents/skills/own/SKILL.md'), '---\nname: own\ndescription: test\n---\nOwn.\n');
  });
  sync(dir, '--from', source);
  assert.equal(readFileSync(join(dir, '.grok/skills/own/SKILL.md'), 'utf8'), '---\nname: own\ndescription: test\n---\nOwn.\n');
  appendFileSync(join(dir, '.agents/skills/own/SKILL.md'), 'More.\n');
  assert.equal(sync(dir, '--check').status, 1);
  assert.equal(sync(dir, '--mirror').status, 0);
  assert.equal(sync(dir, '--check').status, 0);
  assert.match(readFileSync(join(dir, '.claude/skills/own/SKILL.md'), 'utf8'), /More\./);
});

test('a skill dropped from the config is removed from every copy', () => {
  const dir = consumer(FULL);
  sync(dir, '--from', source);
  writeFileSync(join(dir, '.agents/skills.json'), JSON.stringify({ ...FULL, skills: FULL.skills.filter(name => name !== 'spec-fix') }));
  assert.equal(sync(dir, '--from', source).status, 0);
  assert.ok(!existsSync(join(dir, '.agents/skills/spec-fix')));
  assert.ok(!readdirSync(join(dir, '.claude/skills')).includes('spec-fix'));
  assert.equal(sync(dir, '--check').status, 0);
});

test('a skill whose requirement is not configured is refused', () => {
  const dir = consumer({ skills: ['spec-build'] });
  const result = sync(dir, '--from', source);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /requires "qa"|requires "spec-check"/);
});

test('every shared skill has front matter whose name matches its folder', () => {
  for (const name of readdirSync(join(source, 'skills'))) {
    const text = readFileSync(join(source, 'skills', name, 'SKILL.md'), 'utf8');
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---/);
    assert.ok(frontmatter, `${name}: front matter`);
    assert.match(frontmatter[1], new RegExp(`^name: ${name}$`, 'm'), `${name}: name`);
    assert.match(frontmatter[1], /^description: \S/m, `${name}: description`);
  }
});
