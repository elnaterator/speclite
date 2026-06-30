# Roadmap

speclite dogfoods itself. Items below track speclite's own development.

Status suffix: _(none)_=backlog, ` - PLANNED`, ` - WIP`, ` - BUILT`, ` - SHIPPED`.

| Suffix | Meaning |
|--------|---------|
| _(none)_ | backlog — not started |
| ` - PLANNED` | a plan exists in `specs/lite/` |
| ` - WIP` | implementation started (branch checked out) |
| ` - BUILT` | code complete, ready to commit |
| ` - SHIPPED` | committed, pushed, PR open |

## 001 init skill - SHIPPED
Create `specs/lite/` with roadmap + plan template. Idempotent.

## 002 plan skill - SHIPPED
Pick next backlog item, branch, write plan from template, mark PLANNED.

## 003 build skill - SHIPPED
Build the current branch's plan; mark WIP then BUILT.

## 004 ship skill - SHIPPED
Plan-completeness check, commit (reuse git-helper/caveman-commit), push, open PR via gh/bkt.

## 005 Add rules template and always follow rules - SHIPPED
Should have a markdown file next to roadmap.md and plan-template.md, it is always read when doing speclite prompts, it overrides any speclite instructions, could have things like always use caveman ultra skill, or always use spec driven development, etc. Should be created on init with standard, very simple template, but customizable per project. All skills must read this file first and prioritize instructions there.

## 006 loop modes — speclite-run dispatcher + auto-loop hook - SHIPPED
`speclite-run` skill = state-machine dispatcher: read roadmap status (single source of
truth), pick next step (init/plan/build/ship), invoke that skill. A Stop hook (bash)
re-triggers `speclite-run` while a loop mode is set, until the roadmap is all
`SHIPPED` or a pause-gate is hit. Mode set via `.mode` file (`/speclite-mode default|semi-auto|full-auto`). No binary —
bash + markdown only. Must respect existing pause gates and STOP before commit/PR
(irreversible, outward-facing).

## 007 Add cursor plugin scaffolding - SHIPPED
Should have needed manifests, adjustments to work as a cursor plugin. Research https://cursor.com/docs/plugins#creating-plugins, and https://github.com/cursor/plugin-template, base your updates on docs and latest instructions.

## 008 Make easy to install with good instructions - SHIPPED
I want to ensure the all claude or cursor users who find my repo can easy get this plugin installed and up and running. Readme should focus on the user quickly getting up and running, packaging and manifests should be updated properly, focused on any user, it should be ready for distrubution.  Readme should clearly and concisely catch attention, explain capabilities, then give install instructions, then usage instructions. After that can come deeper dives. Also add separate contributing.md focused on developers contributing. Readme is focused on user.

## 009 Add github copilot / vscode scaffolding - SHIPPED
Should have needed plugin manifests, instructions and scripts to support easy install in vscode for github copilot. Research what is needed for github copilot plugins, compatibility of all features, and bring up any conflicts or issues such as hooks and skills compatibility, etc.

## 010 Support semi-auto and full-auto mode - SHIPPED
Instead of speclite-auto on/off, I want to set speclite-mode default/semi-auto/full-auto. Semi auto should be the equivalent of the loop functionality today: plan + build, halt before commit. Full auto should plan, build, commit including raising PR automatically, halt after PR. Warn the user of risks when setting full auto. Use a `.mode` file, content will be default, semi-auto, full-auto.

## 011 speclite-review skill - SHIPPED
Add a `speclite-review` skill that runs after `speclite-build` and before the commit gate. It reviews the branch diff against the plan's acceptance criteria and the rules, flags drift (missing criteria, scope creep, unverified claims), and writes findings the user can act on. Manual invocation always runs a full review.

When run under a loop mode (`speclite-run` dispatch), review is **conditional, not mandatory** — the dispatcher decides whether a review is needed and **skips it when not**. Decision criteria (review IS needed when any hold): diff touches many files or many lines (configurable threshold); plan has explicit acceptance criteria that aren't all obviously satisfied; changes touch security-sensitive, irreversible, or outward-facing surfaces (auth, secrets, hooks, install/CI, deletes); plan marked high-risk/complex; or rules opt into always-review. Review SKIPPED when: trivial/small diff, docs-only or single-file low-risk change, no acceptance criteria to check. Record the skip decision + reason (transparency, same spirit as `.halt`). By default review reports rather than fixes. Mode-specific handling of a **failed** review: in default/manual it reports to the user; in semi-auto it surfaces to the human (halt before commit); in **full-auto** it proceeds to auto-fix all flagged issues using the review's recommendations, then re-reviews — loop until clean or a bounded retry cap is hit, at which point halt (`.halt`) rather than commit broken work. Keep defensive posture: when review can't determine pass/fail, or fixes don't converge, halt rather than rubber-stamp.

## 012 speclite-status skill - SHIPPED
Add a read-only `speclite-status` skill that prints the current pipeline state at a glance: roadmap items by status (backlog/PLANNED/WIP/BUILT/SHIPPED), current branch + its roadmap item, mode (`.mode`) and any active `.halt`, open PR (via gh) for the branch, and what `speclite-run` would do next (dry-run of the dispatcher — compute the next step without executing it). No writes, no side effects, safe to run anytime. Reads `rules.md` first per convention. Useful as a daily check and to preview the loop before committing to a loop mode.

## 013 usability refactor — clearer names, statuses, vocabulary - SHIPPED
Reduce cognitive load with consistent, obvious naming across speclite. No backwards-compat required (early, single-user). Mechanical renames:
- `system-prompt.md` → `rules.md`
- Status `DONE` → `BUILT`, add terminal `SHIPPED`: backlog → `PLANNED` → `WIP` → `BUILT` → `SHIPPED`
- "autopilot" → "mode" everywhere (hook, halt marker, prose)
- Drop the `R` prefix from the item id — bare number everywhere (roadmap, branch, commit scope)
- `speclite-next` → `speclite-run`, `speclite-implement` → `speclite-build`, `speclite-commit` → `speclite-ship`
Keep `specs/lite/` (no folder move). Rationale, full touch list, and acceptance criteria in the plan.

## 014 Improve agent/skill support for the bkt CLI (Bitbucket) - BUILT
Some repos live on Bitbucket Data Center, not GitHub, so PR and repo operations use the `bkt` CLI, not `gh`. Make the relevant skills (e.g. `speclite-status`, `speclite-ship`) bkt-aware so they reliably pick and drive the right tool.
- **Detect when to use bkt vs gh**: prefer `bkt` whenever the remote is Bitbucket (e.g. `git remote -v` shows `bitbucket`) or something in the project docs indicates bitbucket is used, otherwise `gh`. Skills should check the remote rather than assuming GitHub.
- **Know how to use bkt**: cover the common flows — `bkt pr list --mine`, `bkt pr view <id>`, `bkt pr create`, `bkt pr edit <id> --body`, `bkt pr comment`. Note that `bkt pr edit --body` replaces the whole description, and that `--jq` returns JSON-encoded strings (decode before writing back, or the body gets double-escaped).
- **Instruct on basic config issues** (keep guidance very short and concise but clear):
  - `no such host` for DNS or TLS trust wall issues due to running commands in sandbox: add `bkt` to `sandbox.excludedCommands` (claude code) to run it unsandboxed.
  - Auth: `bkt auth status` to check, `bkt auth login https://my.company.local` to (re)authenticate.
- Check more at https://github.com/avivsinai/bitbucket-cli
