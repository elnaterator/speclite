---
roadmap_id: 024
issue: n/a
---

# Plan: 024 Installer refreshes stale marketplace registrations

## Overview

`doctor` reported `Codex: installed 0.3.0 is older than source 0.6.2 — reinstall with
--only codex`, but reinstalling changed nothing. Codex keeps a git marketplace as a frozen
clone (`~/.codex/.tmp/marketplaces/speclite`); `installCodex` skipped `marketplace add` when
already registered and never refreshed it, so `plugin add` reinstalled 0.3.0. Claude had a
milder form: `marketplace update` refreshes whatever source was registered first, even when
this run installs from a different one.

## Acceptance criteria

- [x] Codex install always removes plugin + marketplace and re-adds both from `ctx.source`.
- [x] Claude install re-registers the marketplace when the registered source differs from
      `ctx.source` (GitHub `owner/repo`, git URL, local path compared normalized).
- [x] Dry-runs for every target still pass (CI invariant).

## Design

- Codex: mirror Copilot — `plugin remove` → `marketplace remove` (if registered) →
  `marketplace add <source>` → `plugin add`.
- Claude: `claudeMarketplaceEntry()` reads `claude plugin marketplace list --json`;
  `claudeSourceMatches()` compares `path` / `repo` / `url` with the current source. Mismatch →
  uninstall + `marketplace remove` + `marketplace add`. Unknown entry shape ⇒ treat as match.

**Touches:** `bin/install.js` (mod), manifests + `package.json` (bump 0.6.3).

## Steps

- [x] Re-register Codex marketplace on every install.
- [x] Add Claude source-mismatch re-registration.
- [x] Bump to 0.6.3.

## Testing

- `node bin/version.js --check`
- `node bin/install.js --only <t> --dry-run` and `--uninstall --dry-run` for all targets.
- Matcher cases: local↔local, local↔GitHub, GitHub↔GitHub, GitHub↔git URL, GitHub↔local.
- Manual after publish: `npx @elnaterator/speclite@latest --only codex`, then `doctor` clean.

## Out of scope

Copilot (already re-registers), copy-based targets (Cursor, OpenCode, Kiro).
