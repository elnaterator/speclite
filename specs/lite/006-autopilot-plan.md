---
roadmap_id: R006
issue: n/a
---

# Plan: R006 autopilot — speclite-next dispatcher + auto-loop hook

## Overview

speclite skills are run one at a time by hand. R006 adds an optional autopilot that chains
them: a `speclite-next` dispatcher reads roadmap state and runs the right next skill, and a
Stop hook re-triggers `speclite-next` after each step so the pipeline advances on its own —
until the work hits a deliberate stop.

Stay true to the repo identity: **bash + markdown only, no binary, no build step.** The Go
CLI is a separate item (R007) and is not a dependency here.

In scope:
- `speclite-next` skill — state-machine dispatcher over the existing roadmap status.
- Stop hook (bash) that re-invokes `speclite-next` while autopilot is enabled.
- `speclite-auto` skill — `on|off` toggle for the enable flag.
- Halt/termination mechanism so the loop ends (all DONE, ambiguous state, or pre-commit gate).
- Plugin hook registration + docs.

## Acceptance criteria

- [x] `speclite-next` reads `specs/lite/system-prompt.md` first (Step 0), inspects repo +
      roadmap state, and dispatches the correct skill (init / plan / implement / commit).
- [x] On ambiguous or unsafe state (dirty tree, not on trunk when expected, branch missing
      `R<NNN>`, missing/already-DONE item) `speclite-next` halts and asks — never guesses.
- [x] Autopilot **never** auto-runs commit/push/PR. It halts before `speclite-commit` with a
      clear reason; the human resumes that step manually.
- [x] Stop hook re-triggers `speclite-next` only when the enable flag is on **and** no halt
      marker is present; otherwise it allows the session to stop normally.
- [x] `/speclite-auto on` and `/speclite-auto off` create/remove the enable flag.
- [x] Roadmap all `DONE` / no backlog → `speclite-next` halts and reports "nothing to do".
- [x] No infinite loop: a single decision that ends in halt writes the halt marker so the
      next Stop event lets the session end.

## Open questions

- [x] Autopilot stops before commit/PR (does not auto-commit). — _proposed: yes, halt before
      `speclite-commit`; commit/push/PR stay human-driven (irreversible, outward-facing)._
- [x] Continuous multi-item looping vs. one item per enable. — _proposed: advance the current
      item plan→implement→DONE, then halt at the pre-commit gate. Crossing to the next backlog
      item requires the human to commit + re-run. Keeps a human checkpoint per item._
- [x] Enable-flag + halt-marker location. — _proposed: `specs/lite/.autopilot` (presence =
      on) and `specs/lite/.autopilot-halt` (transient); both git-ignored via `speclite-init`._
- [x] Plugin hook declaration path. — _proposed: `hooks/hooks.json` referencing
      `${CLAUDE_PLUGIN_ROOT}/hooks/autopilot-stop.sh`; confirm against current Claude Code
      plugin hook schema during implementation._

## Design

**State machine (already implicit).** Single source of truth = roadmap heading suffix:
backlog → `PLANNED` → `WIP` → `DONE`. `speclite-next` is a pure reader of that plus git
state; it owns no state of its own.

**Decision table (`speclite-next`):**

| Observed state | Next action |
|----------------|-------------|
| `specs/lite/` missing | run `speclite-init`, then halt (fresh scaffold, let human seed roadmap) |
| On trunk, backlog item exists | run `speclite-plan` |
| On `feat/R<NNN>` branch, item `PLANNED` or `WIP` | run `speclite-implement` |
| On branch, item `DONE` | **halt** — pre-commit gate (human runs `speclite-commit`) |
| Roadmap all `DONE` / no backlog | **halt** — nothing to do |
| Dirty tree / not-on-trunk-when-expected / branch lacks `R<NNN>` / missing item | **halt + ask** |

**Loop control (no infinite loop).** Two markers in `specs/lite/`:
- `.autopilot` — user intent, on while present. Toggled by `speclite-auto`.
- `.autopilot-halt` — transient stop signal.

Flow each turn:
1. `speclite-next` deletes any stale `.autopilot-halt` at the start of its run.
2. It decides + acts. If the decision is a halt (table above), it writes `.autopilot-halt`
   containing the reason.
3. Stop hook fires when Claude tries to end the turn. Logic:
   - `.autopilot` absent → allow stop (autopilot off).
   - `.autopilot` present **and** `.autopilot-halt` present → allow stop (loop reached a gate).
   - `.autopilot` present **and** no halt marker → block stop, inject reason
     "autopilot: run /speclite-next" so Claude continues the pipeline.

This makes every termination explicit and surfaces pause-gates to the human instead of
spinning.

**`speclite-auto` skill.** `on` → create `specs/lite/.autopilot` (and clear any halt marker
so a fresh run starts clean). `off` → remove `specs/lite/.autopilot`. Reports new state.

**Hook registration.** Add `hooks/hooks.json` declaring a `Stop` hook → bundled
`hooks/autopilot-stop.sh`. Script runs in the target repo cwd, reads the markers there,
emits the block/allow JSON. Pure bash, no deps.

**Touches:**
- `skills/speclite-next/SKILL.md` (new) — dispatcher skill, Step 0 reads system-prompt.
- `skills/speclite-auto/SKILL.md` (new) — on/off toggle.
- `hooks/autopilot-stop.sh` (new) — Stop hook script.
- `hooks/hooks.json` (new) — hook registration.
- `skills/speclite-init/SKILL.md` (mod) — git-ignore `.autopilot*` markers; mention autopilot.
- `skills/speclite-commit/SKILL.md` (mod) — clear `.autopilot-halt` semantics if needed after commit.
- `.claude-plugin/plugin.json` (mod) — bump version; declare hooks if schema requires it.
- `README.md` (mod), `docs/QUESTIONS.md` (mod) — document autopilot + the decision.
- `CLAUDE.md` (mod) — add `speclite-next`/`speclite-auto`/hook to architecture + invariants.

## Steps

- [x] Confirm Claude Code plugin Stop-hook schema (hooks.json shape, block/continue JSON
      contract, `${CLAUDE_PLUGIN_ROOT}` availability).
- [x] Write `hooks/autopilot-stop.sh`: read `.autopilot` / `.autopilot-halt`, emit allow vs
      block-with-reason JSON. Make executable.
- [x] Add `hooks/hooks.json` registering the Stop hook.
- [x] Write `skills/speclite-next/SKILL.md`: Step 0 system-prompt; state detection; decision
      table; halt-marker write on every stop path; respect existing defensive pause gates.
- [x] Write `skills/speclite-auto/SKILL.md`: `on|off` flag management + clear halt on `on`.
- [x] Update `speclite-init` to git-ignore `.autopilot*` and (optionally) note autopilot.
- [x] Bump `version` in `.claude-plugin/plugin.json`; wire hooks if required by schema.
- [x] Update `README.md`, `docs/QUESTIONS.md`, `CLAUDE.md`.

## Testing

No build — test by installing the plugin and running in a scratch repo (per CLAUDE.md):

```bash
claude plugin marketplace update speclite
claude plugin uninstall speclite
claude plugin install speclite@speclite   # restart Claude Code
```

- `/speclite-auto on` → `specs/lite/.autopilot` created. `/speclite-auto off` → removed.
- With autopilot on, from trunk with a backlog item: one trigger should plan → (Stop hook) →
  implement → (Stop hook) → **halt at pre-commit** with a visible reason. Confirm it does
  NOT commit/push/PR.
- With autopilot **off**: `speclite-next` runs one step and the session stops normally (no
  re-trigger).
- All-`DONE` roadmap → `speclite-next` halts, reports nothing to do; Stop hook allows stop.
- Force an ambiguous state (dirty tree) → `speclite-next` halts and asks; no loop.
- Unit-ish check of `autopilot-stop.sh`: run by hand with each marker combination, verify the
  allow/block JSON.

## Out of scope

- Go CLI (R007) and any binary/config-file management.
- Continuous looping across multiple roadmap items without a human checkpoint.
- Auto-commit / auto-push / auto-PR (deliberately gated to the human).
- Non-Stop hook events (PreToolUse, etc.) — only the Stop hook drives the loop.
