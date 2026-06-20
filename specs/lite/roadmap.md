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

## R012 speclite-status skill
Add a read-only `speclite-status` skill that prints the current pipeline state at a glance: roadmap items by status (backlog/PLANNED/WIP/DONE), current branch + its roadmap item, autopilot mode (`.mode`) and any active `.autopilot-halt`, open PR (via gh) for the branch, and what `speclite-next` would do next (dry-run of the dispatcher — compute the next step without executing it). No writes, no side effects, safe to run anytime. Reads `system-prompt.md` first per convention. Useful as a daily check and to preview autopilot before committing to a loop mode.