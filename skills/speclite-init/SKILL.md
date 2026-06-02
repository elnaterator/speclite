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

   Ordered list of work items. Each item has a stable id `R<NNN>` (zero-padded, 3 digits,
   sequential, never reused).

   Status is encoded in the title suffix:

   | Suffix | Meaning |
   |--------|---------|
   | _(none)_ | backlog — not started |
   | ` - PLANNED` | a plan exists in `specs/lite/` |
   | ` - WIP` | implementation started (branch checked out) |
   | ` - DONE` | code complete, ready to commit |
   ```

4. Create `specs/lite/plan-template.md` **only if it does not exist** (same copy/fallback
   pattern, source `${CLAUDE_PLUGIN_ROOT}/templates/plan-template.md`).

5. Report what was created vs already present. Suggest next step: add items to the roadmap,
   then run `/speclite-plan`.

## Boundaries

- Never overwrite existing files.
- Fixed path `specs/lite/` (configurable path is a future roadmap item).
- Does not commit anything.
