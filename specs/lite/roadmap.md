# Roadmap

speclite dogfoods itself. Items below track speclite's own development.

Status suffix: _(none)_=backlog, ` - PLANNED`, ` - WIP`, ` - DONE`.

| Suffix | Meaning |
|--------|---------|
| _(none)_ | backlog — not started |
| ` - PLANNED` | a plan exists in `specs/lite/` |
| ` - WIP` | implementation started (branch checked out) |
| ` - DONE` | code complete, ready to commit |

## R001 init skill - DONE
Create `specs/lite/` with roadmap + plan template. Idempotent.

## R002 plan skill - DONE
Pick next backlog item, branch, write plan from template, mark PLANNED.

## R003 implement skill - DONE
Implement the current branch's plan; mark WIP then DONE.

## R004 commit skill - DONE
Plan-completeness check, commit (reuse git-helper/caveman-commit), push, open PR via gh/bkt.

## R005 Add system prompt template and always follow system prompt - DONE
Should have a markdown file next to roadmap.md and plan-template.md, it is always read when doing speclite prompts, it overrides any speclite instructions, could have things like always use caveman ultra skill, or always use spec driven development, etc. Should be created on init with standard, very simple template, but customizable per project. All skills must read this file first and prioritize instructions there.

## R006 autopilot — speclite-next dispatcher + auto-loop hook - DONE
`speclite-next` skill = state-machine dispatcher: read roadmap status (single source of
truth), pick next step (init/plan/implement/commit), invoke that skill. A Stop hook (bash)
re-triggers `speclite-next` while a loop mode is set, until the roadmap is all
`DONE` or a pause-gate is hit. Mode set via `.mode` file (`/speclite-mode default|semi-auto|full-auto`). No binary —
bash + markdown only. Must respect existing pause gates and STOP before commit/PR
(irreversible, outward-facing).

## R007 Add cursor plugin scaffolding - DONE
Should have needed manifests, adjustments to work as a cursor plugin. Research https://cursor.com/docs/plugins#creating-plugins, and https://github.com/cursor/plugin-template, base your updates on docs and latest instructions.

## R008 Make easy to install with good instructions - DONE
I want to ensure the all claude or cursor users who find my repo can easy get this plugin installed and up and running. Readme should focus on the user quickly getting up and running, packaging and manifests should be updated properly, focused on any user, it should be ready for distrubution.  Readme should clearly and concisely catch attention, explain capabilities, then give install instructions, then usage instructions. After that can come deeper dives. Also add separate contributing.md focused on developers contributing. Readme is focused on user.

## R009 Add github copilot / vscode scaffolding - DONE
Should have needed plugin manifests, instructions and scripts to support easy install in vscode for github copilot. Research what is needed for github copilot plugins, compatibility of all features, and bring up any conflicts or issues such as hooks and skills compatibility, etc.

## R010 Support semi-auto and full-auto mode - DONE
Instead of speclite-auto on/off, I want to set speclite-mode default/semi-auto/full-auto. Semi auto should be the equivalent of .autopilot functionality today: plan + implement, halt before commit. Full auto should plan, implement, commit including raising PR automatically, halt after PR. Warn the user of risks when setting full auto. Use a `.mode` file, content will be default, semi-auto, full-auto.

## R011 speclite-review skill - DONE
Add a `speclite-review` skill that runs after `speclite-implement` and before the commit gate. It reviews the branch diff against the plan's acceptance criteria and the system prompt, flags drift (missing criteria, scope creep, unverified claims), and writes findings the user can act on. Manual invocation always runs a full review.

When run under autopilot (`speclite-next` dispatch), review is **conditional, not mandatory** — the dispatcher decides whether a review is needed and **skips it when not**. Decision criteria (review IS needed when any hold): diff touches many files or many lines (configurable threshold); plan has explicit acceptance criteria that aren't all obviously satisfied; changes touch security-sensitive, irreversible, or outward-facing surfaces (auth, secrets, hooks, install/CI, deletes); plan marked high-risk/complex; or system-prompt opts into always-review. Review SKIPPED when: trivial/small diff, docs-only or single-file low-risk change, no acceptance criteria to check. Record the skip decision + reason (transparency, same spirit as `.autopilot-halt`). By default review reports rather than fixes. Mode-specific handling of a **failed** review: in default/manual it reports to the user; in semi-auto it surfaces to the human (halt before commit); in **full-auto** it proceeds to auto-fix all flagged issues using the review's recommendations, then re-reviews — loop until clean or a bounded retry cap is hit, at which point halt (`.autopilot-halt`) rather than commit broken work. Keep defensive posture: when review can't determine pass/fail, or fixes don't converge, halt rather than rubber-stamp.

## R012 speclite-status skill - DONE
Add a read-only `speclite-status` skill that prints the current pipeline state at a glance: roadmap items by status (backlog/PLANNED/WIP/DONE), current branch + its roadmap item, autopilot mode (`.mode`) and any active `.autopilot-halt`, open PR (via gh) for the branch, and what `speclite-next` would do next (dry-run of the dispatcher — compute the next step without executing it). No writes, no side effects, safe to run anytime. Reads `system-prompt.md` first per convention. Useful as a daily check and to preview autopilot before committing to a loop mode.

## R013 Improve agent/skill support for the bkt CLI (Bitbucket)
Some repos live on Bitbucket Data Center, not GitHub, so PR and repo operations use the `bkt` CLI, not `gh`. Make the relevant skills (e.g. `speclite-status`, `speclite-commit`) bkt-aware so they reliably pick and drive the right tool.
- **Detect when to use bkt vs gh**: prefer `bkt` whenever the remote is Bitbucket (e.g. `git remote -v` shows `bitbucket`) or something in the project docs indicates bitbucket is used, otherwise `gh`. Skills should check the remote rather than assuming GitHub.
- **Know how to use bkt**: cover the common flows — `bkt pr list --mine`, `bkt pr view <id>`, `bkt pr create`, `bkt pr edit <id> --body`, `bkt pr comment`. Note that `bkt pr edit --body` replaces the whole description, and that `--jq` returns JSON-encoded strings (decode before writing back, or the body gets double-escaped).
- **Instruct on basic config issues** (keep guidance very short and concise but clear):
  - `no such host` for DNS or TLS trust wall issues due to running commands in sandbox: add `bkt` to `sandbox.excludedCommands` (claude code) to run it unsandboxed.
  - Auth: `bkt auth status` to check, `bkt auth login https://code.experian.local` to (re)authenticate.

## R014 usability refactor — clearer names, statuses, vocabulary
Reduce cognitive load across speclite. No backwards-compat required (early, single-user); all renames are mechanical but must stay consistent across skills, hooks, templates, installer, README/CONTRIBUTING, CLAUDE.md, and the dogfood `specs/lite/`. Scope:

1. **Rename `system-prompt.md` → `rules.md`.** "system-prompt" leaks LLM jargon; "rules" is obvious to a developer. Update every Step-0 read, template, inline fallback in init, and docs. Keep semantics (read first, overrides skill instructions).
2. **Status vocabulary that doesn't lie.** Replace `DONE` (which actually meant "code complete, NOT merged" and needed repeated caveats) with `BUILT` (code complete, ready to commit) and add `SHIPPED` (commit pushed + PR open). New lifecycle: backlog → `PLANNED` → `WIP` → `BUILT` → `SHIPPED`. `speclite-commit` sets `SHIPPED` after the PR. Roadmap status stays the single source of truth.
3. **Unify "autopilot" → "mode" vocabulary.** One word for the loop concept. Rename hook `autopilot-stop.sh` → `mode-stop.sh`, marker `.autopilot-halt` → `.halt`, and scrub "autopilot" from docs/comments in favor of "mode". `.mode` file unchanged.
4. **Identical join key everywhere.** Plan filenames carry the `R` prefix to match the roadmap id: `specs/lite/R<NNN>-<slug>-plan.md` (was `<NNN>-<slug>-plan.md`). Rename existing dogfood plans.
5. **Rename `speclite-next` → `speclite-run`.** "next" reads read-only (and collides intuitively with the truly read-only `speclite-status`); "run" signals it executes the pipeline. Update the Stop hook command, mode skill references, and docs.
6. **Rename `speclite-implement` → `speclite-build`.** Shorter, pairs with the new `BUILT` status. Update skill dir, manifests, dispatcher references, docs.

Keep `specs/lite/` as the spec directory (no folder move). Acceptance: fresh `speclite-init` produces `rules.md` + `R`-prefixed plan template wording; full pipeline runs end-to-end with new names; no stale `system-prompt.md` / `DONE` / `autopilot` / `speclite-next` / `speclite-implement` references remain (grep clean); dogfood `specs/lite/` migrated to match.