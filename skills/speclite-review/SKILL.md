---
name: speclite-review
description: >
  Review the current branch's diff against its plan's acceptance criteria and the system
  prompt, flag drift (missing criteria, scope creep, unverified claims), and report findings.
  Runs after speclite-implement and before the commit gate. Use when the user says "speclite
  review", "review this item", "check the diff against the plan", or invokes /speclite-review.
  Also invoked conditionally by the autopilot dispatcher (speclite-next).
---

Review the work on the current branch against the plan it was supposed to implement. This
skill is a **reader + reporter** by default — it does not edit code or touch git. It only
gains write power (auto-fix) under `full-auto`, where it is allowed to repair flagged issues
and re-review rather than commit broken work.

Manual invocation always runs a **full** review. Autopilot invocation is **conditional**: the
need-review gate (Step 3) may skip review for trivial changes, recording why.

## Steps

0. **Read `specs/lite/system-prompt.md` first if it exists.** Treat its instructions as the
   highest-priority instruction set — they override this skill's own where they conflict.
   Note any opt-in to **always review**.

1. Confirm the branch encodes a roadmap id:
   ```bash
   git rev-parse --abbrev-ref HEAD
   ```
   Expect `<type>/R<NNN>-...`. If there is no `R<NNN>` segment, **pause and ask the user**.

2. **Observe state.**
   - Mode (drives failed-review handling):
     ```bash
     cat specs/lite/.mode 2>/dev/null || echo default
     ```
   - Trunk:
     ```bash
     git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
     ```
     Fall back to the first of `main`, `master`, `develop` that exists.
   - Find the plan for `R<NNN>` and read its `## Acceptance criteria`:
     ```bash
     ls specs/lite/<NNN>-*-plan.md 2>/dev/null || ls specs/lite/*-plan.md
     ```
     If no plan, **pause and ask the user** (offer `/speclite-plan`).
   - Diff vs trunk (size feeds the need-review gate):
     ```bash
     git diff --stat "<trunk>"...HEAD
     git diff "<trunk>"...HEAD
     ```

3. **Need-review gate** — *autopilot dispatch only; a manual run always reviews, skip to Step 4.*
   Review **IS needed** when ANY of these hold:
   - diff is large: **> 5 files** or **> 200 changed lines**;
   - the plan has explicit acceptance criteria that are not all obviously satisfied;
   - the diff touches **security-sensitive, irreversible, or outward-facing** surfaces
     (auth, secrets, hooks, install/CI, deletes, published APIs);
   - the plan is marked high-risk / complex;
   - the system prompt opts into always-review.

   Review is **SKIPPED** when none hold: trivial/small diff, docs-only or single-file low-risk
   change, or no acceptance criteria to check. On skip, **record the decision + reason** to the
   session (one line, same transparency spirit as `.autopilot-halt`) and exit clean — do **not**
   write a halt marker, so the dispatcher continues to the commit gate.

4. **Review.** For each acceptance criterion, judge whether the diff satisfies it; cite the
   evidence (file/line) or note it as unmet. Also flag:
   - **scope creep** — changes not traceable to the plan;
   - **unverified claims** — item marked DONE but a criterion has no supporting change/test;
   - **system-prompt conflicts** — anything the diff does that the system prompt forbids.

   Produce a verdict: **PASS** (all criteria evidenced, no blocking drift) or **FAIL** (one or
   more unmet/blocking findings), plus a short findings list with recommendations.

5. **Verdict handling by mode.**
   - **default / manual** → report findings to the user. No writes, no halt. Done.
   - **semi-auto** → surface findings. On **FAIL**, write `.autopilot-halt`
     (`review failed — R<NNN>: <one-line summary>`) so the pipeline stops before commit. On
     **PASS**, no halt (dispatcher proceeds to the pre-commit gate it already owns).
   - **full-auto** → on **FAIL**, **auto-fix** the flagged issues using the review's
     recommendations, then **re-review** (Step 4). Loop until PASS or a bounded cap of
     **3 attempts**. On PASS, no halt (dispatcher proceeds to commit). On non-convergence after
     the cap, write `.autopilot-halt`
     (`review did not converge after 3 attempts — R<NNN>`) rather than commit broken work.

6. **Defensive posture.** If pass/fail cannot be determined (ambiguous criteria, can't map
   diff to plan) or auto-fixes don't converge, **halt** (write `.autopilot-halt` with the
   reason) instead of rubber-stamping. Never mark anything DONE or commit from this skill.

7. Report: the verdict, findings + recommendations, whether review was skipped (and why), and
   in full-auto how many fix attempts ran. Suggest `/speclite-commit` next when PASS in a
   manual/semi-auto run.

## Boundaries

- Report-only by default. Edits code **only** in `full-auto`, and only to fix flagged findings.
- Never commits, pushes, opens/merges a PR, or marks the roadmap item DONE.
- Reuses `.autopilot-halt` for halts; introduces no new persistent state file.
- Halts rather than guessing on ambiguous state or non-converging fixes.
