---
roadmap_id: 021
issue: n/a
---

# Plan: 021 Installer install-manifest + version / doctor / update

## Overview

Installer forgets what it installed. Copy-based targets (Cursor, OpenCode, Kiro, VS Code
fallback) record no version/sha; Claude cache can sit 11 commits stale under same version.
Users need one way to see what is installed, find stale/conflicting copies, and refresh.
Notes: `research/version-management.md`.

In scope:

- Install manifest `~/.speclite/installs.json` — one entry per target:
  `{target, version, sha, source, installedAt}`. Written on real install, entry dropped on
  uninstall. Never written on `--dry-run`.
- Subcommands on `bin/install.js` (flag-only invocation keeps working as install):
  - `version` — CLI version (`package.json`) + per-target installed version/sha/date.
  - `doctor [--fix]` — report stale or conflicting copies; `--fix` prunes the safe ones;
    exit 1 when unresolved problems remain.
  - `update` — reinstall exactly the targets in the manifest (not `detect()`).
- `speclite-status` prints the installed plugin version + a `doctor` hint (read-only, no
  network).
- CI dry-runs the new subcommands.

## Acceptance criteria

- [x] Real install of any target writes/updates its manifest entry with version, sha (or
      `null` when source has no `.git`), source, ISO `installedAt`; `--uninstall` removes it.
- [x] `--dry-run` never creates or modifies `installs.json`.
- [x] `SPECLITE_HOME` env overrides `~/.speclite` (tests + CI use a temp dir).
- [x] `node bin/install.js version` prints CLI version and each manifest entry; "no
      installs recorded" when empty; exit 0.
- [x] `doctor` checks: multiple Claude cache version dirs; `~/.claude/skills/speclite-*`
      shadows; legacy `~/.codex/skills/speclite-*`; VS Code fallback dir/`chat.pluginLocations`
      alongside a Copilot CLI install; project `.claude/skills/speclite-*` in cwd; manifest
      entry older than source version (or sha differs); manifest entry whose install path is
      gone. Each finding names path + fix. Exit 0 clean, 1 on problems.
- [x] `doctor --fix` removes: non-current Claude cache version dirs, legacy Codex copies,
      VS Code fallback when Copilot CLI install present, stale manifest entries. Reports (not
      deletes) dev symlinks and project-level copies. Respects `--dry-run`.
- [x] `update` reinstalls each manifest target via its `install()`; empty manifest → message,
      exit 0; `--dry-run` previews.
- [x] Old flag forms (`--only`, `--all`, `--list`, `--uninstall`, `--dry-run`) behave
      unchanged; `make ci` passes.
- [x] `speclite-status` report includes plugin version line + `doctor` hint, still read-only.
- [x] CI runs `version`, `doctor`, `update --dry-run` with temp `SPECLITE_HOME`.
- [x] Help text, README install section, docs/INSTALL.md, Makefile targets document new
      subcommands. Version bumped `0.4.0` → `0.5.0` (`feat` → minor per rules).

## Design

Subcommand = first non-flag argv token (`version` | `doctor` | `update`); none → current
install flow. `parseArgs` gains `opts.cmd` + `--fix`.

Manifest helpers (same file, stdlib only):

```js
const SPECLITE_HOME = () => process.env.SPECLITE_HOME || path.join(os.homedir(), ".speclite");
const MANIFEST = () => path.join(SPECLITE_HOME(), "installs.json");
// { "schema": 1, "installs": { "<target>": { target, version, sha, source, installedAt } } }
readManifest() / recordInstall(t, ctx) / forgetInstall(t, ctx)
```

`main()` calls `recordInstall` after each successful non-dry `install()`, `forgetInstall`
after `uninstall()`. Version from `package.json` in `repoRoot`; sha from
`git -C repoRoot rev-parse HEAD` when `.git` exists.

Each TARGET gains optional `installedPath()` (Cursor dir, OpenCode/Kiro skills dir, Copilot
installed-plugins dir, Claude cache dir) used by doctor's "path gone" check. Hosts with
native updaters (Claude, Copilot, Codex) keep delegating — `update` just re-runs `install()`
which already shells out to them.

Doctor = list of `{id, find(ctx) → findings[], fix?(finding, ctx)}` checks; finding =
`{msg, path, fixable}`. Print grouped, then summary line. Exit code from unfixed findings.

`speclite-status`: add a read-only step reading version from
`${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` (fallback: `~/.speclite/installs.json`,
else "unknown"), print `speclite <ver>` + hint `run \`npx -y github:elnaterator/speclite --
doctor\` to check for stale copies`.

**Touches:** `bin/install.js` (mod), `skills/speclite-status/SKILL.md` (mod),
`.github/workflows/ci.yml` (mod), `Makefile` (mod), `README.md` (mod),
`docs/INSTALL.md` (mod), `CLAUDE.md` (mod), `package.json` + 3 plugin manifests (mod, via
`make bump V=0.5.0`).

## Steps

- [x] Add manifest helpers + `SPECLITE_HOME`; hook record/forget into `main()`.
- [x] Add `installedPath()` to targets.
- [x] Subcommand parsing + `--fix`; update HELP.
- [x] Implement `version`.
- [x] Implement `doctor` checks + `--fix`.
- [x] Implement `update`.
- [x] Update `speclite-status` SKILL.md.
- [x] CI steps + Makefile `doctor` / `update` targets.
- [x] Docs: README, docs/INSTALL.md, CLAUDE.md editing section.
- [x] `make bump V=0.5.0`.

## Testing

```bash
export SPECLITE_HOME=$(mktemp -d)
node bin/install.js version                       # "no installs recorded"
node bin/install.js --only cursor --dry-run       # no installs.json created
test ! -f "$SPECLITE_HOME/installs.json"
node bin/install.js --only cursor                 # real copy (local, safe)
node bin/install.js version                       # shows cursor entry w/ sha
node bin/install.js doctor; echo "exit $?"
node bin/install.js update --dry-run
node bin/install.js --only cursor --uninstall && node bin/install.js version
make ci
```

Plus `doctor` on this dev machine to confirm it flags the stale Claude cache noted in
research.

As built: `--fix` paths were exercised with both `HOME` and `SPECLITE_HOME` pointed at a
temp dir seeded with fake stale copies (old cache dir, legacy Codex skill, dev shadow,
vanished manifest entry) so nothing in the real home is touched. `make ci` runs `version` +
`update --dry-run` against a temp manifest but not `doctor` — locally it reads the real home
and would fail on a dev machine with stale copies; CI runs `doctor` on the bare runner, where
it must exit 0. Stale-cache findings for Claude/Codex hint `--only <id>` rather than
`update`, since pre-manifest installs are not in the record.

## Out of scope

- npm publish / `npx speclite@latest` / release workflow (022).
- README update section written by `speclite-init` (022).
- Network update checks; auto-update at session start (rejected in research).
- Migrating pre-manifest installs beyond doctor reporting them (next install records them).
