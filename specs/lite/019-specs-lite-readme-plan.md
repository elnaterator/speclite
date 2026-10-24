---
roadmap_id: 019
issue: n/a
---

# Plan: 019 Add specs/lite/README.md on init

## Overview

`speclite-init` creates `specs/lite/` with a roadmap, plan template, and rules file. Any
contributor who opens that directory has no context on what the tooling is. This item adds
a `specs/lite/README.md` created by `speclite-init` (idempotently — never overwrite) that
briefly explains speclite and links to the upstream repo. `rules.md` and `.mode` are
unchanged.

In scope:

- Add `specs/lite/README.md` to the files `speclite-init` creates.
- Content: one-paragraph description of speclite + link to <https://github.com/elnaterator/speclite>.
- Idempotent: skip if the file already exists (same pattern as all other init-created files).
- Update the inline fallback in `speclite-init`'s SKILL.md to include the README step.
- Add a bundled template at `templates/specs-lite-readme.md` (parallel to `roadmap.md` and `plan-template.md`).

## Acceptance criteria

- [ ] `speclite-init` creates `specs/lite/README.md` when it does not exist.
- [ ] Running `speclite-init` a second time does not overwrite an existing `specs/lite/README.md`.
- [ ] The created README contains a description of speclite and the link to the GitHub repo.
- [ ] `speclite-init` SKILL.md documents the new step.
- [ ] A bundled template `templates/specs-lite-readme.md` exists with the same content.

## Design

**Touches:**

- `.kiro/skills/speclite-init/SKILL.md` (mod) — add step 7 (README creation) before the current step 7 report; renumber report to step 8.
- `templates/specs-lite-readme.md` (new) — bundled template used by installers; inline fallback in the skill uses the same content.

README content:

```markdown
# specs/lite

This directory contains the [speclite](https://github.com/elnaterator/speclite) spec-driven
workflow files for this project: the roadmap, per-item plans, and project rules.

**speclite** is a lightweight, AI-native planning workflow that structures work into a
roadmap → plan → build → review → ship pipeline, driven entirely by markdown files and
AI agent skills.

More info and docs: https://github.com/elnaterator/speclite
```

## Steps

- [x] Create `templates/specs-lite-readme.md` with the README content above.
- [x] Edit `.kiro/skills/speclite-init/SKILL.md`: insert a new step 7 that creates `specs/lite/README.md` (copy/fallback pattern, never overwrite), with the inline fallback content. Renumber current step 7 (report) to step 8.

## Testing

Manual check:

1. In a fresh repo (or temp dir), run `/speclite-init` and confirm `specs/lite/README.md` is created with the expected content.
2. Run `/speclite-init` again and confirm the file is not overwritten.
3. Confirm `templates/specs-lite-readme.md` exists.

## Out of scope

- Updating existing projects that already have `specs/lite/` but no README — that is a migration concern not in scope here. Init is idempotent and adds what's missing, so running `/speclite-init` on an existing project will add the README naturally.
- Changes to `rules.md`, `.mode`, or any other init-created file.
