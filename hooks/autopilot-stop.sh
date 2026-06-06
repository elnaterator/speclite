#!/usr/bin/env bash
# speclite autopilot Stop hook.
#
# Re-triggers the speclite pipeline by blocking the Stop event while autopilot is
# enabled and no halt marker is present. Pure bash, no dependencies.
#
# Markers (in the target repo, relative to the session cwd):
#   specs/lite/.autopilot       present => autopilot enabled (user intent)
#   specs/lite/.autopilot-halt  present => pipeline reached a gate; allow stop
#
# Decision table:
#   .autopilot absent                       -> allow stop (autopilot off)
#   .autopilot present + .autopilot-halt     -> allow stop (gate reached)
#   .autopilot present + no halt marker      -> block stop, tell Claude to run /speclite-next

set -euo pipefail

input="$(cat)"

# Extract cwd from the Stop hook stdin JSON without a JSON parser. Fall back to $PWD.
cwd="$(printf '%s' "$input" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
[ -z "$cwd" ] && cwd="$PWD"

spec_dir="$cwd/specs/lite"
flag="$spec_dir/.autopilot"
halt="$spec_dir/.autopilot-halt"

# Autopilot off -> let the session stop normally.
if [ ! -f "$flag" ]; then
  exit 0
fi

# Gate reached -> let the session stop, surface the halt reason to the user.
if [ -f "$halt" ]; then
  reason="$(cat "$halt" 2>/dev/null || true)"
  [ -z "$reason" ] && reason="autopilot halted"
  exit 0
fi

# Autopilot on, no halt -> block the stop and continue the pipeline.
cat <<'JSON'
{
  "decision": "block",
  "reason": "autopilot on — continuing the speclite pipeline",
  "hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": "Autopilot is enabled (specs/lite/.autopilot present) and no halt marker is set. Run the /speclite-next skill now to advance the speclite pipeline."
  }
}
JSON
exit 0
