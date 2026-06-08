# speclite

Lightweight **spec-driven development** for Claude Code and Cursor. A roadmap of work
items, a short plan per item, one git branch per item — without the ceremony of heavier
spec frameworks.

## Concept

```
specs/lite/
  roadmap.md            # ordered items, ids R001, R002, … status in title suffix
  plan-template.md      # template for per-item plans
  system-prompt.md      # per-project instructions every skill reads first (overrides defaults)
  001-<slug>-plan.md    # one plan per item being worked
```

Item lifecycle (status = roadmap title suffix):

```
(backlog) → PLANNED → WIP → DONE
```

`DONE` means code complete and verified locally — not merged.

Workflow: **init → plan → implement → commit**. Default is 1 roadmap item = 1 plan =
1 branch, but the skills stay flexible to your request.

## Skills

| Skill | Does |
|-------|------|
| `speclite-init` | Create `specs/lite/` with roadmap, plan template + system prompt (idempotent) |
| `speclite-plan` | Pick the next backlog item, branch, write a plan, mark PLANNED |
| `speclite-implement` | Implement the branch's plan; mark WIP → DONE |
| `speclite-commit` | Plan-completeness check, commit, push, open a PR (`gh`/`bkt`) |
| `speclite-next` | Dispatcher: read state, run the right next skill (init/plan/implement), halt at gates |
| `speclite-auto` | Toggle autopilot on/off (the Stop-hook enable flag) |

Branches: `<type>/R<NNN>-<slug>` (type ∈ feat, fix, chore, docs, refactor, perf, test,
build, ci, style, revert). Trunk is auto-detected via `origin/HEAD`.

## Autopilot (optional)

By default you drive the pipeline one skill at a time. Autopilot chains them for you:

```bash
/speclite-auto on     # create specs/lite/.autopilot, the enable flag
/speclite-next        # start: plan → (Stop hook) → implement → halt at pre-commit gate
/speclite-auto off    # stop the loop
```

- `speclite-next` is a pure **state-machine dispatcher** over the roadmap status (the single
  source of truth) plus git state. Each run advances the pipeline by one step or **halts**.
- A bundled **Stop hook** (`hooks/autopilot-stop.sh`) re-triggers `speclite-next` after each
  step while the enable flag is present and no halt marker is set.
- Autopilot **never** commits, pushes, or opens a PR. It halts at the pre-commit gate (item
  `DONE`); you run `/speclite-commit` yourself. It also halts and asks on any ambiguous or
  unsafe state (dirty tree, off-trunk, branch without `R<NNN>`, missing item).
- No infinite loop: every halt writes `specs/lite/.autopilot-halt`, which tells the Stop hook
  to let the session end. Both markers are git-ignored.

## Install

v1 ships as a plugin (no binary) for **Claude Code** and **Cursor**. Skills, hooks, and
templates are shared; each platform has its own manifest at repo root (`.claude-plugin/` vs
`.cursor-plugin/`).

### Claude Code

Claude Code distributes plugins via marketplaces. This repo is its own marketplace, so install
is two steps: register the marketplace, then install the plugin from it.

#### Local / dev install (reference this checkout)

Point Claude Code at this directory as a marketplace, then install:

```bash
claude plugin marketplace add {path_to_speclite_repo}
claude plugin install speclite@speclite     # plugin@marketplace
```

Verify:

```bash
claude plugin list           # speclite@speclite → enabled
claude plugin details speclite
```

> **Note on "dev mode":** Claude Code copies the plugin into its cache on install — it does
> **not** symlink to this directory, so source edits are **not** picked up live. After
> editing skills/templates here, re-sync the cache:
>
> ```bash
> claude plugin marketplace update speclite   # re-read this directory
> claude plugin uninstall speclite
> claude plugin install speclite@speclite     # reinstall picks up the edits
> ```
>
> (`claude plugin update speclite` only re-syncs when `version` in `plugin.json` is bumped,
> so the uninstall+reinstall loop is the reliable way to test in-progress changes. Restart
> Claude Code to load the refreshed skills.)

For pure skill iteration without the plugin wrapper, you can instead symlink the skill dirs
into `~/.claude/skills/` — they load directly, no marketplace needed.

#### Install from GitHub (once published)

```bash
claude plugin marketplace add elnaterator/speclite   # owner/repo
claude plugin install speclite@speclite
```

#### Uninstall

```bash
claude plugin uninstall speclite
claude plugin marketplace remove speclite
```

### Cursor

Cursor loads local plugins from `~/.cursor/plugins/local/`. Symlink this repo for live
edits (unlike Claude Code's cache-copy model):

```bash
ln -sf "$(pwd)" ~/.cursor/plugins/local/speclite
```

Then **Developer: Reload Window** in Cursor. Verify in **Settings → Rules** that speclite
skills appear (Agent Decides section). In any repo, run `/speclite-init` to scaffold
`specs/lite/`, add roadmap items, then `/speclite-plan` → `/speclite-implement` →
`/speclite-commit`.

To remove the local install, delete the symlink:

```bash
rm ~/.cursor/plugins/local/speclite
```

### Use

In any repo (Claude Code or Cursor), run `/speclite-init` to scaffold `specs/lite/`, add
roadmap items, then `/speclite-plan` → `/speclite-implement` → `/speclite-commit`.

## Roadmap

speclite dogfoods itself — see [`specs/lite/roadmap.md`](./specs/lite/roadmap.md). Deferred
work: a thin Go CLI, homebrew packaging, an optional review skill, and an issue-store add-on
(GitHub Issues then Jira).

## Repo layout

```
.claude-plugin/   Claude Code: plugin.json, marketplace.json
.cursor-plugin/   Cursor: plugin.json
skills/           one SKILL.md per skill (shared — both platforms discover here)
hooks/            hooks.json + autopilot-stop.sh (Stop hook for autopilot)
templates/        roadmap.md, plan-template.md, system-prompt.md (source for speclite-init)
specs/lite/       speclite's own roadmap (dogfooding)
docs/QUESTIONS.md design decisions + answers
```

## License

MIT


