# Contributing to speclite

speclite is a **tri-platform plugin** (Claude Code + GitHub Copilot + Cursor) with no binary
and no build step. The product is the skills themselves — each `skills/*/SKILL.md` is a
deliverable. There is no compile/lint/test toolchain; "testing" a change means installing the
plugin and running the skills against a target repo.

## Repo layout

```
.claude-plugin/   Claude Code + Copilot CLI + VS Code: plugin.json, marketplace.json (shared Claude-format)
.cursor-plugin/   Cursor: plugin.json
bin/install.js    cross-platform installer (pure Node, zero deps; target registry)
package.json      minimal; "bin" entry enables the npx one-liner
skills/           one SKILL.md per skill (shared — all platforms discover here)
hooks/            hooks.json + autopilot-stop.sh (Stop hook for autopilot)
templates/        roadmap.md, plan-template.md, system-prompt.md (source for speclite-init)
specs/lite/       speclite's own roadmap (dogfooding)
docs/             QUESTIONS.md (design decisions + rationale), design.md (prompt-flow sketch)
```

## Dev install & iteration

All installs go through one cross-platform script, `bin/install.js` (pure Node stdlib, zero
deps). Run it from your checkout — the same command end users run, just with the source
auto-detected to your local working tree (a `.git` dir means "install from here"):

```bash
node bin/install.js --only copilot     # or: make install-copilot
node bin/install.js --only claude      # source auto-detects the local checkout
node bin/install.js --only cursor
node bin/install.js --all --dry-run    # preview every detected target
node bin/install.js --source .         # be explicit about the local source
node bin/install.js --list             # show targets + detection status
```

Add a new agent target = append one descriptor `{ id, label, detect, install, uninstall }` to
the `TARGETS` table in `bin/install.js` plus its functions; `main()` never changes.

### Claude Code

Claude Code **copies** the plugin into its cache on install — it does **not** symlink to your
checkout, so source edits are **not** picked up live. After editing skills/templates, re-sync
the cache:

```bash
claude plugin marketplace update speclite   # re-read this directory
claude plugin uninstall speclite
claude plugin install speclite@speclite     # reinstall picks up the edits
# (or just: node bin/install.js --only claude)
```

Then restart Claude Code to load the refreshed skills.

> `claude plugin update speclite` only re-syncs when `version` in `plugin.json` is bumped, so
> the uninstall+reinstall loop is the reliable way to test in-progress changes.

For pure skill iteration without the plugin wrapper, symlink the skill dirs into
`~/.claude/skills/` — they load directly, no marketplace needed.

### GitHub Copilot (CLI + VS Code)

The `copilot` CLI **copies** the plugin into `~/.copilot/installed-plugins/` (same shared
location VS Code Copilot auto-discovers), so source edits are **not** live — re-run
`node bin/install.js --only copilot` after changes. The installer also sets
`chat.plugins.enabled: true` in VS Code user settings; Reload Window to pick up skill changes.
Verify with `copilot plugin list` (CLI) and **Chat → Configure Skills** (VS Code).

### Cursor

Cursor loads local plugins from `~/.cursor/plugins/local/` and **does** follow symlinks, so
edits are live:

```bash
ln -sf "$(pwd)" ~/.cursor/plugins/local/speclite
```

(`node bin/install.js --only cursor` instead does a one-shot copy.) Run **Developer: Reload
Window** after changes. No `marketplace.json` is needed (single-plugin repo).

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
- **Autopilot markers** live in `specs/lite/` and are git-ignored: `.mode` (contents =
  `default`/`semi-auto`/`full-auto`, set via `/speclite-mode`) and `.autopilot-halt`
  (transient stop signal). `default`/`semi-auto` **never** auto-commit; `full-auto` auto
  commits + pushes + opens a PR, then halts after the PR (never merges).

See `docs/QUESTIONS.md` for design decisions + rationale and `docs/design.md` for the original
prompt-flow sketch — consult these before reworking workflow semantics.

## Conventions

- Commit scope = roadmap id: `<type>(R<NNN>): <summary>`.
- One roadmap item = one plan = one branch (default; skills stay flexible to your request).
- Record design decisions in `docs/QUESTIONS.md`.
