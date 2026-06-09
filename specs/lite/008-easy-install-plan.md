---
roadmap_id: R008
issue: n/a
---

# Plan: R008 Make easy to install with good instructions

## Overview

Make speclite distribution-ready so any Claude Code or Cursor user who finds the repo can
install and run it fast. Split docs by audience: README = user-facing (hook → capabilities →
install → usage → deeper dives); new CONTRIBUTING.md = developer-facing (dev install loops,
template-sync, dogfooding, conventions). Audit packaging/manifests for distribution.

In scope:
- Restructure README for new-user funnel: attention-grabbing intro, capability summary,
  install (both platforms), usage walkthrough, then deeper reference.
- Move developer/dev-iteration content out of README into a new CONTRIBUTING.md.
- Fix manifests for distribution: Cursor `plugin.json` description still says "for Claude
  Code"; align both manifests; confirm GitHub owner/repo slug; decide version.
- Replace stale README "Roadmap" deferred-work blurb (Go CLI / homebrew / Jira — removed
  from the actual roadmap) with accurate text.

## Acceptance criteria

- [ ] README opens with a concise attention hook + capability summary before any internals.
- [ ] README order: hook → capabilities → install (Claude + Cursor) → usage → deeper dives.
- [ ] Install instructions are copy-pasteable for an end user (no `{placeholder}` tokens;
      real owner/repo slug for the GitHub install path).
- [ ] `CONTRIBUTING.md` exists, holds dev-iteration content (cache re-sync loop, skill
      symlinking, template two-copy sync, dogfooding, commit/branch conventions).
- [ ] Cursor `.cursor-plugin/plugin.json` description no longer says "for Claude Code";
      both manifests describe the dual-platform plugin consistently.
- [ ] README "Roadmap" section reflects the current roadmap (no removed Go-CLI/homebrew/Jira
      promises).

## Open questions

- [x] GitHub owner/repo for the published install path — **resolved: `elnaterator/speclite`**
      (confirmed via `git remote -v`; README's existing `elnaterator` was already correct —
      not a placeholder. No change needed to that path.)
- [x] Version bump for distribution — **resolved: bump both manifests `0.1.0` → `0.2.0`.**

## Design

Two-audience doc split. README is the storefront — a user skims top-to-bottom and is running
within the first screen. CONTRIBUTING is the workshop — anything about editing/testing the
plugin itself lives there.

Proposed README outline:
1. Title + one-line pitch + 2–3 sentence "what/why" hook.
2. **Capabilities** — skill table + lifecycle/branch model, condensed.
3. **Install** — Claude Code (marketplace add + install) and Cursor (symlink), end-user
   paths only. Dev-mode cache notes move to CONTRIBUTING.
4. **Usage** — minimal happy-path walkthrough: init → plan → implement → commit; autopilot
   as optional aside.
5. **Deeper dives** — autopilot details, repo layout, conventions link, license.

CONTRIBUTING.md outline: dev install (Claude cache re-sync loop, skill symlink iteration;
Cursor symlink + Reload Window), template two-copy pattern + dogfood sync, commit/branch
conventions (roadmap-id scope), where design docs live (`docs/QUESTIONS.md`, `docs/design.md`).

**Touches:**
- `README.md` (mod) — restructure, trim dev content, fix roadmap blurb + placeholders.
- `CONTRIBUTING.md` (new) — developer guide.
- `.cursor-plugin/plugin.json` (mod) — fix description, version.
- `.claude-plugin/plugin.json` (mod) — align description, version.
- `.claude-plugin/marketplace.json` (mod) — align description if needed.

## Steps

- [x] Confirm open questions (owner/repo slug, version) — owner `elnaterator/speclite`
      confirmed via remote; version → 0.2.0.
- [x] Fix `.cursor-plugin/plugin.json` description + bump version; align `.claude-plugin/`
      plugin.json + marketplace.json descriptions/version (also dropped non-existent "review"
      skill from marketplace plugin description).
- [x] Write `CONTRIBUTING.md` from dev content (pulled dev-mode notes out of README).
- [x] Rewrite `README.md` to the user-first outline; removed `{placeholder}` token and the
      stale deferred-work roadmap blurb; GitHub marketplace install now the primary path.
- [x] Proofread: install commands copy-pasteable; placeholder/desc/stale-blurb greps clean;
      manifests valid JSON.

## Testing

- `grep -n "Claude Code" .cursor-plugin/plugin.json` → description no longer misdescribes.
- `grep -nE "\{[a-z_]+\}|elnaterator" README.md` → no leftover placeholders.
- Eyeball rendered README to confirm funnel order.
- Manual: follow README Cursor symlink install path end-to-end.

## Out of scope

- Actual marketplace/GitHub publish (only make the repo ready).
- Go CLI, homebrew packaging, issue-store add-ons (not on current roadmap).
- Changing skill behavior or workflow semantics.
