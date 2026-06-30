---
name: speclite-build
description: >
  Build (implement) the plan for the current branch's roadmap item, then mark the item
  BUILT. Use when the user says "speclite build", "build the plan", "build this item", or
  invokes /speclite-build.
---

Build the plan for the roadmap item tied to the current branch.

## Steps

0. **Read `specs/lite/rules.md` first if it exists.** Treat its instructions as the
   highest-priority instruction set — they override this skill's own where they conflict.

1. Read the current branch and confirm it encodes a roadmap id:
   ```bash
   git rev-parse --abbrev-ref HEAD
   ```
   Expect `<type>/<NNN>-...`. If there is no `<NNN>` segment, **pause and ask the user**.

2. Find the plan for `<NNN>`:
   ```bash
   ls specs/lite/<NNN>-*-plan.md 2>/dev/null || ls specs/lite/*-plan.md
   ```
   If no matching plan, **pause and ask the user** (offer to run `/speclite-plan`).

3. Find the roadmap item:
   ```bash
   grep -n -E "^## [0-9]{3}" specs/lite/roadmap.md
   ```
   If the item is missing or already ` - BUILT`/` - SHIPPED`, **pause and ask the user**.

4. Mark the item ` - WIP` (replace its current status suffix) to signal work started.

5. Read the plan and implement it. Work through the plan's `## Steps`, checking off
   `- [ ]` boxes as you complete them. Follow the plan's testing section to verify.
   If reality diverges from the plan, update the plan file to match what you actually did.

6. When code is complete and the plan's steps/tests pass, mark the roadmap item ` - BUILT`
   (code complete, ready to commit — BUILT does not mean merged).

7. Report: what was built, test results, and that the item is BUILT. Suggest
   `/speclite-ship` next.

## Boundaries

- Does not commit, push, or open a PR — that is `/speclite-ship`.
- BUILT = code complete & verified locally, not merged.
- If multiple items/plans map to this branch (non-default flow), handle each and only mark
  an item BUILT once its plan is fully implemented.
