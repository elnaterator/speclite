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
   pattern, source `${CLAUDE_PLUGIN_ROOT}/templates/plan-template.md`). Platforms that
   install speclite as a plain skills directory (Codex CLI, OpenCode) ship no `templates/`,
   so the fallback below is the only source there — write it verbatim, do not improvise a
   plan shape. Inline fallback content:

   ```markdown
   ---
   roadmap_id: <NNN>
   issue: <id or n/a>
   ---

   # Plan: <NNN> <title>

   Drop any section that adds no signal for this item — keep what helps, skip the rest.

   ## Overview

   Summarize the roadmap item text. Why this work. What this must do. Bullet the concrete capabilities/behaviors in scope.

   ## Acceptance criteria

   Testable conditions that must all be true to mark the item BUILT.

   - [ ] Observable outcome 1
   - [ ] Observable outcome 2

   ## Open questions

   Decisions that need the user. **Default to taking obvious guesses — do not burden the user
   with what you can reasonably infer.** Only raise a question here when getting it wrong is
   costly or hard to reverse (data model, public API, UX direction, security). For each:
   state your proposed answer so the user can confirm fast or redirect.

   - [ ] Question — _proposed: <your default>_

   ## Design

   How it fits together. Key decisions, trade-offs, and any structure worth sketching
   (data shapes, interfaces, flow). Skip or keep brief for small features.

   **Touches:** files expected to change — mark `(new)` / `(mod)` / `(del)`.

   ## Steps

   Ordered, each small and verifiable.

   - [ ] Step 1
   - [ ] Step 2

   ## Testing

   How to verify. Exact commands to run, plus any manual checks.

   ## Out of scope

   What this plan intentionally does not do.
   ```

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
   <!-- Roadmap edits require a branch + PR (default: commit directly on trunk and push). -->
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
