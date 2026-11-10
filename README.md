# skills

The shared agent skills of amigo-labs, plus the small amount of tooling that puts them into a repository for **every** coding agent at once — Claude Code, Codex, Gemini CLI, GitHub Copilot, Cursor, OpenCode and anything else that reads [Agent Skills](https://agentskills.io) (`SKILL.md` folders).

## What is here

| Path | What |
| ---- | ---- |
| `skills/spec`, `spec-build`, `spec-check`, `spec-extract`, `spec-fix` | The spec-driven workflow: feature spec with acceptance criteria → test-first build → independent acceptance; bug fixes with a red regression test |
| `skills/qa` | Full gate run; its `scripts/` hold the agent-neutral gate runner (`gates.mjs`), `commit-mode.mjs` and `open-specs.mjs` |
| `skills/ui-polish` | Screenshot-scored UI improvement loop |
| `skills/improve` | Measure → change once → compare once: a scripted defect list, one builder, one blind old/new comparison in both orders; `scripts/` hold the width sweep (`sweep.mjs`) and the blind-pool builder (`blind.mjs`) |
| `skills/compose`, `humanize`, `evolve`, `gauge`, `muster`, `lint`, `readback`, `data-report`, `conduct`, `know-me` (+ `_shared`) | Adapted from [olcayseygan/crumora](https://github.com/olcayseygan/crumora) (MIT, `LICENSE.txt` in each folder, source commit in the front matter). Available, not installed by default — see "Skills from crumora" |
| `agents-md/spec-workflow.md` | The workflow rules (triage, keeping knowledge, quality gates), inserted into each repository's `AGENTS.md` as a managed block |
| `adapters/claude/hooks/` | Claude Code hooks around the gate runner: SessionStart (open specs), Stop (`stop` gates: seconds, changed crates only), commit gate (`fast` gates before `git commit`), PreToolUse guard (no new suppressions) |
| `sync.mjs` | Installer, updater and drift check; vendored into each repository as `.agents/sync.mjs` |
| `templates/` | Starting points for a new repository: `skills.json`, `gates.json`, the profile section, Claude Code `settings.json` |

The skills are **project-neutral**. Everything project-specific — the design spec, where decisions go, the code map, test kinds, commit scopes, stopping points — lives in the repository's `AGENTS.md`, section `## Spec workflow profile` (`templates/profile.md`). The gate commands live in the repository's `.agents/gates.json`.

## How a repository uses them

Skills are **vendored** (committed copies), not linked:

```text
.agents/skills.json          which shared skills, which mirrors, hooks, AGENTS.md blocks
.agents/skills.lock.json     source commit + hash of every vendored file (written by sync)
.agents/sync.mjs             this repository's sync.mjs
.agents/skills/<name>/       canonical copy — Codex, Gemini CLI, Copilot, Cursor, OpenCode read it
.agents/gates.json           the repository's gate commands (fast / full)
.claude/skills/<name>/       mirror for Claude Code, which reads only .claude/skills
.claude/hooks/               Claude Code adapter hooks (if "claudeHooks": true)
AGENTS.md                    profile + managed block; CLAUDE.md contains only `@AGENTS.md`
```

Why copies: Claude Code reads only `.claude/skills/`, and plugins declared in a repository's settings don't load in Claude Code cloud sessions. Symlinks break on Windows checkouts without symlink support, and submodules are not initialized in a fresh clone. A committed copy works everywhere and shows up in code review. `--check` keeps the copies honest.

Skills that only one repository needs (e.g. `verify-pin` in amigo-metropolis) live in that repository's `.agents/skills/` and are mirrored the same way; sync never overwrites them.

### Commands

Run from the consuming repository's root (Node 18+, no dependencies):

```bash
node .agents/sync.mjs                    # update to the latest main of amigo-labs/skills
node .agents/sync.mjs --from ../skills   # update from a local checkout (while developing a skill)
node .agents/sync.mjs --ref <ref>        # update to a branch, tag or commit
node .agents/sync.mjs --mirror           # after editing a repository-own skill in .agents/skills
node .agents/sync.mjs --check            # offline drift check (part of the full gates)
```

### Adopting it in a new repository

1. Copy `templates/skills.json` to `.agents/skills.json` and `templates/gates.json` to `.agents/gates.json`; adapt the gate commands to the repository's CI.
2. Add `templates/profile.md` as `## Spec workflow profile` to `AGENTS.md` and fill it in. If the repository only has a `CLAUDE.md`, move its content to `AGENTS.md` and leave `@AGENTS.md` as the only line of `CLAUDE.md`.
3. With Claude Code hooks: merge `templates/claude-settings.json` into `.claude/settings.json`.
4. Bootstrap once: `node ../skills/sync.mjs --from ../skills` (or with a fresh clone of this repository), then commit everything it wrote.

### Changing a shared skill

Edit it here, keep it project-neutral (project facts belong in the profile), run `node --test test/*.test.mjs`, merge, then run `node .agents/sync.mjs` in each consuming repository. A skill that needs another one names it in its front matter (`metadata: requires: qa spec-check`); sync refuses a configuration that misses one.

## Writing skills for every agent

- Standard `SKILL.md` front matter: `name` (= folder name), `description` (what and when — agents choose skills by it), optional `argument-hint` and `metadata`.
- `$ARGUMENTS` / `$0` and `` !`command` `` context lines are Claude Code features. Every skill says in its **Agent notes** what they mean, so another agent fills them in itself.
- Name tools by what they do and give the Claude Code name in brackets ("ask the user (AskUserQuestion)", "a subagent without chat history (the Agent tool)"), with a fallback for agents without them.
- Scripts are plain Node without dependencies and are called by their path under `.agents/skills/` — that path exists for every agent.

## Skills from crumora

Ten skills from [olcayseygan/crumora](https://github.com/olcayseygan/crumora) (MIT, © Olcay Seygan), copied at the commit named in each `metadata: source:` and adapted to work outside its Claude Code plugin:

| Skill | What it does | Notes |
| ----- | ------------ | ----- |
| `compose` | Rebuilds a screen's layout in scored rounds; a blind judge picks the winner | needs `_shared` (the tournament rules), a browser |
| `humanize` | Rebuilds an interface's interaction flow in scored rounds, judged on walked tasks | needs `_shared`, a browser |
| `evolve` | Improves code, a UI or a document in scored generations | needs `_shared`, `compose`, `humanize` |
| `gauge` | Measures a rendered UI (type, colour, contrast, alignment, viewports) and fixes misses | overlaps `ui-polish` |
| `muster` | Checks a UI against 73 UX patterns and fixes violations | |
| `lint` | Checks code against a fixed rule set (lite / full / ultra) and fixes it in place | rules may clash with a project's own conventions — the project's AGENTS.md wins |
| `readback` | Restates a request as consequences before any work starts | |
| `data-report` | Runs a data / measurement study and writes a single-file HTML report | `scripts/chart.py` needs Python + matplotlib |
| `conduct` | Writes an orchestration block into `CLAUDE.md` (subagents, model routing) | Claude Code only |
| `know-me` | Turns what repeats in a project into skills, commands, hooks, rules | Claude Code centred; writes skills to `.agents/skills` where this sync is used |

`improve` (not from crumora) is the cheap alternative to `compose`, `humanize` and `evolve`. It takes about two agents per run instead of dozens; a tournament's later rounds mostly sort near-equal versions inside the judge's noise. Use a tournament when you want several directions explored, `improve` for a measured fix of one target.

Adaptations: references to `CLAUDE.md` also accept `AGENTS.md`, paths include `.agents/skills/`, the plugin's lint SessionStart hook is not included, and `conduct` / `know-me` say how they behave in a repository that uses this sync. They are not in any repository's `skills.json` yet: every installed skill costs context in each session (these descriptions are long), so a repository adds the ones it uses, e.g. `"skills": [..., "gauge", "muster"]`.

## Consumers

| Repository | Shared skills | Own skills |
| ---------- | ------------- | ---------- |
| amigo-pincel | spec workflow, qa, ui-polish, improve | — |
| amigo-blinzel | spec workflow, qa | — |
| amigo-krake | spec workflow, qa | — |
| amigo-engine | spec workflow, qa | — |
| amigo-game | spec workflow, qa | deep-scan |
| amigo-metropolis | — | verify-pin (also mirrored to `.grok/skills`) |
| amigo-native | — | audit-crates, rust-check |
