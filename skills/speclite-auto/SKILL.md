---
name: speclite-auto
description: >
  Toggle speclite autopilot on or off by managing the enable flag the Stop hook reads. Use
  when the user says "speclite auto on", "speclite auto off", "enable autopilot", "disable
  autopilot", or invokes /speclite-auto.
---

Turn the speclite autopilot loop on or off. Autopilot is a single flag file the Stop hook
checks: when present, the hook re-triggers `/speclite-next` after each step so the pipeline
advances on its own until a gate is hit.

## Steps

0. **Read `specs/lite/system-prompt.md` first if it exists.** Treat its instructions as the
   highest-priority instruction set — they override this skill's own where they conflict.

1. Determine the requested mode from the user's argument: `on` or `off`. If neither is given,
   report the current state (flag present or not) and ask which they want.

2. Ensure the spec dir exists:
   ```bash
   test -d specs/lite || { echo "run /speclite-init first"; exit 1; }
   ```

3. **`on`** — create the enable flag and clear any stale halt marker so a fresh run starts
   clean:
   ```bash
   touch specs/lite/.autopilot
   rm -f specs/lite/.autopilot-halt
   ```
   Report: autopilot ON. Suggest running `/speclite-next` to start the loop.

4. **`off`** — remove the enable flag (leave any halt marker; it is harmless without the flag):
   ```bash
   rm -f specs/lite/.autopilot
   ```
   Report: autopilot OFF. The pipeline will no longer self-advance.

## Boundaries

- Only manages `specs/lite/.autopilot` (and clears `.autopilot-halt` on `on`).
- Does not run any pipeline step — that is `/speclite-next`.
- Both markers are git-ignored by `/speclite-init`; never commit them.
