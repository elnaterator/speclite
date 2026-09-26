#!/usr/bin/env bash
# speclite headless driver loop — the loop for platforms with no blocking Stop hook
# (Codex CLI, OpenCode). Runs a fresh headless agent session per iteration and asks the
# loop brain (hooks/loop-check.sh) whether to go again.
#
# Safe because speclite-run is stateless: all state lives in the roadmap, git, and the
# specs/lite/.mode / .halt markers, so a fresh session per iteration loses nothing.
#
# Do-while on purpose: the first iteration runs unconditionally. `speclite-mode` writes
# .halt when it sets a loop mode so the loop never self-starts — invoking this script IS
# the explicit start, mirroring /speclite-run clearing .halt.
#
# Redundant on platforms with a native Stop hook (Claude Code, Copilot, Cursor, Kiro):
# their headless modes fire the hook already. This is the hook-less path.
#
# Usage:
#   bin/loop.sh --agent "codex exec" [--prompt TEXT] [--max-iterations N] [--repo DIR]
#   bin/loop.sh --agent "opencode run"
#   SPECLITE_AGENT="codex exec" bin/loop.sh
#
# Flags (env fallback in parens):
#   --agent CMD          agent command, word-split (SPECLITE_AGENT). Required.
#   --prompt TEXT        prompt appended as one argument (SPECLITE_PROMPT).
#   --max-iterations N   cap; 0 = unlimited (SPECLITE_MAX_ITERATIONS, default 25).
#   --repo DIR           repo root to run in and read markers from (default: $PWD).
#   --dry-run            print what each iteration would run, never invoke the agent.
#
# Exits 0 when the loop halts normally, non-zero if the agent command fails.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
brain="$here/../hooks/loop-check.sh"

agent="${SPECLITE_AGENT:-}"
prompt="${SPECLITE_PROMPT:-Run the speclite-run skill now to advance the speclite pipeline.}"
max="${SPECLITE_MAX_ITERATIONS:-25}"
repo="$PWD"
dry=0

while [ $# -gt 0 ]; do
  case "$1" in
    --agent) agent="${2:-}"; shift 2 ;;
    --prompt) prompt="${2:-}"; shift 2 ;;
    --max-iterations) max="${2:-}"; shift 2 ;;
    --repo) repo="${2:-}"; shift 2 ;;
    --dry-run) dry=1; shift ;;
    -h|--help) sed -n '2,30p' "${BASH_SOURCE[0]}"; exit 0 ;;
    *) echo "loop.sh: unknown argument: $1" >&2; exit 2 ;;
  esac
done

if [ -z "$agent" ]; then
  echo "loop.sh: --agent is required (or set SPECLITE_AGENT)" >&2
  echo "  examples: --agent \"codex exec\"   --agent \"opencode run\"" >&2
  exit 2
fi

if [ ! -x "$brain" ]; then
  echo "loop.sh: loop brain not found or not executable: $brain" >&2
  exit 2
fi

if [ ! -d "$repo" ]; then
  echo "loop.sh: repo dir not found: $repo" >&2
  exit 2
fi

case "$max" in
  ''|*[!0-9]*) echo "loop.sh: --max-iterations must be a non-negative integer" >&2; exit 2 ;;
esac

# Word-split the agent command into argv (so "codex exec" becomes two args).
read -ra agent_argv <<< "$agent"

cd "$repo"

i=0
while :; do
  i=$((i + 1))
  echo "── speclite loop: iteration $i (${agent_argv[*]}) ──"
  if [ "$dry" -eq 1 ]; then
    echo "  [dry-run] would run: ${agent_argv[*]} <prompt>"
  else
    status=0
    "${agent_argv[@]}" "$prompt" || status=$?
    if [ "$status" -ne 0 ]; then
      echo "loop.sh: agent command failed (exit $status) — stopping" >&2
      exit "$status"
    fi
  fi

  if [ "$max" -ne 0 ] && [ "$i" -ge "$max" ]; then
    echo "── speclite loop: stopped — hit --max-iterations ($max) ──"
    exit 0
  fi

  # Ask the brain whether to go again. Exit 0 = continue, 1 = stop (prints the reason).
  if reason="$("$brain" "$repo")"; then
    continue
  fi
  echo "── speclite loop: stopped — ${reason:-halted} ──"
  exit 0
done
