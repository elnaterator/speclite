# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**IMPORTANT**: Always use caveman unless told not to.

## What this is

speclite = **tri-platform plugin** (Claude Code + GitHub Copilot [CLI + VS Code] + Cursor; no binary, no build step). Lightweight spec-driven development. Product = skills in markdown — each `skills/*/SKILL.md` is deliverable. No compile/lint/test toolchain. "Test" a change = install plugin, run skills in target repo. Manifests: `.claude-plugin/plugin.json` + `marketplace.json` (shared Claude-format, also read by Copilot CLI + VS Code) and `.cursor-plugin/plugin.json` (Cursor); skills/hooks/templates shared. One cross-platform installer: `bin/install.js` (pure Node, zero deps).

## The workflow it implements

Core skills form pipeline. Default: 1 roadmap item = 1 plan = 1 git branch.

- `speclite-init` — scaffold `specs/lite/` (roadmap, plan template, rules). Idempotent, never overwrites.
- `speclite-plan` — pick next backlog item, create branch, write plan, mark `PLANNED`.
- `speclite-build` — build branch's plan, mark `WIP` → `BUILT`.
- `speclite-review` (011) — review branch diff vs plan acceptance criteria + rules, flag drift (missing criteria, scope creep, unverified claims). Runs between `BUILT` and commit. Report-only by default; **conditional** (skips trivial diffs) under a loop mode; in full-auto auto-fixes failed findings and re-reviews up to a 3-attempt cap, else halts.
- `speclite-ship` — plan-completeness check, commit, push, open PR, mark `SHIPPED`.

`BUILT` = code complete, verified locally, **not merged**. `SHIPPED` = committed, pushed, PR open.

**Optional loop modes (006, 010):** `speclite-run` = state-machine dispatcher that reads roadmap+git state and runs the right next skill (init/plan/build/review), halting at gates. `speclite-mode default|semi-auto|full-auto` sets the mode (`specs/lite/.mode`). A bundled **Stop hook** (`hooks/mode-stop.sh`, registered in `hooks/hooks.json`) re-triggers `speclite-run` while the mode is a loop mode, so the pipeline self-advances. At `BUILT`, `speclite-run` runs `speclite-review` inline before the commit gate (review halts the loop on FAIL / non-convergence). **semi-auto** halts at the pre-commit gate (human runs `speclite-ship`); **full-auto** crosses it — after review passes, `speclite-run` dispatches `speclite-ship` and halts after the PR (never merges). `default` = no loop.

## Core architecture & invariants

Cross-file conventions make skills interoperate. Preserve when editing any skill:

- **Roadmap item id `<NNN>`** (bare zero-padded 3-digit, sequential, never reused) = join key across roadmap, plan filename, branch name. Branch: `<type>/<NNN>-<slug>` (type ∈ feat fix chore docs refactor perf test build ci style revert), or `<type>/<NNN>-<issue_id>-<slug>` when issue exists. Plan filename: `specs/lite/<NNN>-<slug>-plan.md`.
- **Status single source of truth = roadmap heading suffix** (` - PLANNED` / ` - WIP` / ` - BUILT` / ` - SHIPPED`; none = backlog). No duplicate status in plan frontmatter — plans carry only `roadmap_id` + `issue`.
- **`specs/lite/rules.md` read first by every skill**, overrides skill's own instructions on conflict. Step 0 of each SKILL.md enforces this.
- **Skills pause and ask user** rather than guess on state-check fails (not on trunk, dirty tree, missing/already-shipped item, branch without `<NNN>` segment). Keep defensive posture in new skills.
- **Trunk auto-detected** via `origin/HEAD`, fallback to first existing of `main`/`master`/`develop`.
- **Mode markers live in `specs/lite/`** and are git-ignored (`speclite-init` writes `specs/lite/.gitignore`): `.mode` (contents = `default`/`semi-auto`/`full-auto`, user intent; absent ⇒ `default`) and `.halt` (transient stop signal, reason as contents). `speclite-run` clears any stale `.halt` at start, writes it on every halt path; Stop hook allows stop when mode is `default`/absent OR halt present, blocks-and-continues only when mode is a loop mode + no halt. This makes every termination explicit (no infinite loop). `default`/`semi-auto` **never** auto-commit/push/PR; **full-auto** deliberately does (commit + push + open PR) but always halts after the PR — never merges.
- **Plugin hooks**: `hooks/hooks.json` auto-discovered (no plugin.json field). Stop event ignores `matcher`; command uses `"${CLAUDE_PLUGIN_ROOT}"/hooks/...`. Block-and-continue via stdout JSON `{"decision":"block","hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"…"}}` — `additionalContext` is fed to Claude, `reason` only to the user.

## Template sourcing (two-copy pattern)

`templates/` holds canonical source (`roadmap.md`, `plan-template.md`, `rules.md`). `speclite-init` copies them into target repo's `specs/lite/`, with **inline fallback** (embedded in `speclite-init/SKILL.md`) for when `CLAUDE_PLUGIN_ROOT` unavailable.

Two consequences when editing templates:
- Change template structure → update matching inline-fallback block in `speclite-init/SKILL.md` so two stay equivalent.
- Repo **dogfoods itself**: `specs/lite/` is speclite's own live roadmap/plans. After editing `templates/plan-template.md`, sync dogfood copy: `cp templates/plan-template.md specs/lite/plan-template.md`.

## Editing & testing the plugin

**One installer:** `bin/install.js` (pure Node stdlib, zero deps) drives every target via a `TARGETS` registry (`claude` / `copilot` / `cursor`). Flags: `--only <id>` (repeatable), `--all`, `--source <owner/repo|path|git-url>` (auto-detected: `.git` present → local checkout, else canonical `elnaterator/speclite`), `--dry-run`, `--uninstall`, `--list`. Makefile delegates (`make install-copilot` etc.). npx one-liner: `npx -y github:elnaterator/speclite -- --only copilot`. Add a new agent = append one `TARGETS` entry; `main()` unchanged.

**GitHub Copilot (CLI + VS Code):** one `copilot` target. `copilot plugin marketplace add <src>` + `copilot plugin install speclite@speclite` lands in the **shared** `~/.copilot/installed-plugins/<marketplace>/<plugin>/` location, which VS Code Copilot auto-discovers — one install, two surfaces. VS Code additionally needs `chat.plugins.enabled: true` (installer merges it into user `settings.json`, JSONC-tolerant, preserves other keys). Verified (copilot CLI 1.0.47): the existing `.claude-plugin/marketplace.json` is accepted **verbatim** — no `.github/` manifest, no Copilot-format fork. Fallback when no `copilot` CLI but VS Code present: copy + register `chat.pluginLocations`. Stop hook works because speclite stays Claude-format; VS Code ignores hook matchers.

**Claude Code:** copies plugin into cache on install — no symlink, so source edits not picked up live. Test in-progress changes:

```bash
claude plugin marketplace update speclite   # re-read this directory
claude plugin uninstall speclite
claude plugin install speclite@speclite     # reinstall picks up edits; restart Claude Code
```

`claude plugin update` only re-syncs when `version` in `.claude-plugin/plugin.json` bumped, so uninstall+reinstall loop = reliable dev path. For pure skill iteration, symlink skill dirs into `~/.claude/skills/` to load directly without plugin wrapper.

**Cursor:** symlink repo to `~/.cursor/plugins/local/speclite` for live edits; Developer: Reload Window after changes. No marketplace.json needed (single-plugin repo). (`node bin/install.js --only cursor` does a one-shot copy.)

Repo layout: `.claude-plugin/` (shared Claude-format manifest + marketplace, read by Claude/Copilot/VS Code), `.cursor-plugin/` (Cursor manifest), `bin/install.js` + `package.json` (installer + npx), shared `skills/`, `hooks/`, `templates/`.

## Conventions in this repo

- Commit scope = roadmap id: `<type>(<NNN>): <summary>`.
- `docs/QUESTIONS.md` records design decisions + rationale; `docs/design.md` = original prompt-flow sketch. Consult before reworking workflow semantics.
