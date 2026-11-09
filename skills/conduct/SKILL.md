---
name: conduct
description: Turns the main Claude Code thread into a conductor that only manages and hands every piece of work to subagents, launched in parallel — plain lookups, file summaries and classification on Haiku; context gathering that needs judgment, builds and tests, reports and analysis on Sonnet; code writing, debugging, review, design and browser driving on Opus, per a benchmark-backed routing table; briefs kept to goal and done criteria. Installs it as one marked orchestration block in CLAUDE.md so it holds in every later session; re-running replaces the block, "off" removes it. Use when the user says "/conduct", "orchestrate with agents", "work with subagents", "use as many agents as possible", "set up orchestration", "make the main agent only manage", or the Turkish "orkestrasyon kur", "agentlarla calis", "mumkun oldugunca cok agent", "ana agent sadece yonetsin". For turning what repeats in a project into skills, hooks and commands use know-me.
license: MIT — adapted from olcayseygan/crumora (LICENSE.txt)
metadata:
  source: https://github.com/olcayseygan/crumora/tree/58993e930abd0df1344b599a0918cd355b768629/skills/conduct
  agents: claude-code
---

# conduct — the main thread manages, agents do the work

Writes one marked block into `CLAUDE.md`. Builds nothing else.


**Claude Code only:** the block names Claude Code's Agent tool and its models. In a repository whose
`CLAUDE.md` only imports `AGENTS.md`, the block still goes into `CLAUDE.md` (after the import line), so
other agents are not handed Claude-specific routing.

## Flow

1. **Pick the file.** Default is `CLAUDE.md` at the repository root; `global` or `everywhere` targets
   `~/.claude/CLAUDE.md`. `off` removes the block and the blank line before it, nothing else, and
   stops.
2. **Write the block** below verbatim, markers included. An existing `<!-- conduct:start -->` …
   `<!-- conduct:end -->` pair is replaced in place, never duplicated; otherwise append it to the end
   of the file after one blank line, creating the file if needed. Nothing outside the markers changes.
3. **Apply it now** — it binds the rest of this session too.
4. **Report** one line: the file, then `new`, `replaced` or `removed`.

## The block

```markdown
<!-- conduct:start -->
## Orchestration

The main thread is the conductor. It plans, splits, delegates, merges and reports — it does not do
the work itself. Everything else goes to subagents through the Agent tool.

- **Delegate everything that can be delegated.** Reading code, searching, running builds and tests,
  writing and editing code, reviewing — all of it goes to an agent. The main thread reads only what
  agents return and what it needs to decide the next split.
- **As many agents as the work splits into.** Break the job into independent pieces and launch them
  together in one message so they run in parallel. Many small, focused agents beat one big one.
- **Pick the model by the work.** Routing follows the Haiku 5.5 / Sonnet 5.5 / Opus 5.5 benchmarks;
  the older Sonnet and Haiku 4.5 trail them everywhere and are never picked. Haiku 5.5 trails Sonnet
  on every benchmark (Terminal-Bench 4.0 39.2% vs 70.6%, FrontierCode 1.1 46.4% vs 52.1%, OSWorld
  2.1 offline 72.4% vs 83.9%, AA-Briefcase v1.1 1578 vs 1824, Chartography 46.4% vs 61.6%), so it
  takes only plain lookups — never terminal, code, reports, review or browser work.

  | Work | Model | Evidence |
  |---|---|---|
  | Plain lookups: find a file, symbol or string, list or count, read and summarise a named file, classify or route | `haiku` | ~1/20 Sonnet's price ($0.10/$0.50 vs $2/$10 per MTok); Anthropic names it for subagents, summarisation, classification and routing |
  | Context gathering that needs judgment: tracing a flow across files, drawing conclusions | `sonnet` | cheapest model that holds the judgment; no benchmark needs Opus here. Use `Explore` for read-only sweeps |
  | Running builds and tests, shell-heavy and long terminal tasks | `sonnet` | Terminal-Bench 4.0: 70.6% vs Opus 66.4% |
  | Reports, documents, analysis, knowledge work | `sonnet` | AA-Briefcase 1811 vs 1822, GDPval 1844 vs 1846 — a tie at lower cost |
  | Writing or changing code that must merge as-is | `opus` | FrontierCode 1.1: 54.4% vs 52.1%; Sonnet overreaches the scope at max effort |
  | Multi-file feature work, debugging | `opus` | CursorBench 4.0: 57.8% vs 55.5% |
  | Code review | `opus` | the merge-quality gap above; Sonnet's review fans out past the scope |
  | Design, architecture, anything ambiguous or multi-step | `opus` | Humanity's Last Exam: 67.7% vs 64.5% |
  | Driving a browser or desktop, reading screenshots and charts | `opus` | OSWorld 81.8% vs 80.1%, Chartography 64.4% vs 61.6% |
- **Brief coders short.** A code-writing agent gets the goal, where it lives and what "done" means —
  not the implementation, not code it can read itself. They are capable; over-explaining only
  narrows them.
- **Gatherers return conclusions,** not dumps: facts with `file:line`, in as few lines as hold them.
- **Agents speak caveman (MUST).** Every brief tells the agent to write its report in caveman style —
  no articles, filler, pleasantries or hedging; fragments fine; technical terms, code, paths and
  errors exact. When a caveman agent fits the job (`cavecrew-investigator`, `cavecrew-builder`,
  `cavecrew-reviewer`), use it over the plain one. Code, commits and PRs the agent writes stay normal.
- **Parallel writers never share a file.** Split by file or module; when two pieces must touch the
  same file, run them one after the other or give each `isolation: "worktree"`.
- **The usual shape:** gather in parallel (`haiku` for plain lookups, `sonnet` where it takes
  judgment) → write in parallel per area (`opus`) → verify (`sonnet` runs the build and tests, `opus`
  reviews) → the main thread merges and reports.
- **Follow up, don't restart.** A follow-up for an agent that already has the context goes through
  SendMessage, not a fresh agent.
<!-- conduct:end -->
```
