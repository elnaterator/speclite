# Plan: R005 Add system prompt template and always follow system prompt

> Roadmap item: R005
> Branch: feat/R005-system-prompt-template
> Issue: n/a

## Context

speclite skills currently follow only their own SKILL.md instructions. There is no
per-project override mechanism. R005 adds a markdown file living next to `roadmap.md` and
`plan-template.md` (in `specs/lite/`) that **every** speclite skill reads first and treats as
the highest-priority instruction set — it overrides any conflicting skill instruction.

Use cases from the roadmap: "always use caveman ultra skill", "always use spec-driven
development", project-specific conventions. The file is created on `init` from a standard,
very simple template and is customizable per project.

## Approach

- Name the file `specs/lite/system-prompt.md`. Add a bundled default at
  `templates/system-prompt.md` (parallel to existing `roadmap.md` / `plan-template.md`).
- `speclite-init` gains a step to create `specs/lite/system-prompt.md` from the bundled
  template, only if absent (same idempotent copy/inline-fallback pattern as roadmap/plan).
- Every skill (`speclite-plan`, `speclite-implement`, `speclite-commit`; and `speclite-init`
  for completeness) gets a new **Step 0**: read `specs/lite/system-prompt.md` if it exists
  and treat its instructions as overriding the skill's own where they conflict.
- Default template stays minimal: a heading, one line saying these instructions override
  speclite skill defaults, and a couple of commented example directives (caveman ultra,
  spec-driven) the user can uncomment/edit.

### Decisions / trade-offs

- File name `system-prompt.md` (not `config.md`) — matches roadmap wording, signals
  instruction text not key/value config.
- Override semantics are advisory prose in each skill (no enforcement engine) — consistent
  with how speclite skills already operate as instruction docs.
- `init` must not overwrite an existing `system-prompt.md` (preserve user customization).

## Steps

- [x] Add `templates/system-prompt.md` with the minimal default template.
- [x] Update `skills/speclite-init/SKILL.md`: add a step to create
      `specs/lite/system-prompt.md` from the bundled template (idempotent, never overwrite),
      and mention it in the "report what was created" step.
- [x] Add a **Step 0 / read system prompt first** instruction to `skills/speclite-plan`,
      `skills/speclite-implement`, and `skills/speclite-commit` SKILL.md files.
- [x] Add Step 0 to `skills/speclite-init/SKILL.md` too (read if present before acting).
- [x] Update `README.md` / `docs/` if they enumerate the `specs/lite/` files or skill steps.

## Files

- `templates/system-prompt.md` (new)
- `skills/speclite-init/SKILL.md`
- `skills/speclite-plan/SKILL.md`
- `skills/speclite-implement/SKILL.md`
- `skills/speclite-commit/SKILL.md`
- `README.md`, `docs/*` (if they list the spec files)

## Testing

- Run `/speclite-init` in a scratch repo → confirm `specs/lite/system-prompt.md` created
  from template; re-run → confirm NOT overwritten.
- Inspect each skill SKILL.md → Step 0 present, references override semantics.
- Manual: put a directive in a project `system-prompt.md`, confirm a skill run reads and
  honors it before its own defaults.

## Out of scope

- Configurable spec path (still fixed `specs/lite/`; future roadmap item).
- Any enforcement/validation engine for the override rules.
- CLI (`speclite` Go binary, R006) support for the file.
