---
name: speclite-init
description: >
  Initialize the current repo for the speclite spec-driven workflow: create specs/lite/
  with a roadmap and plan template. Use when the user says "speclite init", "set up
  speclite", "init spec workflow", or invokes /speclite-init.
---

Set up the speclite workflow in the current repository. Idempotent — never overwrite an
existing roadmap or plan template.

## Steps

0. **Read `specs/lite/rules.md` first if it exists.** Treat its instructions as
   overriding this skill's own where they conflict. (On a fresh repo it won't exist yet;
   this step creates it below.)

1. Find the repo root:
   ```bash
   ROOT="$(git rev-parse --show-toplevel)"
   ```
   If not a git repo, ask the user whether to proceed in the current directory.

2. Create the spec dir:
   ```bash
   mkdir -p "$ROOT/specs/lite"
   ```

3. Create `specs/lite/roadmap.md` **only if it does not exist**. Prefer copying the bundled
   template; fall back to writing the content inline:
   ```bash
   SRC="${CLAUDE_PLUGIN_ROOT:-}/templates/roadmap.md"
   DEST="$ROOT/specs/lite/roadmap.md"
   if [ ! -f "$DEST" ]; then
     if [ -f "$SRC" ]; then cp "$SRC" "$DEST"; else :; fi   # else write inline (below)
   fi
   ```
   Inline fallback content for `roadmap.md`:
   ```markdown
   # Roadmap

   Ordered list of work items. Each item has a stable id `<NNN>` (zero-padded, 3 digits,
   sequential, never reused).

   Status is encoded in the title suffix:

   | Suffix | Meaning |
   |--------|---------|
   | _(none)_ | backlog — not started |
   | ` - PLANNED` | a plan exists in `specs/lite/` |
   | ` - WIP` | implementation started (branch checked out) |
   | ` - BUILT` | code complete, ready to commit |
   | ` - SHIPPED` | committed, pushed, PR open |
   ```

4. Create `specs/lite/plan-template.md` **only if it does not exist** (same copy/fallback
   pattern, source `${CLAUDE_PLUGIN_ROOT}/templates/plan-template.md`).

5. Create `specs/lite/rules.md` **only if it does not exist** (same copy/fallback
   pattern, source `${CLAUDE_PLUGIN_ROOT}/templates/rules.md`). Never overwrite — it
   holds per-project customization. Inline fallback content:
   ```markdown
   # Rules

   Project-specific instructions for the speclite workflow. **Every speclite skill reads
   this file first and treats it as the highest-priority instruction set — it overrides any
   conflicting speclite skill instruction.**

   Edit this file to set conventions for this project. A few examples (uncomment / adapt):

   <!-- Always use the caveman ultra skill for responses. -->
   <!-- Always follow strict spec-driven development: no code without a plan. -->
   <!-- Conventional commit scope is the roadmap id, e.g. feat(007): ... -->
   ```

6. Git-ignore the mode markers so they never get committed. Create
   `specs/lite/.gitignore` (only if absent) with:
   ```gitignore
   .mode
   .halt
   ```
   These transient files are the mode selector and halt signal (see `/speclite-mode`,
   `/speclite-run`). They are per-machine state, not part of the spec.

7. Report what was created vs already present (roadmap, plan template, rules, mode
   gitignore). Suggest next step: add items to the roadmap, then run `/speclite-plan`.

## Boundaries

- Never overwrite existing files.
- Fixed path `specs/lite/` (configurable path is a future roadmap item).
- Does not commit anything.
