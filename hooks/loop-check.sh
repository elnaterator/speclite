#!/usr/bin/env bash
# speclite loop brain — the ONLY place the continue/stop decision lives.
#
# Every loop driver (the Stop hook on platforms that have one, bin/loop.sh on the ones that
# do not) calls this and translates the exit code. Do not duplicate this table elsewhere.
#
# Usage: loop-check.sh [repo_root]   (repo_root defaults to $PWD)
#
# Markers, relative to repo_root:
#   specs/lite/.mode   contents => default | semi-auto | full-auto (user intent)
#   specs/lite/.halt   present  => pipeline reached a gate
#
# Decision table:
#   .mode default/absent                      -> exit 1 (loop off)
#   .mode semi-auto|full-auto + .halt         -> exit 1 (gate reached; reason on stdout)
#   .mode semi-auto|full-auto + no .halt      -> exit 0 (continue)
#
# Exit 0 = keep looping. Exit 1 = stop; the reason (if any) is printed to stdout.

set -euo pipefail

root="${1:-$PWD}"
spec_dir="$root/specs/lite"
mode_file="$spec_dir/.mode"
halt="$spec_dir/.halt"

# Read the mode (file contents); default when absent/empty/unreadable.
mode="default"
if [ -f "$mode_file" ]; then
  mode="$(tr -d '[:space:]' < "$mode_file" 2>/dev/null || true)"
  [ -z "$mode" ] && mode="default"
fi

# Loop off.
if [ "$mode" != "semi-auto" ] && [ "$mode" != "full-auto" ]; then
  echo "loop mode off (.mode=$mode)"
  exit 1
fi

# Gate reached.
if [ -f "$halt" ]; then
  reason="$(cat "$halt" 2>/dev/null || true)"
  [ -z "$reason" ] && reason="speclite halted"
  echo "$reason"
  exit 1
fi

# Loop mode on, no halt marker -> continue.
exit 0
