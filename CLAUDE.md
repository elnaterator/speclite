# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

speclite = **Claude Code plugin** (no binary, no build step). Lightweight spec-driven development. Product = skills in markdown — each `skills/*/SKILL.md` is deliverable. No compile/lint/test toolchain. "Test" a change = install plugin, run skills in target repo.

## The workflow it implements

Four skills form pipeline. Default: 1 roadmap item = 1 plan = 1 git branch.

- `speclite-init` — scaffold `specs/lite/` (roadmap, plan template, system prompt). Idempotent, never overwrites.
- `speclite-plan` — pick next backlog item, create branch, write plan, mark `PLANNED`.
- `speclite-implement` — implement branch's plan, mark `WIP` → `DONE`.
- `speclite-commit` — plan-completeness check, commit, push, open PR.

`DONE` = code complete, verified locally, **not merged**.

## Core architecture & invariants

Cross-file conventions make skills interoperate. Preserve when editing any skill:

- **Roadmap item id `R<NNN>`** (zero-padded 3-digit, sequential, never reused) = join key across roadmap, plan filename, branch name. Branch: `<type>/R<NNN>-<slug>` (type ∈ feat fix chore docs refactor perf test build ci style revert), or `<type>/R<NNN>-<issue_id>-<slug>` when issue exists. Plan filename: `specs/lite/<NNN>-<slug>-plan.md`.
- **Status single source of truth = roadmap heading suffix** (` - PLANNED` / ` - WIP` / ` - DONE`; none = backlog). No duplicate status in plan frontmatter — plans carry only `roadmap_id` + `issue`.
- **`specs/lite/system-prompt.md` read first by every skill**, overrides skill's own instructions on conflict. Step 0 of each SKILL.md enforces this.
- **Skills pause and ask user** rather than guess on state-check fails (not on trunk, dirty tree, missing/already-DONE item, branch without `R<NNN>` segment). Keep defensive posture in new skills.
- **Trunk auto-detected** via `origin/HEAD`, fallback to first existing of `main`/`master`/`develop`.

## Template sourcing (two-copy pattern)

`templates/` holds canonical source (`roadmap.md`, `plan-template.md`, `system-prompt.md`). `speclite-init` copies them into target repo's `specs/lite/`, with **inline fallback** (embedded in `speclite-init/SKILL.md`) for when `CLAUDE_PLUGIN_ROOT` unavailable.

Two consequences when editing templates:
- Change template structure → update matching inline-fallback block in `speclite-init/SKILL.md` so two stay equivalent.
- Repo **dogfoods itself**: `specs/lite/` is speclite's own live roadmap/plans. After editing `templates/plan-template.md`, sync dogfood copy: `cp templates/plan-template.md specs/lite/plan-template.md`.

## Editing & testing the plugin

Claude Code copies plugin into cache on install — no symlink, so source edits not picked up live. Test in-progress changes:

```bash
claude plugin marketplace update speclite   # re-read this directory
claude plugin uninstall speclite
claude plugin install speclite@speclite     # reinstall picks up edits; restart Claude Code
```

`claude plugin update` only re-syncs when `version` in `.claude-plugin/plugin.json` bumped, so uninstall+reinstall loop = reliable dev path. For pure skill iteration, symlink skill dirs into `~/.claude/skills/` to load directly without plugin wrapper.

Repo is own marketplace (root = marketplace, see `.claude-plugin/marketplace.json`); plugin manifest = `.claude-plugin/plugin.json`.

## Conventions in this repo

- Commit scope = roadmap id: `<type>(R<NNN>): <summary>`.
- `docs/QUESTIONS.md` records design decisions + rationale; `docs/design.md` = original prompt-flow sketch. Consult before reworking workflow semantics.