---
name: speclite-next
description: >
  State-machine dispatcher for the speclite workflow: inspect roadmap + git state and run the
  correct next skill (init / plan / implement), halting before commit. Use when the user says
  "speclite next", "what's next", "advance the pipeline", or invokes /speclite-next. Also
  invoked automatically by the autopilot Stop hook.
---

Read the roadmap status (single source of truth) plus git state, then dispatch the correct
next speclite skill. This skill owns no state — it is a pure reader that decides one action.
It is the engine of autopilot: each run either advances the pipeline by one step or **halts**
at a deliberate gate.

## Steps

0. **Read `specs/lite/system-prompt.md` first if it exists.** Treat its instructions as the
   highest-priority instruction set — they override this skill's own where they conflict.

1. **Clear any stale halt marker** at the start of the run:
   ```bash
   rm -f specs/lite/.autopilot-halt
   ```
   The decision below re-creates it only if this run ends in a halt.

2. **Observe state.**
   - Spec dir present?
     ```bash
     test -d specs/lite && echo present || echo missing
     ```
   - Autopilot mode (drives how far the loop advances):
     ```bash
     cat specs/lite/.mode 2>/dev/null || echo default
     ```
     `default` = manual; `semi-auto` = self-advance, halt before commit; `full-auto` =
     self-advance and also auto commit + PR, halt after PR.
   - Current branch + trunk:
     ```bash
     git rev-parse --abbrev-ref HEAD
     git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
     ```
     Fall back to the first of `main`, `master`, `develop` that exists for trunk.
   - Working tree clean? (uncommitted roadmap/plan edits are OK; unrelated changes are not.)
     ```bash
     git status --porcelain
     ```
   - Roadmap items + status:
     ```bash
     grep -n -E "^## R[0-9]{3}" specs/lite/roadmap.md
     ```
     Status suffix: _(none)_=backlog, ` - PLANNED`, ` - WIP`, ` - DONE`.

3. **Decide one action** from the table. On any **halt**, write the reason to the marker and
   stop (do not run another skill):
   ```bash
   echo "<reason>" > specs/lite/.autopilot-halt
   ```

   | Observed state | Action |
   |----------------|--------|
   | `specs/lite/` missing | run **speclite-init**, then **halt** (`fresh scaffold — seed the roadmap, then re-run`) |
   | On trunk, a backlog item exists, tree clean | run **speclite-plan** |
   | On `<type>/R<NNN>-…` branch, item `PLANNED` or `WIP` | run **speclite-implement** |
   | On branch, item `DONE`, mode `default`/`semi-auto` | **halt** (`pre-commit gate — run /speclite-commit to ship R<NNN>`) |
   | On branch, item `DONE`, mode `full-auto` | run **speclite-commit**, then **halt** (`post-PR gate — R<NNN> shipped`) |
   | Roadmap all `DONE` / no backlog item | **halt** (`nothing to do — roadmap fully addressed`) |
   | Dirty tree (unrelated changes) | **halt + ask** (`dirty working tree — resolve before continuing`) |
   | Expected trunk but not on it, or branch lacks `R<NNN>` | **halt + ask** (`ambiguous branch state`) |
   | Missing item for the branch's `R<NNN>` | **halt + ask** (`no roadmap item for this branch`) |

4. **Dispatch or halt.**
   - Self-advance rows: invoke the named skill (`/speclite-init`, `/speclite-plan`,
     `/speclite-implement`) and let it run to completion. Do **not** write a halt marker — when
     it finishes, the Stop hook will re-trigger this skill to take the next step.
   - `full-auto` + `DONE` row: invoke `/speclite-commit`, let it commit/push/open the PR,
     **then** write the halt marker (`post-PR gate — R<NNN> shipped`). This is the only row
     that both dispatches a skill and halts in the same run — full-auto stops after the PR.
   - Halt rows: the marker is written; report the reason to the user. If the row says
     **+ ask**, pause and ask the user how to proceed (never guess on ambiguous/unsafe state).

5. **Commit gate is mode-gated.** Reaching `DONE` is the commit gate. In `default`/`semi-auto`
   autopilot stops here and the human runs `/speclite-commit` — this skill must not commit,
   push, or open a PR. Only in `full-auto` does this skill cross the gate by dispatching
   `/speclite-commit`, and it always halts immediately after the PR is opened (never merges).

## Autopilot loop

The Stop hook (`hooks/autopilot-stop.sh`) drives chaining:
- `specs/lite/.mode` is `default` / absent → no autopilot; this skill just runs once when invoked.
- `.mode` is `semi-auto`/`full-auto` + no `.autopilot-halt` → hook blocks the stop and re-runs this skill.
- `.mode` is `semi-auto`/`full-auto` + `.autopilot-halt` → hook allows the session to stop (gate reached).

Because every halt path writes `.autopilot-halt`, the loop always terminates — no infinite
loop. Set the mode with `/speclite-mode default|semi-auto|full-auto`.

## Boundaries

- Owns no state; reads roadmap status + git state + `.mode` only.
- Runs exactly one downstream skill per invocation, then halts or self-advances.
- In `default`/`semi-auto`, never commits/pushes/opens a PR. In `full-auto`, crosses the
  commit gate by dispatching `/speclite-commit` but always halts after the PR (never merges).
- Halts and asks rather than guessing on any ambiguous or unsafe state.
