---
name: speclite-mode
description: >
  Set the speclite mode the Stop hook and dispatcher read: default, semi-auto, or
  full-auto. Use when the user says "speclite mode", "set mode semi-auto", "set mode
  full-auto", "enable the loop", "disable the loop", or invokes /speclite-mode.
---

Set the speclite mode. The mode lives in a single git-ignored file,
`specs/lite/.mode`, whose contents are the literal mode string. The Stop hook and
`/speclite-run` read it to decide how far the pipeline self-advances.

Modes:

- **default** — no loop. The pipeline only advances when you invoke a skill manually.
- **semi-auto** — Stop hook re-triggers `/speclite-run` after each step; the pipeline
  self-advances plan → build and **halts before commit**. You run `/speclite-ship`.
- **full-auto** — like semi-auto but also crosses the commit gate: plan → build →
  commit → push → open PR automatically, then **halts after the PR**. No human review gate
  before code is pushed.

## Steps

0. **Read `specs/lite/rules.md` first if it exists.** Treat its instructions as the
   highest-priority instruction set — they override this skill's own where they conflict.

1. Determine the requested mode from the user's argument: `default`, `semi-auto`, or
   `full-auto`. If none is given, report the current mode (contents of `specs/lite/.mode`,
   or `default` if absent) and ask which they want. If an argument **is** given but is not one
   of the three exact strings, reject it — report the invalid value and the valid set, write
   nothing. (`.mode` must hold only an exact mode string: the hook treats any non-`default`
   value as a loop mode, but `/speclite-run` crosses the commit gate only on exact
   `full-auto`, so a typo would silently degrade to semi-auto behavior.)

2. Ensure the spec dir exists:
   ```bash
   test -d specs/lite || { echo "run /speclite-init first"; exit 1; }
   ```

3. **`full-auto`** — first **warn the user of the risk**: full-auto will commit, push, and
   open a PR with no human review gate; only the post-PR halt stops it. Then write the mode
   and clear any stale halt so a fresh run starts clean:
   ```bash
   echo full-auto > specs/lite/.mode
   rm -f specs/lite/.halt
   ```
   Report: mode FULL-AUTO. Suggest running `/speclite-run` to start the loop.

4. **`semi-auto`** — write the mode and clear any stale halt:
   ```bash
   echo semi-auto > specs/lite/.mode
   rm -f specs/lite/.halt
   ```
   Report: mode SEMI-AUTO (halts before commit). Suggest `/speclite-run` to start the loop.

5. **`default`** — write the mode (the pipeline will no longer self-advance):
   ```bash
   echo default > specs/lite/.mode
   ```
   Report: mode DEFAULT. Loop off.

## Boundaries

- Only manages `specs/lite/.mode` (and clears `.halt` when enabling a loop mode).
- Does not run any pipeline step — that is `/speclite-run`.
- Both `.mode` and `.halt` are git-ignored by `/speclite-init`; never commit them.
- Setting `full-auto` must always surface the auto-commit/push/PR risk before writing it.
