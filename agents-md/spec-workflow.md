## Spec-driven workflow

Features are built spec-driven: first a feature spec `docs/specs/<name>.md` with testable acceptance criteria, then the implementation with tests, then an independent acceptance check. The project specifics (design spec, where decisions go, code map, tests, commits) are in the **spec workflow profile** of this file; the skills read it.

The skills live in `.agents/skills/` (read by Codex, Gemini CLI, Copilot, Cursor, OpenCode and others) and are mirrored to `.claude/skills/` for Claude Code. They are vendored from [amigo-labs/skills](https://github.com/amigo-labs/skills): change them there and run `node .agents/sync.mjs`, never edit the copies here. Skills only this repository has live in `.agents/skills/` too and are mirrored the same way.

| Skill | Purpose |
| ----- | ------- |
| `spec <name>` | Write or revise a feature spec with acceptance criteria and a clarification pass |
| `spec-build <name>` | Implement a feature spec test-first, one commit series per AC block, independent verifier loop |
| `spec-check <name>` | Independent acceptance against a full gate run; only it sets `status: implemented` |
| `spec-extract` | Spec from existing code, or current-state analysis of an open spec |
| `spec-fix <bug>` | Bug fix: root cause, regression test that is red first, minimal fix |
| `qa` | Full gate run (`.agents/gates.json`, mirrors CI) |

An agent that cannot invoke skills by name reads `.agents/skills/<name>/SKILL.md` and follows it. At the start of a task, an agent without a session-start hook runs `node .agents/skills/qa/scripts/open-specs.mjs` to see the open feature specs.

Two kinds of spec live in `docs/specs/`:

| Kind | Status | Owns |
| ---- | ------ | ---- |
| Design spec (named in the profile) | `status: draft`, no acceptance criteria | Architecture, data model, the decisions |
| Feature spec `docs/specs/<name>.md` | `status: todo` / `implemented`, `## Acceptance criteria` | One feature: what it does, how we prove it |

A feature spec references the design-spec sections it builds on and never contradicts them. A feature that needs an architectural decision (cross-crate or cross-package boundary, file format, new dependency, public API shape) gets a decision where the profile says, in the same commit as the spec. The spec index (profile **Spec index**, default `docs/specs/README.md`) lists the feature specs: order, dependencies, done, and the backlog of gaps not yet written as specs.

### Triage

Classify every new input before touching code:

| Input | Approach |
| ----- | -------- |
| New feature or changed behavior ("I want …", "it should …") | Start `spec`, no code before the spec. If the user says "just do it", implement directly. |
| Request touches an existing feature spec | Revise that spec in `spec`'s revision mode, never create a second one |
| Unclear whether small change or feature | Exactly one question: "Capture as spec" / "Implement directly" |
| Bug fix | `spec-fix`: directly, always with a regression test that is red before the fix. If the fix changes specified behavior, revise the spec too. |
| Refactoring, tooling, docs, questions | Directly, no spec |
| "Carry on", "build X", "implement the spec" | `spec-build <name>` |
| "Is X done?", acceptance after manual implementation | `spec-check <name>` |
| Document existing behavior | `spec-extract <area>` |

Only `spec-check` sets a spec to `status: implemented` — never by hand.

### Keeping knowledge

Project knowledge belongs in the repository, not on one machine:

- **Pitfalls and non-obvious knowledge** → `## Gotchas` in this file. Only what cannot be read from code or git history; no noise.
- **Architecture decisions** → where the profile's **Decisions** entry says.
- **Feature-local decisions** → `## Decisions` of the feature spec, with the reason.
- **Progress of a feature** → `## Evidence` of the feature spec (there is no separate status file).
- **Never** into an agent's private memory (e.g. Claude Code auto memory): it stays on one machine.

### Quality gates

- **Run the `qa` skill before finishing any coding task** and report the result. The gate commands are in `.agents/gates.json`: `stop` (seconds: formatting, clippy on the changed crates — the Claude Code Stop hook runs it after every turn that changed code), `fast` (before every commit — the Claude Code commit gate refuses a commit while one is red; other agents run `node .agents/skills/qa/scripts/gates.mjs fast` before committing) and `full` (mirrors CI, `node .agents/skills/qa/scripts/gates.mjs full`).
- **Fix the cause, never lower the gates.** No suppressions (the list is `suppressions` in `.agents/gates.json`), no weakened, skipped or ignored tests. The Claude Code guard hook refuses new suppressions; a justified one is added by the user.
- **Don't loosen the gate configuration**: `.agents/gates.json`, `.agents/skills/qa/scripts/`, `.claude/settings.json` and `.claude/hooks/` change only on the user's explicit request.
- Where a gate names a `fix` command (formatting, lint autofix), that fix is allowed; everything else is fixed in the code. Where a gate has a `note`, follow it.
- `STOP_GATE=off` / `COMMIT_GATE=off` in the environment switch the Claude Code Stop hook / commit gate off, e.g. for a bulk migration — only on the user's request.
