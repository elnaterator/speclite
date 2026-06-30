---
name: speclite-ship
description: >
  Ship a built roadmap item: commit, push, open a pull request, and mark the item SHIPPED.
  Use when the user says "speclite ship", "ship this item", "commit and PR this item", or
  invokes /speclite-ship.
---

Ship the work for the current branch's roadmap item: commit, push, open a PR, and mark the
item SHIPPED. This skill adds the speclite-specific checks; it delegates message formatting
and PR mechanics to whatever is available.

## Steps

0. **Read `specs/lite/rules.md` first if it exists.** Treat its instructions as the
   highest-priority instruction set — they override this skill's own where they conflict.

1. Confirm the branch encodes a roadmap id:
   ```bash
   git rev-parse --abbrev-ref HEAD
   ```
   Expect `<type>/<NNN>-...`. If no `<NNN>` segment, **pause and ask the user**.

2. Find the plan and roadmap item for `<NNN>`:
   ```bash
   ls specs/lite/<NNN>-*-plan.md 2>/dev/null || ls specs/lite/*-plan.md
   grep -n -E "^## [0-9]{3}" specs/lite/roadmap.md
   ```
   If the plan is missing, **pause and ask the user**. If the item is missing, **pause**.
   The item should be ` - BUILT` by now; if it is not, confirm with the user that the work is
   really complete before committing.

3. Plan-completeness check: review the plan's `## Steps` and the actual diff
   (`git status`, `git diff`). Confirm everything in the plan is implemented. If gaps remain,
   surface them and ask whether to proceed.

4. Commit. **Format the message with the best tool available**, in this order of preference:
   - the `caveman-commit` if active or else `git-helper` skill.
   - otherwise a Conventional Commits message yourself: `<type>(<NNN>): <summary>`.
   Stage and commit all related changes (including the roadmap status update).

5. Push the branch to the remote:
   ```bash
   git push -u origin "$(git rev-parse --abbrev-ref HEAD)"
   ```

6. Open a pull request. **Detect the backend from the remote** — do not assume GitHub:
   ```bash
   git remote -v
   ```
   If the URL host is Bitbucket (e.g. contains `bitbucket`, or project docs say the repo
   lives on Bitbucket Data Center) use `bkt`; otherwise use `gh`.

   - **GitHub** → use the `gh` CLI:
     ```bash
     gh pr create --title "..." --body "..."
     ```
   - **Bitbucket** → use the `bkt` CLI (https://github.com/avivsinai/bitbucket-cli):
     ```bash
     bkt pr create --title "..." --description "..."
     ```
     Common flows: `bkt pr list --mine`, `bkt pr view <id>`, `bkt pr create`,
     `bkt pr edit <id> --body`, `bkt pr comment`. Check `bkt pr create --help` for exact flags.
     **Gotchas:** `bkt pr edit --body` replaces the *whole* description (not append); and
     `--jq` returns JSON-encoded strings — decode before writing back, or the body
     double-escapes.
     **Config issues** (if `bkt` fails):
     - `no such host` (DNS / TLS trust wall when running in a sandbox) → add `bkt` to
       `sandbox.excludedCommands` so it runs unsandboxed.
     - Auth: `bkt auth status` to check, `bkt auth login https://<your-host>` to (re)authenticate.

   PR body sections:
   - **Motivation** — the roadmap item's intent.
   - **What changed** — summary of the diff.
   - **Testing** — checklist (`- [ ]`) of how it was verified.

   Focus on a clear, concise reason for the changes, and how it was verified, rather than an exhaustive list of changes.

7. Mark the roadmap item ` - SHIPPED` (replace its ` - BUILT` suffix) now that the PR is open.

8. Clear the mode halt marker so the pipeline can resume cleanly on the next item:
   ```bash
   rm -f specs/lite/.halt
   ```
   (Harmless if no loop mode is set or the marker is absent.)

9. Report: commit sha, branch, PR URL.

## Boundaries

- Does not merge the PR.
- SHIPPED = committed, pushed, PR open — not merged.
- If `gh`/`bkt` is missing, push the branch and give the user a ready-to-paste PR body.
