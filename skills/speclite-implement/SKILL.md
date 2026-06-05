---
name: speclite-implement
description: >
  Implement the plan for the current branch's roadmap item, then mark the item DONE. Use
  when the user says "speclite implement", "implement the plan", "build this item", or
  invokes /speclite-implement.
---

Execute the plan for the roadmap item tied to the current branch.

## Steps

0. **Read `specs/lite/system-prompt.md` first if it exists.** Treat its instructions as the
   highest-priority instruction set — they override this skill's own where they conflict.

1. Read the current branch and confirm it encodes a roadmap id:
   ```bash
   git rev-parse --abbrev-ref HEAD
   ```
   Expect `<type>/R<NNN>-...`. If there is no `R<NNN>` segment, **pause and ask the user**.

2. Find the plan for `R<NNN>`:
   ```bash
   ls specs/lite/<NNN>-*-plan.md 2>/dev/null || ls specs/lite/*-plan.md
   ```
   If no matching plan, **pause and ask the user** (offer to run `/speclite-plan`).

3. Find the roadmap item:
   ```bash
   grep -n -E "^## R[0-9]{3}" specs/lite/roadmap.md
   ```
   If the item is missing or already ` - DONE`, **pause and ask the user**.

4. Mark the item ` - WIP` (replace its current status suffix) to signal work started.

5. Read the plan and implement it. Work through the plan's `## Steps`, checking off
   `- [ ]` boxes as you complete them. Follow the plan's testing section to verify.
   If reality diverges from the plan, update the plan file to match what you actually did.

6. When code is complete and the plan's steps/tests pass, mark the roadmap item ` - DONE`
   (code complete, ready to commit — DONE does not mean merged).

7. Report: what was implemented, test results, and that the item is DONE. Suggest
   `/speclite-commit` next.

## Boundaries

- Does not commit, push, or open a PR — that is `/speclite-commit`.
- DONE = code complete & verified locally, not merged.
- If multiple items/plans map to this branch (non-default flow), handle each and only mark
  an item DONE once its plan is fully implemented.
