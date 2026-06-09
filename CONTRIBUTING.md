# Contributing to speclite

speclite is a **dual-platform plugin** (Claude Code + Cursor) with no binary and no build
step. The product is the skills themselves — each `skills/*/SKILL.md` is a deliverable.
There is no compile/lint/test toolchain; "testing" a change means installing the plugin and
running the skills against a target repo.

## Repo layout

```
.claude-plugin/   Claude Code: plugin.json, marketplace.json
.cursor-plugin/   Cursor: plugin.json
skills/           one SKILL.md per skill (shared — both platforms discover here)
hooks/            hooks.json + autopilot-stop.sh (Stop hook for autopilot)
templates/        roadmap.md, plan-template.md, system-prompt.md (source for speclite-init)
specs/lite/       speclite's own roadmap (dogfooding)
docs/             QUESTIONS.md (design decisions + rationale), design.md (prompt-flow sketch)
```

## Dev install & iteration

### Claude Code

Claude Code **copies** the plugin into its cache on install — it does **not** symlink to your
checkout, so source edits are **not** picked up live. After editing skills/templates, re-sync
the cache:

```bash
claude plugin marketplace update speclite   # re-read this directory
claude plugin uninstall speclite
claude plugin install speclite@speclite     # reinstall picks up the edits
```

Then restart Claude Code to load the refreshed skills.

> `claude plugin update speclite` only re-syncs when `version` in `plugin.json` is bumped, so
> the uninstall+reinstall loop is the reliable way to test in-progress changes.

For pure skill iteration without the plugin wrapper, symlink the skill dirs into
`~/.claude/skills/` — they load directly, no marketplace needed.

### Cursor

Cursor loads local plugins from `~/.cursor/plugins/local/` and **does** follow symlinks, so
edits are live:

```bash
ln -sf "$(pwd)" ~/.cursor/plugins/local/speclite
```

Run **Developer: Reload Window** after changes. No `marketplace.json` is needed (single-plugin
repo).

## Editing templates (two-copy pattern)

`templates/` holds the canonical source (`roadmap.md`, `plan-template.md`, `system-prompt.md`).
`speclite-init` copies them into a target repo's `specs/lite/`, with an **inline fallback**
embedded in `skills/speclite-init/SKILL.md` for when `CLAUDE_PLUGIN_ROOT` is unavailable.

Two consequences when editing templates:

- Change a template's structure → update the matching inline-fallback block in
  `speclite-init/SKILL.md` so the two stay equivalent.
- The repo **dogfoods itself** — `specs/lite/` is speclite's own live roadmap/plans. After
  editing `templates/plan-template.md`, sync the dogfood copy:
  ```bash
  cp templates/plan-template.md specs/lite/plan-template.md
  ```

## Core invariants

Cross-file conventions make the skills interoperate. Preserve these when editing any skill:

- **Roadmap item id `R<NNN>`** (zero-padded, sequential, never reused) is the join key across
  roadmap, plan filename, and branch name. Branch: `<type>/R<NNN>-<slug>`
  (type ∈ feat fix chore docs refactor perf test build ci style revert), or
  `<type>/R<NNN>-<issue_id>-<slug>` when an issue exists. Plan: `specs/lite/<NNN>-<slug>-plan.md`.
- **Status single source of truth = roadmap heading suffix** (` - PLANNED` / ` - WIP` /
  ` - DONE`; none = backlog). No duplicate status in plan frontmatter.
- **`specs/lite/system-prompt.md` is read first by every skill** and overrides a skill's own
  instructions on conflict (Step 0 of each SKILL.md).
- **Skills pause and ask** rather than guess on state-check fails (not on trunk, dirty tree,
  missing/already-DONE item, branch without an `R<NNN>` segment).
- **Trunk auto-detected** via `origin/HEAD`, fallback to first existing of `main`/`master`/`develop`.
- **Autopilot markers** live in `specs/lite/` and are git-ignored: `.autopilot` (presence =
  enabled) and `.autopilot-halt` (transient stop signal). Autopilot **never** auto-commits.

See `docs/QUESTIONS.md` for design decisions + rationale and `docs/design.md` for the original
prompt-flow sketch — consult these before reworking workflow semantics.

## Conventions

- Commit scope = roadmap id: `<type>(R<NNN>): <summary>`.
- One roadmap item = one plan = one branch (default; skills stay flexible to your request).
- Record design decisions in `docs/QUESTIONS.md`.
