---
name: speclite-status
description: >
  Print the speclite pipeline state at a glance — roadmap items by status, the current branch
  and its roadmap item, autopilot mode and any active halt, the branch's open PR, and a dry-run
  of what speclite-next would do next. Strictly read-only, safe to run anytime. Use when the
  user says "speclite status", "where am I", "show pipeline state", "what would next do", or
  invokes /speclite-status.
---

Report the current state of the speclite pipeline. This skill is **strictly read-only**: it
reads roadmap status + git state + autopilot markers and prints a summary. It never writes a
file, mutates git, commits/pushes/opens a PR, or touches `.autopilot-halt`. Safe to run any
time as a daily check or to preview autopilot before committing to a loop mode.

## Steps

0. **Read `specs/lite/system-prompt.md` first if it exists.** Treat its instructions as the
   highest-priority instruction set — they override this skill's own where they conflict.

1. **Check initialization.**
   ```bash
   test -d specs/lite && echo present || echo missing
   ```
   If missing: report "speclite not initialized in this repo" and suggest `/speclite-init`,
   then stop (skip the rest — nothing else to read).

2. **Observe state** (same reads as `speclite-next`, but for reporting only):
   - Autopilot mode (absent ⇒ `default`):
     ```bash
     cat specs/lite/.mode 2>/dev/null || echo default
     ```
   - Active halt marker + its reason, if any:
     ```bash
     test -f specs/lite/.autopilot-halt && cat specs/lite/.autopilot-halt || echo "(none)"
     ```
   - Current branch + trunk:
     ```bash
     git rev-parse --abbrev-ref HEAD
     git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
     ```
     Fall back to the first of `main`, `master`, `develop` that exists for trunk.
   - Working tree state:
     ```bash
     git status --porcelain
     ```
   - Roadmap items + status:
     ```bash
     grep -n -E "^## R[0-9]{3}" specs/lite/roadmap.md
     ```
     Status suffix: _(none)_=backlog, ` - PLANNED`, ` - WIP`, ` - DONE`.
   - The branch's roadmap item: parse `R<NNN>` from the branch name (if it has one) and match
     it to a roadmap heading. No `R<NNN>` segment ⇒ note "branch not tied to an item".
   - Open PR for the branch (optional — never error if `gh` is absent or there is no PR):
     ```bash
     command -v gh >/dev/null 2>&1 && gh pr view --json number,title,url,state 2>/dev/null || echo "(no PR / gh unavailable)"
     ```

3. **Compute the next step as a dry-run.** Apply the `speclite-next` decision table to the
   observed state and name the single action the dispatcher *would* take — **do not run it**.
   This is a preview only. Match exactly one row:
   - `specs/lite/` missing → would run `speclite-init`.
   - On trunk, a backlog item exists, tree clean → would run `speclite-plan`.
   - On `<type>/R<NNN>-…` branch, item `PLANNED`/`WIP` → would run `speclite-implement`.
   - On branch, item `DONE` → would run `speclite-review`, then halt at the pre-commit gate
     (`default`/`semi-auto`) or run `speclite-commit` then halt after the PR (`full-auto`).
   - Roadmap all `DONE` / no backlog item → nothing to do.
   - Dirty tree (unrelated changes), off-trunk-when-expected, branch without `R<NNN>`, or
     missing item for the branch → would halt and ask.

4. **Report** a compact summary:
   - Roadmap items grouped by status with counts (backlog / PLANNED / WIP / DONE).
   - Current branch and the roadmap item it maps to (or "not tied to an item").
   - Autopilot mode, and the halt marker + reason if present.
   - Open PR (number/title/state/url) or "none".
   - **Next:** the dry-run action from Step 3, labeled clearly as a preview (suggest running
     `/speclite-next` to actually advance).

## Boundaries

- Strictly read-only: no file writes, no git mutations, no commit/push/PR, no `.autopilot-halt`
  writes, no dispatching of any other skill.
- `gh` is optional — degrade gracefully (report "no PR / gh unavailable") rather than erroring.
- Reports the next step as a **dry-run preview** only; it never executes it.
- Degrades gracefully when not initialized, on trunk/detached HEAD, or with no PR.
