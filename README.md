# speclite

Lightweight **spec-driven development** for Claude Code. A roadmap of work items, a short
plan per item, one git branch per item — without the ceremony of heavier spec frameworks.

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

## Skills (v1)

| Skill | Does |
|-------|------|
| `speclite-init` | Create `specs/lite/` with roadmap, plan template + system prompt (idempotent) |
| `speclite-plan` | Pick the next backlog item, branch, write a plan, mark PLANNED |
| `speclite-implement` | Implement the branch's plan; mark WIP → DONE |
| `speclite-commit` | Plan-completeness check, commit, push, open a PR (`gh`/`bkt`) |

Branches: `<type>/R<NNN>-<slug>` (type ∈ feat, fix, chore, docs, refactor, perf, test,
build, ci, style, revert). Trunk is auto-detected via `origin/HEAD`.

## Install

v1 ships as a Claude Code plugin (no binary). It is distributed as its own marketplace
(the repo root is the marketplace), so install is two steps: register the marketplace, then
install the plugin from it.

### Local / dev install (reference this checkout)

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

### Install from GitHub (once published)

```bash
claude plugin marketplace add elnaterator/speclite   # owner/repo
claude plugin install speclite@speclite
```

### Use

In any repo, run `/speclite-init` to scaffold `specs/lite/`, add roadmap items, then
`/speclite-plan` → `/speclite-implement` → `/speclite-commit`.

### Uninstall

```bash
claude plugin uninstall speclite
claude plugin marketplace remove speclite
```

## Roadmap

speclite dogfoods itself — see [`specs/lite/roadmap.md`](./specs/lite/roadmap.md). Deferred
work: a thin Go CLI, homebrew packaging, an optional review skill, and an issue-store add-on
(GitHub Issues then Jira).

## Repo layout

```
.claude-plugin/   plugin.json, marketplace.json
skills/           one SKILL.md per skill
templates/        roadmap.md, plan-template.md, system-prompt.md (source for speclite-init)
specs/lite/       speclite's own roadmap (dogfooding)
QUESTIONS.md      design decisions + answers
```

## License

MIT


