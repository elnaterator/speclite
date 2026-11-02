# Version management + install sync research

Backs roadmap items 020, 021, 022. Investigated Nov 2026 on a dev machine with Claude Code,
Copilot CLI, and Cursor installs.

## Problem

Users (often without the repo cloned) need one easy way to keep speclite current in every
tool, and to know they have no stale or conflicting copies.

## Findings (2026-11-02)

- Version never moved: `.claude-plugin`, `.cursor-plugin`, `.codex-plugin` all `0.3.0`
  across 016–019; `package.json` drifted to `0.2.0`. No git tags.
- Claude Code cache `~/.claude/plugins/cache/speclite/speclite/0.3.0` built from `a69af92`
  (Oct 27) — 11 commits behind `HEAD`, `speclite-init/SKILL.md` differs — yet reports the
  same version, so nothing flags it. `claude plugin update` only re-syncs on a version bump,
  so marketplace users never get changes without one.
- Cursor (`~/.cursor/plugins/local/speclite`) and Copilot (`~/.copilot/installed-plugins/`)
  matched the repo. No Codex / OpenCode / Kiro / VS Code-fallback copies present.
- Copy-based targets (Cursor, OpenCode, Kiro) record no version or sha — no way to tell
  later what is installed.

## Conflict sources `doctor` should check

- Multiple version dirs under `~/.claude/plugins/cache/speclite/speclite/`.
- `~/.claude/skills/speclite-*` dev symlinks shadowing the plugin.
- Legacy `~/.codex/skills/speclite-*` copies (pre-plugin Codex install; already pruned by
  `installCodex`, but worth reporting).
- VS Code fallback (`~/.speclite/plugins/speclite` + `chat.pluginLocations`) present
  alongside the shared Copilot install — skills load twice.
- Project-level `.claude/skills/speclite-*` copies.
- Installed version/sha older than source.

## Decisions

- **Version discipline first (020).** Without bumps, `doctor`/`update` are blind and host
  updaters (`claude plugin update`) never fire. Single source: `package.json`;
  `make bump V=x.y.z` stamps the three plugin manifests; CI fails on mismatch. Tag
  `vX.Y.Z` on trunk after merge.
- **Bump policy is project-local, not product behavior.** It lives in this repo's
  `specs/lite/rules.md` (feat → minor, fix → patch, docs/chore → none, bump in the PR).
  `speclite-ship` stays unchanged — other repos using speclite may not version at all, and
  `rules.md` already overrides skill instructions.
- **Install manifest + subcommands (021).** `~/.speclite/installs.json` records
  `{target, version, sha, source, installedAt}` per install. `update` reinstalls what the
  manifest lists (not `--all`, which filters by `detect()`). `doctor [--fix]` reports and
  prunes the conflicts above, exits non-zero on problems. `version` prints CLI + per-target
  installed versions. `speclite-status` prints plugin version + a doctor hint — still
  read-only, no network. CI dry-runs the new subcommands like it does install.
- **npm + `npx speclite@latest` (022), no global install.** `@latest` forces a registry
  check every run, so the updater itself never goes stale. `npm i -g` adds a third thing to
  keep current. `npx github:…` caches git packages and gives no version to compare.
- **Delegate, don't duplicate.** Claude / Copilot / Codex have native plugin updaters — the
  CLI shells out to them and only owns copy-based targets. Marketplaces stay registered
  against the GitHub repo at the tag, **never** the npx cache dir (temporary; breaks host
  `update` once cleared). `detectRepoRoot` already picks canonical GitHub when no `.git`.
- **Project README carries update instructions (022).** The `specs/lite/README.md` that
  `speclite-init` writes (019; template + inline fallback in `speclite-init/SKILL.md`) gets a
  short "Install / update" section: `npx speclite@latest update` and `… doctor`. Contributors
  browsing a repo learn how to get current without finding the speclite repo.
- 021 and 022 kept separate: 021 is testable locally with no npm account; 022 is release
  plumbing (publish workflow on `v*` tag, npm token secret).

## Rejected

- Global `npm i -g speclite` — self-staling updater.
- Session-start auto update check — network on every session, slows startup; on-demand
  `doctor` is enough.

## Open questions

- npm name: `speclite` free? Fallback `@elnaterator/speclite`. Check `npm view speclite`.
- Keep `npx github:elnaterator/speclite` documented for one release as a fallback.
