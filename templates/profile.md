## Spec workflow profile

What the shared spec skills (`spec`, `spec-build`, `spec-check`, `spec-extract`, `spec-fix`, `qa`) need to know about this repository. Keep the bold keys; the skills look them up by name. Point to other sections of this file instead of repeating them.

- **Design spec** — `docs/specs/<project>.md` (`status: draft`, no acceptance criteria): architecture, data model. Other design documents: …
- **Spec index** — optional: the file that lists the feature specs (order, backlog, done); default `docs/specs/README.md`.
- **Decisions** — where an architectural decision goes, e.g. "Decision Log in `docs/specs/<project>.md` §N" or "an ADR `docs/adrs/NNNN-<slug>.md`".
- **Code map** — where `spec` and `spec-extract` look for the feature area: crates / packages / folders and what each holds.
- **Spec questions** — what `spec` asks besides what, why and edge cases (e.g. which platform, which mode, which UI entry point), and the extra front-matter fields that record it (e.g. `platforms: {all | Windows | …}`).
- **AC subject** — what an always-AC is about ("The editor …", "The viewer …", "The server …").
- **Performance AC example** — one falsifiable example with the command that measures it.
- **Tests** — the kinds of tests and where they live (unit, integration, e2e, golden, benchmarks), naming, the command for a red run of one test, and what cannot be automated (→ `manual:`).
- **CI-only checks** — optional: tests that only a CI job runs (e.g. the Windows job). An AC proven only there carries `CI: <job>` after its form.
- **Build check** — the command that proves the build is green before `spec-build` starts.
- **Conventions** — where the code conventions are (module/crate rules, user-visible strings, i18n, doc comments), the forbidden patterns and the definition of done.
- **Stopping points** — what needs the user instead of a decision by the agent (new dependency, `unsafe`, disabled test, public API, …).
- **Sizing** — how big one session's work may be (e.g. "about one M task, ~400 changed lines").
- **Commits** — Conventional Commits scopes, what never shares a commit, one example with AC IDs.
- **Language** — optional: the language of specs, commit messages and code comments; default English.
- **Branches** — protected branch and the feature-branch name (default: `main` protected, `feat/<spec-name>`).
