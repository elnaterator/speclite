---
roadmap_id: R012
issue: n/a
---

# Plan: R012 speclite-status skill

## Overview

Add a read-only `speclite-status` skill that prints the current pipeline state at a glance.
No writes, no side effects — safe to run anytime. Like `speclite-next`, it reads the roadmap
status + git + autopilot markers, but it **only reports** and never dispatches a skill.

In scope:
- Roadmap items grouped by status: backlog / PLANNED / WIP / DONE (with counts).
- Current branch + the roadmap item it maps to (parse `R<NNN>` from branch).
- Autopilot mode (`.mode`, default if absent) and any active `.autopilot-halt` (+ its reason).
- Open PR for the branch (via `gh pr view`, tolerate gh missing / no PR).
- "Next step" = a **dry-run** of the `speclite-next` decision table: compute what the
  dispatcher would do, do not execute it.
- Reads `system-prompt.md` first per convention.

## Acceptance criteria

- [x] `skills/speclite-status/SKILL.md` exists with valid frontmatter (name + triggering description).
- [x] Skill is registered everywhere skills are enumerated (README; manifests auto-discover skills, no edit needed).
- [x] Step 0 reads `specs/lite/system-prompt.md` first.
- [x] Reports roadmap items by status, current branch + its `R<NNN>` item, mode, halt marker, open PR.
- [x] Computes next dispatcher action as a dry-run **without** running any downstream skill.
- [x] Strictly read-only: no file writes, no git mutations, no commit/push/PR, no `.autopilot-halt` writes.
- [x] Degrades gracefully: no spec dir, no gh, trunk/detached branch, no PR.

## Open questions

- [ ] Work outside an initialized repo (no `specs/lite/`)? — _proposed: yes, report "not initialized" + suggest `/speclite-init`._

## Design

Mirror the observe-state block of `speclite-next` (same git/grep commands) so the two stay
consistent, but replace the decide+dispatch half with pure reporting + a dry-run "what next".
The dry-run re-states which `speclite-next` decision-table row matches and names the skill it
would run — without invoking it.

gh usage must be optional: guard `gh pr view` behind a `command -v gh` check and tolerate the
no-PR exit so the skill never errors on a fresh branch or a machine without gh.

**Touches:**
- `skills/speclite-status/SKILL.md` (new)
- `.claude-plugin/marketplace.json` / `.claude-plugin/plugin.json` (mod, only if they enumerate skills)
- `.cursor-plugin/plugin.json` (mod, if it enumerates skills)
- `README.md` (mod, skill list)

## Steps

- [x] Inspect how skills are registered (plugin.json / marketplace.json / cursor manifest / README) — manifests auto-discover skills; only README enumerates them.
- [x] Write `skills/speclite-status/SKILL.md`: Step 0 system-prompt read, observe-state block, report sections, next-step dry-run, read-only boundaries.
- [x] Register the skill in README skill list (also added missing `speclite-review` row).
- [x] Verify wording stays consistent with the `speclite-next` decision table.

## Testing

- Run `/speclite-status` in this repo: confirm it prints roadmap-by-status, current branch +
  item, mode (`full-auto`), no halt, PR state, and a correct "next" dry-run — with zero writes
  (`git status --porcelain` unchanged after run).
- Manually confirm graceful output when `gh` absent and when not initialized.

## Out of scope

- Any state mutation, dispatch, or autopilot loop participation.
- New persistent state files.
- Rich/colored TUI output beyond plain markdown text.
