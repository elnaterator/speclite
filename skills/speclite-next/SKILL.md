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
   | On branch, item `DONE` | **halt** (`pre-commit gate — run /speclite-commit to ship R<NNN>`) |
   | Roadmap all `DONE` / no backlog item | **halt** (`nothing to do — roadmap fully addressed`) |
   | Dirty tree (unrelated changes) | **halt + ask** (`dirty working tree — resolve before continuing`) |
   | Expected trunk but not on it, or branch lacks `R<NNN>` | **halt + ask** (`ambiguous branch state`) |
   | Missing item for the branch's `R<NNN>` | **halt + ask** (`no roadmap item for this branch`) |

4. **Dispatch or halt.**
   - Non-halt rows: invoke the named skill (`/speclite-init`, `/speclite-plan`,
     `/speclite-implement`) and let it run to completion. Do **not** write a halt marker — when
     it finishes, the Stop hook will re-trigger this skill to take the next step.
   - Halt rows: the marker is written; report the reason to the user. If the row says
     **+ ask**, pause and ask the user how to proceed (never guess on ambiguous/unsafe state).

5. **Never auto-commit.** Reaching `DONE` is the pre-commit gate. Autopilot stops here; the
   human runs `/speclite-commit`. This skill must not commit, push, or open a PR.

## Autopilot loop

The Stop hook (`hooks/autopilot-stop.sh`) drives chaining:
- `specs/lite/.autopilot` absent → no autopilot; this skill just runs once when invoked.
- `.autopilot` present + no `.autopilot-halt` → hook blocks the stop and re-runs this skill.
- `.autopilot` present + `.autopilot-halt` → hook allows the session to stop (gate reached).

Because every halt path writes `.autopilot-halt`, the loop always terminates — no infinite
loop. Toggle the flag with `/speclite-auto on|off`.

## Boundaries

- Owns no state; reads roadmap status + git state only.
- Runs exactly one downstream skill per invocation (or halts).
- Never commits/pushes/opens a PR, and never crosses the pre-commit gate automatically.
- Halts and asks rather than guessing on any ambiguous or unsafe state.
