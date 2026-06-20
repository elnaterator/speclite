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