# speclite

**Spec-driven development without the ceremony.** A roadmap of work items, a short plan per
item, one git branch per item — driven by a handful of slash-command skills. No binary, no build step, no config sprawl. Just
markdown and git.

You write a one-line roadmap item; speclite plans it, branches it, builds it, and opens the
PR — pausing at every gate where a human should look.

```
/speclite-init   scaffold specs/lite/
/speclite-plan   pick next item → branch → write a plan
/speclite-build  build it → mark BUILT
/speclite-ship   commit, push, open a PR
```

## What it does

| Skill | Does |
|-------|------|
| `speclite-init` | Create `specs/lite/` with roadmap, plan template + rules (idempotent) |
| `speclite-plan` | Pick the next backlog item, branch, write a plan, mark PLANNED |
| `speclite-build` | Build the branch's plan; mark WIP → BUILT |
| `speclite-review` | Review the branch diff vs the plan's acceptance criteria; flag drift |
| `speclite-ship` | Plan-completeness check, commit, push, open a PR, mark SHIPPED |
| `speclite-run` | Dispatcher: read state, run the right next skill, halt at gates |
| `speclite-mode` | Set the mode: default / semi-auto / full-auto |
| `speclite-status` | Read-only: print pipeline state + a dry-run of what `run` would do |

Each work item moves through a simple lifecycle, with **status stored as the roadmap heading
suffix** (the single source of truth):

```
(backlog) → PLANNED → WIP → BUILT → SHIPPED
```

`BUILT` means code complete and verified locally — **not merged**. `SHIPPED` means committed,
pushed, PR open. Default is 1 roadmap item =
1 plan = 1 branch (`<type>/<NNN>-<slug>`), but the skills stay flexible to your request.

## Install

speclite is a single plugin for **Claude Code**, **GitHub Copilot** (CLI + VS Code), and
**Cursor**. One cross-platform installer ([`bin/install.js`](./bin/install.js), pure Node, zero
deps) handles every target — no clone needed:

```bash
# install for every agent detected on your machine:
npx -y github:elnaterator/speclite -- --all

# or a single agent (claude | copilot | cursor):
npx -y github:elnaterator/speclite -- --only copilot
```

See [docs/INSTALL.md](./docs/INSTALL.md) for per-agent setup, the Makefile flow, preview flags,
and the compatibility matrix.

## Usage

In any repo, scaffold the workspace, add a roadmap item, then run the pipeline:

```bash
/speclite-init        # creates specs/lite/ (roadmap, plan-template, rules)
# edit specs/lite/roadmap.md — add a one-line item under a `## 00N <title>` heading
/speclite-plan        # picks the item, makes a branch, writes specs/lite/00N-<slug>-plan.md
/speclite-build       # builds the plan on that branch, marks the item BUILT
/speclite-ship        # commits, pushes, opens a PR
```

Not sure what's next? `/speclite-run` reads the roadmap + git state and runs the right step.

## Loop modes (optional)

By default you drive the pipeline one skill at a time. A loop mode chains them for you. Pick a
mode with `/speclite-mode` (stored in `specs/lite/.mode`):

```bash
/speclite-mode semi-auto   # loop, but halt before commit (you run /speclite-ship)
/speclite-mode full-auto   # loop AND auto commit + push + open PR, halt after the PR
/speclite-mode default     # off — drive the pipeline manually
/speclite-run              # plan → (Stop hook) → build → halt at the gate for your mode
```

- `speclite-run` is a pure **state-machine dispatcher** over the roadmap status plus git
  state. Each run advances the pipeline by one step or **halts**.
- A bundled **Stop hook** (`hooks/mode-stop.sh`) re-triggers `speclite-run` after each
  step while the mode is `semi-auto`/`full-auto` and no halt marker is set.
- **semi-auto** never commits, pushes, or opens a PR — it halts at the pre-commit gate (item
  `BUILT`); you run `/speclite-ship`. **full-auto** crosses that gate: `speclite-run`
  dispatches `/speclite-ship` at `BUILT` and halts after the PR is opened (it never merges).
  Setting full-auto warns you of that risk first.
- Either mode halts and asks on any ambiguous or unsafe state (dirty tree, off-trunk, branch
  without `<NNN>`, missing item).
- No infinite loop: every halt writes `specs/lite/.halt`, which tells the Stop hook
  to let the session end. Both markers are git-ignored.

## How it's laid out

```
specs/lite/
  roadmap.md            # ordered items, ids 001, 002, … status in the title suffix
  plan-template.md      # template for per-item plans
  rules.md              # per-project instructions every skill reads first (overrides defaults)
  00N-<slug>-plan.md    # one plan per item being worked
```

Branches follow `<type>/<NNN>-<slug>` (type ∈ feat, fix, chore, docs, refactor, perf, test,
build, ci, style, revert). Trunk is auto-detected via `origin/HEAD`.

## Contributing

speclite dogfoods itself — its own roadmap lives in
[`specs/lite/roadmap.md`](./specs/lite/roadmap.md). For dev install/iteration loops, the
template two-copy pattern, core invariants, and conventions, see
[CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
