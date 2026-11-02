---
roadmap_id: 020
issue: n/a
---

# Plan: 020 Version discipline — single version source, bump policy, release tags

## Overview

Version never moves today: the three plugin manifests sit at `0.3.0` across 016–019 while
`package.json` drifted to `0.2.0`, and no git tags exist. Because `claude plugin update` only
re-syncs on a version bump, marketplace users never receive changes. Fix the discipline so
021 (`doctor`/`update`) and 022 (npm publish) have a real version to compare.

- One canonical version: `package.json`.
- `make bump V=x.y.z` stamps it into `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`,
  `.codex-plugin/plugin.json`.
- CI fails when any manifest drifts from `package.json`.
- Release tags `vX.Y.Z` on trunk after merge.
- Bump policy for **this repo** lives in `specs/lite/rules.md` (not in `speclite-ship`).

Notes: `research/version-management.md`.

## Acceptance criteria

- [x] `bin/version.js` (pure Node, zero deps) exists: `node bin/version.js` prints the
      canonical version; `--check` exits 0 when all manifests match `package.json`, non-zero
      with a per-file mismatch report otherwise; `--set x.y.z` writes `package.json` + all three
      manifests (rejects non-semver input, preserves other keys + 2-space formatting).
- [x] `make bump V=x.y.z` delegates to `--set`; `make version` prints; `make ci` runs `--check`.
- [x] CI installer job runs `node bin/version.js --check`; deliberately drifting a manifest
      makes it fail.
- [x] `package.json` + all manifests at one version (`0.4.0`, see open question).
- [x] `specs/lite/rules.md` states bump policy: `feat` → minor, `fix`/`perf` → patch,
      `docs`/`chore`/`ci`/`test`/`refactor`/`style` → none; bump lands in the same PR via
      `make bump`; tag `vX.Y.Z` on trunk after merge.
- [x] `CONTRIBUTING.md` documents the version source, `make bump`, `--check`, and the tag step.
- [x] `skills/speclite-ship/SKILL.md` and `templates/rules.md` unchanged (policy is
      project-local).
- [x] `make ci` passes locally.

## Open questions

- [x] Starting version — _proposed: bump to `0.4.0` now. 016–019 shipped feats without a bump,
      so the Claude cache is stuck on an old `0.3.0` build; a bump is what lets
      `claude plugin update` pick them up. Then tag `v0.4.0` after merge._
- [x] Tag creation — _proposed: manual `git tag v0.4.0 && git push origin v0.4.0` after merge,
      documented in CONTRIBUTING (plus a `make tag` helper that tags from `package.json`).
      Automated tagging/release workflow belongs to 022._

## Design

`bin/version.js` — small stdlib script, `MANIFESTS` array of the three plugin.json paths.
Read/write with `JSON.parse` / `JSON.stringify(obj, null, 2) + "\n"` (all files already use
2-space JSON; verify no diff noise beyond the version line). Semver check via simple regex
`^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$`.

`make tag`: `git tag v$(node bin/version.js) && echo "push with: git push origin v…"` — does
not push automatically.

`.claude-plugin/marketplace.json` carries no version → untouched.

**Touches:**

- `bin/version.js` (new)
- `Makefile` (mod) — `version`, `bump`, `tag` targets; `ci` runs `--check`
- `.github/workflows/ci.yml` (mod) — version check step
- `package.json` (mod) — `0.4.0`
- `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`, `.codex-plugin/plugin.json` (mod)
- `specs/lite/rules.md` (mod) — bump policy
- `CONTRIBUTING.md` (mod) — versioning section; layout lists `bin/version.js`
- `CLAUDE.md` (mod) — CI section mentions version check

## Steps

- [x] Write `bin/version.js` (print / `--check` / `--set`).
- [x] Add Makefile targets `version`, `bump`, `tag`; add check to `ci`.
- [x] Add CI step `node bin/version.js --check` to installer job.
- [x] `make bump V=0.4.0`; confirm `git diff` touches only version lines.
- [x] Add bump policy to `specs/lite/rules.md`.
- [x] Document in `CONTRIBUTING.md` + CLAUDE.md CI section.
- [x] Run `make ci`.

## Testing

```bash
node bin/version.js                 # 0.4.0
node bin/version.js --check         # exit 0
sed -i '' 's/"0.4.0"/"0.3.9"/' .cursor-plugin/plugin.json
node bin/version.js --check; echo $? # non-zero, names cursor manifest
git checkout .cursor-plugin/plugin.json
node bin/version.js --set banana; echo $?   # rejected
make ci
```

## Out of scope

- Install manifest, `doctor` / `update` / `version` subcommands (021).
- npm publish + tag-triggered release workflow (022).
- Changing `speclite-ship` or the product `templates/rules.md`.
