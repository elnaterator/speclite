#!/usr/bin/env bash
# speclite mode Stop hook, Codex dialect — thin adapter over hooks/loop-check.sh.
#
# Same loop brain as mode-stop.sh; only the wire format differs. Codex accepts
# `additionalContext` on PreToolUse / PostToolUse / SessionStart / UserPromptSubmit /
# SubagentStart, but NOT on Stop, and it rejects the whole payload as invalid when an
# unsupported field is present — so this adapter emits `decision` + `reason` only.
#
# On Codex, a blocked Stop does not reject the turn: Codex builds a continuation prompt out
# of `reason`, so `reason` must read as an instruction to the agent, not a note to the user.
#
# Registered by hooks/hooks.codex.json, which Codex reaches via the plugin manifest's
# "hooks" field. Codex expands ${PLUGIN_ROOT} (not ${CLAUDE_PLUGIN_ROOT}).

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

input="$(cat)"

# Extract cwd from the Stop hook stdin JSON without a JSON parser. Fall back to $PWD.
cwd="$(printf '%s' "$input" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')"
[ -z "$cwd" ] && cwd="$PWD"

# Ask the brain. Exit 1 => stop; end the turn normally.
if ! "$here/loop-check.sh" "$cwd" >/dev/null 2>&1; then
  exit 0
fi

# Continue: block the stop. Codex feeds `reason` back as the next prompt.
cat <<'JSON'
{
  "decision": "block",
  "reason": "A loop mode is enabled (specs/lite/.mode is semi-auto or full-auto) and no halt marker is set. Run the speclite-run skill now to advance the speclite pipeline."
}
JSON
exit 0
