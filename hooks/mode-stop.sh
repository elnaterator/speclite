#!/usr/bin/env bash
# speclite mode Stop hook.
#
# Re-triggers the speclite pipeline by blocking the Stop event while a loop mode is
# enabled and no halt marker is present. Pure bash, no dependencies.
#
# Markers (in the target repo, relative to the session cwd):
#   specs/lite/.mode   contents => default | semi-auto | full-auto (user intent)
#   specs/lite/.halt   present  => pipeline reached a gate; allow stop
#
# Decision table:
#   .mode default/absent                       -> allow stop (loop off)
#   .mode semi-auto|full-auto + .halt           -> allow stop (gate reached)
#   .mode semi-auto|full-auto + no halt marker  -> block stop, tell Claude to run /speclite-run

set -euo pipefail

input="$(cat)"

# Extract cwd from the Stop hook stdin JSON without a JSON parser. Fall back to $PWD.
cwd="$(printf '%s' "$input" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
[ -z "$cwd" ] && cwd="$PWD"

spec_dir="$cwd/specs/lite"
mode_file="$spec_dir/.mode"
halt="$spec_dir/.halt"

# Read the mode (file contents); default when absent/unreadable.
mode="default"
if [ -f "$mode_file" ]; then
  mode="$(tr -d '[:space:]' < "$mode_file" 2>/dev/null || true)"
  [ -z "$mode" ] && mode="default"
fi

# Loop off (default) -> let the session stop normally.
if [ "$mode" = "default" ]; then
  exit 0
fi

# Gate reached -> let the session stop, surface the halt reason to the user.
if [ -f "$halt" ]; then
  reason="$(cat "$halt" 2>/dev/null || true)"
  [ -z "$reason" ] && reason="speclite halted"
  exit 0
fi

# Loop mode on, no halt -> block the stop and continue the pipeline.
cat <<'JSON'
{
  "decision": "block",
  "reason": "loop mode on — continuing the speclite pipeline",
  "hookSpecificOutput": {
    "hookEventName": "Stop",
    "additionalContext": "A loop mode is enabled (specs/lite/.mode is semi-auto or full-auto) and no halt marker is set. Run the /speclite-run skill now to advance the speclite pipeline."
  }
}
JSON
exit 0
