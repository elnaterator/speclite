---
roadmap_id: 022
issue: n/a
---

# Plan: 022 Publish to npm — `npx speclite@latest <cmd>` (+ README rewrite)

## Overview

Users without a clone run the installer via `npx -y github:elnaterator/speclite -- …` today:
long, cached by npx (can go stale), no version to compare. Publish the installer as the npm
package `speclite` so one always-current command works: `npx speclite@latest <cmd>`.
`@latest` forces a registry check every run, so the updater never goes stale. Notes:
`research/version-management.md`.

User asked to fold the top-level README rework into this item: the README explains
internals before value and splits the first-run path across sections.

In scope:

- npm package `speclite` (name verified free 2026-11-02): `bin.speclite` → `bin/install.js`,
  `files` whitelist carrying everything the installer copies, `npm pack` sanity in CI.
- Release workflow: on `v*` tag push, verify tag == `package.json` version, run checks,
  `npm publish --provenance`.
- Swap every user-facing `npx -y github:elnaterator/speclite -- …` for
  `npx speclite@latest …`; keep the GitHub form documented once as a fallback.
- `specs/lite/README.md` written by `speclite-init` gains a short "Install / update" section
  (template + inline fallback + dogfood copy).
- Top-level README rewrite (outline below); loop internals move to new `docs/LOOP.md`.

## Acceptance criteria

- [x] `package.json`: `bin` has `speclite` (keep `speclite-install` alias), `files`
      whitelist, `publishConfig.access: public`, description lists all 6 agents.
- [x] `npm pack --dry-run` lists `bin/`, `skills/`, `hooks/`, `templates/`,
      `plugins/opencode/`, `.claude-plugin/`, `.cursor-plugin/`, `.codex-plugin/`, README,
      LICENSE; no `specs/`, `research/`, `docs/`, `.github/`.
- [x] Installed from the packed tarball (`npm i -g ./speclite-*.tgz` into a temp prefix, or
      `npx ./speclite-*.tgz`), `speclite --list`, `speclite version`, `speclite --only cursor
      --dry-run` work and resolve source to canonical `elnaterator/speclite` (no `.git`).
- [x] `.github/workflows/release.yml`: trigger `push: tags: ['v*']`; fails if tag ≠
      `v$(package.json version)`; runs version check + installer dry-run; publishes with
      `--provenance` using `NPM_TOKEN` secret; `permissions: id-token: write, contents: read`.
- [x] CI gains an `npm pack --dry-run` step.
- [x] No user-facing doc or help text still leads with `npx -y github:…` (one fallback mention
      allowed in docs/INSTALL.md).
- [x] `templates/specs-lite-readme.md`, the inline fallback in `speclite-init/SKILL.md`, and
      `specs/lite/README.md` all carry the same "Install / update" section
      (`npx speclite@latest --all`, `… update`, `… doctor`).
- [x] README follows the new outline; first screen = pitch, why, quick start; loop internals
      live in `docs/LOOP.md` (nothing dropped); README links to it.
- [x] `rules.md` gets the release step (push tag → workflow publishes).
- [x] Version `0.5.0` → `0.6.0` (feat → minor). `make ci` passes.

## Open questions

- [x] Auth for publish — _proposed: `NPM_TOKEN` repo secret (automation token) + provenance.
      npm trusted publishing (OIDC, no token) needs the package to exist first; switch later._
- [x] First publish — _proposed: workflow does it on `v0.6.0`; user adds `NPM_TOKEN` secret
      before pushing the tag. PR body calls this out._
- [x] Marketplace pin to tag — _proposed: no; host CLIs keep tracking the GitHub repo default
      branch (trunk == latest release in practice). Revisit if trunk gets ahead of releases._

## Design

**Package contents.** Copy targets copy from `repoRoot` = the unpacked package, so the
tarball must hold everything `COPY_EXCLUDES` does not drop. CLI targets (Claude, Copilot,
Codex) register `elnaterator/speclite` because the package has no `.git` —
`resolveSource` already does this.

**README outline:**

1. Title, pitch, 2-sentence problem/answer, badges (CI + npm version).
2. Why speclite — agent stays on intent (plan + acceptance criteria), state survives context
   loss (git + markdown), you review at gates, zero infra; works in existing repos.
3. Quick start — install, `/speclite-init`, `/speclite-roadmap` add an item, `/speclite-run`;
   what you end up with.
4. What you get — short roadmap excerpt + plan excerpt + lifecycle line.
5. Skills — existing table.
6. Autopilot (loop modes) — 3-row mode table, guarantees list, link to `docs/LOOP.md`.
7. Platforms — table: agent / install id / auto-loop support.
8. Keeping current — `update` / `doctor`.
9. Customize — `rules.md` examples.
10. FAQ — existing repo, team use, Bitbucket, token cost of loops, vs heavier spec tools.
11. Contributing / License.

**Touches:** `package.json` (mod), `.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`,
`.codex-plugin/plugin.json` (mod, bump), `.github/workflows/release.yml` (new),
`.github/workflows/ci.yml` (mod), `bin/install.js` (mod, help/examples), `README.md` (mod),
`docs/LOOP.md` (new), `docs/INSTALL.md` (mod), `CLAUDE.md` (mod),
`skills/speclite-status/SKILL.md` (mod), `templates/specs-lite-readme.md` (mod),
`skills/speclite-init/SKILL.md` (mod), `specs/lite/README.md` (mod), `specs/lite/rules.md`
(mod), `Makefile` (mod, `pack` target).

## Steps

- [x] `package.json`: bin, files, publishConfig, description, keywords.
- [x] `npm pack --dry-run` + tarball smoke test from a temp dir.
- [x] `release.yml` + CI `npm pack --dry-run` step + Makefile `pack`.
- [x] Swap npx commands in installer help, docs/INSTALL.md, CLAUDE.md, status skill.
- [x] Init README "Install / update" section: template, inline fallback, dogfood copy.
- [x] Move loop internals to `docs/LOOP.md`; rewrite README to outline.
- [x] `rules.md` release step.
- [x] `make bump V=0.6.0`; `make ci`.

## Testing

```bash
make ci
npm pack --dry-run
tmp=$(mktemp -d) && npm pack --pack-destination "$tmp" && cd "$tmp" \
  && SPECLITE_HOME="$tmp/home" npx -y ./speclite-*.tgz --list \
  && SPECLITE_HOME="$tmp/home" npx -y ./speclite-*.tgz version \
  && SPECLITE_HOME="$tmp/home" npx -y ./speclite-*.tgz --only cursor --dry-run   # Source: elnaterator/speclite
grep -rn "npx -y github" --exclude-dir=.git --exclude-dir=specs --exclude-dir=research .
```

Release workflow cannot run locally — verify by reading; real proof is the `v0.6.0` tag push.

As built: tarball (30 files) run via `npx ./speclite-*.tgz` from a temp dir — `--list`,
`version`, `--only cursor|opencode --dry-run` all work, `Source: elnaterator/speclite`.
`make ci` gained an `npm pack` check. README also keeps a short layout + branch-naming block
(from the old "How it's laid out") so nothing user-facing was dropped. Open questions taken
at their proposed defaults (full-auto).

## Out of scope

- Actually publishing (needs the user's `NPM_TOKEN` secret; happens on tag push after merge).
- npm trusted publishing / OIDC migration.
- Pinning host marketplaces to release tags.
- Global `npm i -g speclite` as a documented path (rejected in research).
