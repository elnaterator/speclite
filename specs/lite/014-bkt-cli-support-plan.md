---
roadmap_id: 014
issue: n/a
---

# Plan: 014 Improve agent/skill support for the bkt CLI (Bitbucket)

## Overview

Some repos live on Bitbucket Data Center, not GitHub, so PR/repo ops use the `bkt` CLI
(https://github.com/avivsinai/bitbucket-cli), not `gh`. Today `speclite-ship` only briefly
mentions `bkt` (step 6) and `speclite-status` hard-codes `gh pr view`. Make the PR-touching
skills bkt-aware so they reliably pick and drive the right tool by inspecting the remote.

In scope:

- **Backend detection** — a shared rule: prefer `bkt` when the remote is Bitbucket (e.g.
  `git remote -v` shows `bitbucket`, or project docs say so), else `gh`. Check, don't assume GitHub.
- **bkt command flows** — document the common ops: `bkt pr list --mine`, `bkt pr view <id>`,
  `bkt pr create`, `bkt pr edit <id> --body`, `bkt pr comment`. Call out the two gotchas:
  `bkt pr edit --body` replaces the whole description; `--jq` returns JSON-encoded strings
  (decode before writing back or the body double-escapes).
- **Config troubleshooting** — short guidance: `no such host` (DNS/TLS in sandbox) → add `bkt`
  to `sandbox.excludedCommands`; auth → `bkt auth status` / `bkt auth login https://<host>`.

## Acceptance criteria

- [x] `speclite-ship` states the backend-detection rule (inspect remote → bkt vs gh) before opening a PR.
- [x] `speclite-ship` documents the bkt PR-create flow and the `--body` replace + `--jq` double-escape gotchas.
- [x] `speclite-status` reads the PR via the detected backend (bkt or gh), still degrading gracefully when neither is available / no PR.
- [x] Both skills include the short config-troubleshooting notes (sandbox `no such host`, auth) with the bkt repo link.
- [x] No GitHub-only assumptions remain in the PR paths of either skill.

## Open questions

- [ ] Put detection + bkt reference in each skill inline, or factor a shared snippet?
      _proposed: inline in each skill (no shared-include mechanism exists; skills are
      self-contained markdown). Keep wording consistent across the two._

## Design

`bkt` mirrors `gh`'s surface (`bkt pr create/view/list/edit/comment`), so changes are
documentation/instruction edits inside the two SKILL.md files — no code, no new files.

Detection rule (shared phrasing): run `git remote -v`; if the URL host looks like Bitbucket
(or project docs indicate Bitbucket) use `bkt`, else `gh`. If the chosen CLI is absent,
degrade as the skill already does (ship: print ready-to-paste PR body; status: report
"no PR / CLI unavailable").

**Touches:**
- `skills/speclite-ship/SKILL.md` (mod) — expand step 6 backend selection, add bkt flows + gotchas + config notes.
- `skills/speclite-status/SKILL.md` (mod) — make PR lookup backend-aware; note bkt in boundaries.

## Steps

- [x] Edit `speclite-ship` step 6: state detection rule, add bkt create flow, the `--body`/`--jq` gotchas, and config-troubleshooting notes + repo link.
- [x] Edit `speclite-status` step 2 PR lookup to detect backend and call `bkt pr view` or `gh pr view`; update boundary note from "gh optional" to backend-agnostic.
- [x] Re-read both skills for consistent detection wording.

## Testing

- No toolchain; "test" = read the edited SKILL.md files for correctness and consistency.
- `grep -rn "gh pr\|bkt pr" skills/` — confirm every PR path has a bkt branch.
- Manual: skim ship/status for a GitHub-only assumption left behind.

## Out of scope

- `speclite-review` and other skills that don't touch PR/remote operations.
- Implementing or wrapping `bkt` itself; installer changes for `bkt`.
- Auto-editing the user's `sandbox.excludedCommands` (guidance only).
