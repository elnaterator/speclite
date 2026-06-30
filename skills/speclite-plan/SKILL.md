---
name: speclite-plan
description: >
  Pick the next undone roadmap item, create a git branch for it, and write an implementation
  plan from the template. Use when the user says "speclite plan", "plan next item",
  "make a plan", or invokes /speclite-plan.
---

Turn a roadmap item into a branch + plan. Default flow is 1 item → 1 plan → 1 branch, but
stay flexible: if the user asks to plan several items together, or split one item across
plans, follow their request.

## Steps

0. **Read `specs/lite/rules.md` first if it exists.** Treat its instructions as the
   highest-priority instruction set — they override this skill's own where they conflict.

1. List roadmap items with their status:
   ```bash
   grep -n -E "^## [0-9]{3}" specs/lite/roadmap.md
   ```
   Status is the title suffix: _(none)_=backlog, ` - PLANNED`, ` - WIP`, ` - BUILT`, ` - SHIPPED`.

2. List existing plans:
   ```bash
   ls specs/lite/*-plan.md 2>/dev/null
   ```

3. Choose the target item. Default: the first item with **no suffix** (backlog) that has no
   plan file yet. If the user named a specific item, use that instead.

4. Read the item's text (and neighbors for context) using the line numbers from step 1:
   ```bash
   sed -n '<start>,<end>p' specs/lite/roadmap.md
   ```

5. Verify clean state before branching:
   - Detect the trunk branch:
     ```bash
     git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
     ```
     Fall back to the first of `main`, `master`, `develop` that exists.
   - Ensure currently on trunk and `git status` is clean (uncommitted roadmap edits are OK).
   - If not on trunk or there are unrelated changes, **pause and ask the user**.

6. Create the branch. Pick `<type>` from the item kind:
   `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `build`, `ci`, `style`, `revert`.
   ```bash
   git checkout -b "<type>/<NNN>-<slug>"
   ```
   Include the issue id when the item has one: `<type>/<NNN>-<issue_id>-<slug>`.
   `<slug>` is a short kebab-case summary.

7. Create the plan from the template:
   ```bash
   cp specs/lite/plan-template.md "specs/lite/<NNN>-<slug>-plan.md"
   ```
   Fill in the plan: context (from the roadmap text), approach, concrete steps, files,
   testing, out-of-scope. Replace the `<NNN>`, branch, and issue placeholders.

8. Mark the roadmap item ` - PLANNED` (append suffix to its `## <NNN> ...` heading; replace
   any existing status suffix). Leave roadmap edits uncommitted for the user to review.

9. Report: item chosen, branch created, plan path. Suggest `/speclite-build` next.

## Boundaries

- Does not implement code — only branch + plan.
- Pauses for the user whenever trunk/clean-state checks fail.
