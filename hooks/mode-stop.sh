#!/usr/bin/env bash
# speclite mode Stop hook — thin adapter over hooks/loop-check.sh.
#
# The continue/stop decision lives in loop-check.sh (the loop brain). This script only
# translates that exit code into the Stop-hook protocol:
#
#   brain exit 1 (stop)     -> exit 0 with no output, session stops normally
#   brain exit 0 (continue) -> block JSON telling the agent to run /speclite-run
#
# The "run /speclite-run now" instruction goes in BOTH `reason` and `additionalContext`:
# Claude Code / Copilot / Cursor read `additionalContext`, but platforms that only surface
# `reason` (e.g. Kiro) still need the instruction to reach the agent.
#
# Pure bash, no dependencies.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

input="$(cat)"

# Extract cwd from the Stop hook stdin JSON without a JSON parser. Fall back to $PWD.
cwd="$(printf '%s' "$input" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
[ -z "$cwd" ] && cwd="$PWD"

# Ask the brain. Exit 1 => stop; let the session end (reason is for the user, not the agent).
if ! "$here/loop-check.sh" "$cwd" >/dev/null 2>&1; then
  exit 0
fi

# Continue: block the stop and tell the agent what to do next.
cat <<'JSON'
{
  "decision": "block",
  "reason": "loop mode on — continuing the speclite pipeline. Run the /speclite-run skill now to advance it.",
  "hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": "A loop mode is enabled (specs/lite/.mode is semi-auto or full-auto) and no halt marker is set. Run the /speclite-run skill now to advance the speclite pipeline."
  }
}
JSON
exit 0
