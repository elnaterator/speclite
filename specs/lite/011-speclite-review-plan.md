---
roadmap_id: R011
issue: n/a
---

# Plan: R011 speclite-review skill

## Overview

Add a `speclite-review` skill that runs after `speclite-implement` and before the commit
gate. It reviews the branch diff against the plan's acceptance criteria and the system
prompt, flags drift (missing criteria, scope creep, unverified claims), and writes findings
the user can act on.

In scope:

- New `skills/speclite-review/SKILL.md` (auto-discovered, Claude-format, shared across targets).
- **Manual invocation** = always a full review, report-only by default.
- **Autopilot invocation** (`speclite-next` dispatch) = **conditional** review. Dispatcher
  decides if review is needed; records the decision + reason (skip transparency, same spirit
  as `.autopilot-halt`).
- **Mode-specific failed-review handling**: default/manual reports; semi-auto surfaces + halts
  before commit; full-auto auto-fixes flagged issues then re-reviews, looping until clean or a
  bounded retry cap, then halts rather than commit broken work.
- Wire `speclite-next` to dispatch review between `implement` (DONE) and the commit gate.

## Acceptance criteria

- [x] `skills/speclite-review/SKILL.md` exists, reads `system-prompt.md` first (Step 0), and
      is auto-discovered (no plugin.json edit needed).
- [x] Manual run reviews the full branch diff vs the plan's acceptance criteria + system
      prompt and reports findings (missing criteria, scope creep, unverified claims).
- [x] Review is report-only by default (does not edit code) outside full-auto.
- [x] Conditional-skip logic documented + implemented: review IS needed when any hold (large
      diff over threshold; unsatisfied acceptance criteria; security/irreversible/outward-facing
      surfaces; high-risk plan; system-prompt opts into always-review). SKIPPED when trivial/small,
      docs-only/single-file low-risk, or no acceptance criteria.
- [x] Skip decision + reason is recorded (transparency).
- [x] Failed-review handling differs by mode: default reports; semi-auto halts before commit;
      full-auto auto-fixes → re-reviews → loops to a bounded retry cap, then halts via
      `.autopilot-halt` if not converged.
- [x] Defensive posture: when pass/fail is indeterminate or fixes don't converge, halt rather
      than rubber-stamp.
- [x] `speclite-next` dispatch table updated to run review after DONE, before commit, honoring
      the conditional + mode-specific rules.
- [x] Docs updated (CLAUDE.md pipeline description) to include the review step.

## Open questions

- [x] Diff-size threshold for "large" — _proposed: review needed when diff touches > 5 files
      or > 200 changed lines; tunable later, no config surface in v1._
- [x] Retry cap for full-auto auto-fix loop — _proposed: 3 attempts, then halt with
      `.autopilot-halt` reason `review did not converge after 3 attempts — R<NNN>`._
- [x] Where to record the review/skip decision — _proposed: print to the session and, on skip
      under autopilot, write a one-line reason (no new persistent file in v1; reuse
      `.autopilot-halt` only for actual halts)._

## Design

`speclite-review` is the same shape as other speclite skills: a single `SKILL.md` with a
numbered Steps section, Step 0 = read `system-prompt.md`. It is a **reader + reporter** by
default, gaining write power (auto-fix) only in full-auto.

Decision flow:

1. Read system-prompt. Resolve trunk, current branch's `R<NNN>`, the matching plan, and mode.
2. Compute the branch diff vs trunk. Gather acceptance criteria from the plan.
3. **Need-review gate** (autopilot only; manual always reviews): evaluate the criteria above.
   If skipped, record reason and exit clean (lets the dispatcher continue to the commit gate).
4. **Review**: check each acceptance criterion against the diff; flag scope creep (changes not
   traceable to the plan) and unverified claims (DONE marked but criterion not evidenced).
5. **Verdict + mode handling**:
   - default/manual → report findings, no writes.
   - semi-auto → surface findings; on fail, write `.autopilot-halt` (halt before commit).
   - full-auto → on fail, auto-fix using recommendations, re-review; loop ≤ cap; on clean
     proceed; on non-convergence write `.autopilot-halt`.
6. Indeterminate pass/fail → halt (defensive).

`speclite-next` integration: insert a row/branch so that when item is `DONE` and on its
branch, the dispatcher runs `speclite-review` (conditional) **before** the commit gate. In
full-auto the order becomes implement → review → commit. Review never commits/pushes/PRs.

**Touches:**

- `skills/speclite-review/SKILL.md` (new)
- `skills/speclite-next/SKILL.md` (mod) — dispatch review before commit gate
- `CLAUDE.md` (mod) — document review step in the pipeline + invariants
- `.claude-plugin/plugin.json` / `.claude-plugin/marketplace.json` (mod) — only if the
  description enumerates skills; verify, likely no functional change

## Steps

- [x] Draft `skills/speclite-review/SKILL.md`: frontmatter (name + description triggers),
      Step 0 system-prompt, observe state (branch/plan/mode/diff), need-review gate,
      review logic, verdict + mode-specific handling, Boundaries.
- [x] Define need-review criteria + thresholds and skip-recording behavior in the SKILL.
- [x] Define full-auto auto-fix → re-review loop with bounded retry cap + halt-on-non-converge.
- [x] Update `skills/speclite-next/SKILL.md` decision table + prose to dispatch review between
      DONE and commit, honoring conditional + mode rules.
- [x] Update `CLAUDE.md` pipeline/invariants to include review.
- [x] Sanity-check plugin manifest descriptions; update if they enumerate skills.

## Testing

No build/test toolchain — verify by inspection + dogfooding:

- [x] `grep -n` the new SKILL.md has Step 0 reading system-prompt and a Boundaries section.
- [x] Manual: install plugin, on a feature branch with a plan, run `/speclite-review` →
      reports criteria coverage + drift, makes no edits.
- [x] Autopilot: with a trivial diff, dispatcher records a skip; with a large/criteria-bearing
      diff, dispatcher runs review.
- [x] full-auto failed review: confirm auto-fix loop bounded + halts via `.autopilot-halt` on
      non-convergence (walk through logic; full e2e optional).

## Out of scope

- No new persistent state files beyond reusing `.autopilot-halt` for halts.
- No config surface for thresholds (hard-coded defaults v1).
- Does not change commit/push/PR behavior — review only gates whether commit proceeds.
- Does not auto-merge anything.
