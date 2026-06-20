# speclite — design questions

Answer these before detailed implementation. Each has a **recommendation**. Edit answers
inline (e.g. add `> ANSWER: ...`).

---

## A. Architecture

### A1. CLI vs skill-only — where does logic live?
design.md mixes CLI commands (`speclite init`, `speclite issues list`) with skill prompts
that run raw git/grep/sed. Two models:
- **(rec) Thin CLI + smart skills.** CLI only does deterministic file/config work (`init`,
  `issues`). Skills do the git/grep/sed orchestration directly. Keeps skills inspectable,
  CLI small, plugin usable without the binary for core flow.
- Fat CLI. CLI does everything; skills just shell out to `speclite plan` etc. More testable,
  but logic hidden from the model and harder to tweak per-repo.

> **Recommendation:** Thin CLI + smart skills. CLI optional for the core plan/implement/commit loop.

> ANSWER: Thin CLI + smart skills, but CLI will come later

### A2. CLI implementation language
Affects homebrew packaging.
- **(rec) Go.** Single static binary, trivial homebrew bottle, no runtime dep. Best for "more repos" goal.
- Bash. Zero build, but fragile for issue-store HTTP/JSON and cross-platform.
- Node. Easy JSON/HTTP, but requires node runtime + heavier brew formula.

> **Recommendation:** Go if issue-store integration ships; Bash if CLI stays trivial (just `init`).

> ANSWER: Go, but we'll do this later

### A3. Is the CLI even required for v1?
`speclite init` could be done entirely by the `speclite-init` skill (mkdir + write templates).
- **(rec) Skip CLI for v1.** Ship plugin only. Add CLI later for issue store. Simpler, faster, fewer install moving parts.

> **Recommendation:** v1 = plugin only, no binary. Defer CLI + homebrew until issue store lands.

> ANSWER: v1 = plugin only, no binary, defer CLI for now, but add CLI + homebrew to roadmap (specs/lite/roadmap.md)

---

## B. Workflow & conventions

### B1. Roadmap item id format
design.md uses `R\d\d\d` (R001).
- **(rec)** Keep `R<NNN>`, zero-padded 3 digits, sequential, never reused.

> ANSWER: use recommended

### B2. Status encoding
design.md uses title suffixes ` - PLANNED`, ` - DONE`.
- **(rec)** Keep suffix convention; add implicit "backlog" = no suffix. Consider ` - WIP` between PLANNED and DONE? (proposed)

> Question: want a WIP/in-progress status, or is branch-existence enough?

> ANSWER: Let's have WIP as well as a status corresponding to completion of each step in the flow... (backlog) -> PLANNED -> WIP (implementation started) -> DONE (code complete, ready to commit).

### B3. When is an item marked DONE?
design.md marks DONE at end of **implement**. But there's also commit + optional review after.
- **(rec)** Mark ` - DONE` at **commit/PR**, not implement. Implement → ` - WIP`. Avoids "done but unmerged".

> Question: DONE on merge, on PR open, or on implement?

> ANSWER: see previous question, DONE once implemented

### B4. Branch naming
design.md: `feat|fix/<seq_num>-<branch_name>`, with optional `<issue_id>`.
- **(rec)** `<type>/R<NNN>-<slug>` and `<type>/R<NNN>-<issue_id>-<slug>` when issue present.
  Confirm types beyond feat/fix (chore, docs, refactor?).

> ANSWER: types: feat, fix, chore, docs, refactor... include any other recommended types

### B5. One plan per item, or per branch?
- **(rec)** One plan file per roadmap item: `specs/lite/<NNN>-<slug>-plan.md`. Matches design.md.

> ANSWER: by default 1 roadmap item = 1 plan = 1 branch, this is normal flow, but not strict, can include multiple roadmap items in plan if requested, or multiple plans in branch if requested, be flexible with user request

---

## C. Skills scope

### C1. Which skills ship in v1?
- **(rec)** init, plan, implement, commit. Defer **review** (optional) and **roadmap/issues** (add-on).

> ANSWER: init, plan, implement, commit.  Defer review and roadmap/issues.

### C2. review skill — build it or reuse?
You already have `/code-review` and `/review`.
- **(rec)** Don't build a speclite review. `speclite-review` just delegates to `/code-review` scoped to the branch diff.

> ANSWER: defer review step, may skip, will decide later

### C3. commit skill — reuse git-helper?
You have a `git-helper` skill and `caveman-commit`.
- **(rec)** Reuse: `speclite-commit` calls git-helper for commit/branch/PR formatting; speclite only adds the roadmap-status update + plan-completeness check.

> ANSWER: keep `speclite-commit` simple and ambiguous enough to also use git-helper or caveman-commit to format commit message when present, allows us to layer on additional instructions for speclite

### C4. PR backend
design.md says "github or bitbucket MCP".
- **(rec)** Prefer `gh` CLI when present (no MCP setup); fall back to MCP. Bitbucket via MCP only.

> ANSWER: Prefer `gh` for github, and `bkt` (https://github.com/avivsinai/bitbucket-cli) for bitbucket.  Note that bkt has a skill, but prob better to just add some basic instructions in our PR creation skill here.

---

## D. Issue store (optional add-on)

### D1. Ship in v1 or defer?
- **(rec)** Defer. Build core loop first; issue store is the natural v2.

> ANSWER: Defer for now, will add later, include in roadmap

### D2. Credential storage
design.md: `~/.config/speclite/credentials` (e.g. Jira PAT).
- **(rec)** Prefer OS keychain or env var (`SPECLITE_JIRA_TOKEN`); fall back to a 0600 file. Plain file = secret-on-disk risk.

> **Security note:** confirm you want tokens in a flat file vs keychain/env before implementing.

> ANSWER: Agreed, OS keychain or env var

### D3. Stores supported
- **(rec)** GitHub Issues first (you likely use gh already), Jira second, Bitbucket later.

> ANSWER: Later, but add GitHub Issues and Jira in roadmap. No bitbucket for issues.

---

## E. Packaging & distribution

### E1. Homebrew — formula vs cask vs tap?
- **(rec)** Personal tap `nhadzariga/tap` with a formula. Only meaningful if CLI exists (see A3).
  If plugin-only v1, distribute via Claude Code marketplace, not brew.

> ANSWER: deferred, add to roadmap, but will go with recommended

### E2. Plugin distribution
- **(rec)** Publish to a marketplace repo; users `claude plugin install speclite@nhadzariga`. Confirm GitHub org/repo name.

> ANSWER: deferred, add to roadmap, it's a maybe

### E3. "Eventually plugin for more repos" — what does this mean?
Clarify the goal:
- (a) One plugin, used across many repos (per-repo `specs/lite/`). ← assumed
- (b) speclite scaffolds/manages multiple separate repos from one place.
- (c) A marketplace hosting several of your plugins.

> **Question:** which of (a)/(b)/(c)? Changes whether config is per-repo or global.

> ANSWER: a

### E4. Repo / org name + homepage URL
Formula and marketplace need the canonical URL. `bin/speclite` and `speclite.rb` use
`github.com/nhadzariga/speclite` as a placeholder — confirm.

> ANSWER: deferred, but will be github.com/elnaterator/speclite

---

## F. Misc

### F1. specs/lite/ path — fixed or configurable?
- **(rec)** Fixed `specs/lite/` for v1. Configurable later via `.speclite.json`.

> ANSWER: use recommendation

### F2. Trunk branch detection
design.md lists main/master/develop.
- **(rec)** Detect via `git symbolic-ref refs/remotes/origin/HEAD`; fall back to the list.

> ANSWER: use recommendation

### F3. Naming — keep "speclite"?
Confirm final name (affects everything). Assumed yes.

> ANSWER: yes

---

## G. Autopilot (R006)

### G1. Does autopilot auto-commit?
- **(rec)** No. Autopilot advances plan → implement → DONE, then **halts at the pre-commit
  gate**. Commit/push/PR are irreversible + outward-facing, so they stay human-driven.

> ANSWER: yes, halt before `speclite-commit`; commit/push/PR stay manual.

### G2. Continuous multi-item looping vs. one item per enable?
- **(rec)** Advance the current item to DONE, then halt. Crossing to the next backlog item
  needs a human commit + re-run. Keeps a human checkpoint per item.

> ANSWER: one item to the pre-commit gate, then halt. Human checkpoint per item.

### G3. Enable-flag + halt-marker location?
- **(rec)** `specs/lite/.autopilot` (presence = on) and `specs/lite/.autopilot-halt`
  (transient stop signal). Both git-ignored via `speclite-init`.

> ANSWER: use recommendation.

### G4. How does the loop avoid spinning forever?
- **(rec)** Every halt path in `speclite-next` writes `.autopilot-halt`. The Stop hook allows
  the session to stop when the halt marker is present (or the enable flag is absent), and only
  blocks-and-continues when the flag is on and no halt marker exists. So every termination is
  explicit and gates surface to the human.

> ANSWER: use recommendation. Markers in `specs/lite/`, hook is pure bash.

### G5. How are plugin hooks declared?
- `hooks/hooks.json` in the plugin root is auto-discovered (no plugin.json field needed). The
  Stop event ignores `matcher`. Command path uses `"${CLAUDE_PLUGIN_ROOT}"/hooks/...`. Block
  via JSON `{"decision":"block", ...}`; `hookSpecificOutput.additionalContext` is the text fed
  to Claude (`reason` is shown to the user, not Claude). Confirmed against current docs.

> ANSWER: use recommendation.

## R010 — three-state autopilot mode (semi-auto / full-auto)

### M1. Binary enable flag vs. three-state mode?
- **(rec)** Replace the presence-based `.autopilot` flag and `/speclite-auto on|off` with a
  single `specs/lite/.mode` file whose contents are `default` | `semi-auto` | `full-auto`,
  set via `/speclite-mode <mode>`. `default`/absent = off; `semi-auto` = today's loop (halt
  before commit); `full-auto` = loop that also auto commits + pushes + opens a PR, then halts
  after the PR. One source of truth, room to grow, clearer intent than a bare flag.

> ANSWER: use recommendation. Skill renamed `speclite-auto` → `speclite-mode`; no back-compat
> alias (roadmap text says "Instead of speclite-auto on/off"). Halt marker keeps the name
> `.autopilot-halt` to minimize churn. `speclite-init` does not seed `.mode` — absent ⇒
> `default`; it only adds `.mode` to the git-ignore list.

### M2. Does full-auto cross the pre-commit gate? Where does the commit happen?
- **(rec)** The Stop hook stays a dumb "loop on/off" check (mode ≠ default ⇒ block + run
  `/speclite-next`). The gate decision lives in `speclite-next`: on a branch with item `DONE`,
  `semi-auto` halts (pre-commit gate); `full-auto` dispatches `/speclite-commit`, then halts
  after the PR. full-auto never merges. This revises the earlier "autopilot never
  auto-commits/pushes/PRs" invariant — it now applies only to `default`/`semi-auto`.

> ANSWER: use recommendation. Setting `full-auto` must warn the user of the auto-push/PR risk.
