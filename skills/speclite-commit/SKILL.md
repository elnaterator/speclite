---
name: speclite-commit
description: >
  Commit a completed roadmap item, push, and open a pull request. Use when the user says
  "speclite commit", "commit and PR this item", "ship this item", or invokes /speclite-commit.
---

Commit the work for the current branch's roadmap item, push, and open a PR. This skill adds
the speclite-specific checks; it delegates message formatting and PR mechanics to whatever
is available.

## Steps

0. **Read `specs/lite/system-prompt.md` first if it exists.** Treat its instructions as the
   highest-priority instruction set — they override this skill's own where they conflict.

1. Confirm the branch encodes a roadmap id:
   ```bash
   git rev-parse --abbrev-ref HEAD
   ```
   Expect `<type>/R<NNN>-...`. If no `R<NNN>` segment, **pause and ask the user**.

2. Find the plan and roadmap item for `R<NNN>`:
   ```bash
   ls specs/lite/<NNN>-*-plan.md 2>/dev/null || ls specs/lite/*-plan.md
   grep -n -E "^## R[0-9]{3}" specs/lite/roadmap.md
   ```
   If the plan is missing, **pause and ask the user**. If the item is missing, **pause**.
   The item should be ` - DONE` by now; if it is not, confirm with the user that the work is
   really complete before committing.

3. Plan-completeness check: review the plan's `## Steps` and the actual diff
   (`git status`, `git diff`). Confirm everything in the plan is implemented. If gaps remain,
   surface them and ask whether to proceed.

4. Commit. **Format the message with the best tool available**, in this order of preference:
   - the `caveman-commit` if active or else `git-helper` skill.
   - otherwise a Conventional Commits message yourself: `<type>(R<NNN>): <summary>`.
   Stage and commit all related changes (including the roadmap status update).

5. Push the branch to the remote:
   ```bash
   git push -u origin "$(git rev-parse --abbrev-ref HEAD)"
   ```

6. Open a pull request, choosing the backend by remote host:
   - **GitHub** → use the `gh` CLI:
     ```bash
     gh pr create --title "..." --body "..."
     ```
   - **Bitbucket** → use the `bkt` CLI (https://github.com/avivsinai/bitbucket-cli),
     e.g. `bkt pr create ...` (check `bkt pr create --help` for exact flags).

   PR body sections:
   - **Motivation** — the roadmap item's intent.
   - **What changed** — summary of the diff.
   - **Testing** — checklist (`- [ ]`) of how it was verified.

   Focus on a clear, concise reason for the changes, and how it was verified, rather than an exhaustive list of changes.

7. Clear the autopilot halt marker so the pipeline can resume cleanly on the next item:
   ```bash
   rm -f specs/lite/.autopilot-halt
   ```
   (Harmless if autopilot is off or the marker is absent.)

8. Report: commit sha, branch, PR URL.

## Boundaries

- Does not merge the PR.
- Does not mark the roadmap item DONE — that happens at implement time. Just ensure it is
  DONE before shipping.
- If `gh`/`bkt` is missing, push the branch and give the user a ready-to-paste PR body.
