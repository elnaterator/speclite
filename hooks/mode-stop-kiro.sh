#!/usr/bin/env bash
# speclite mode Stop hook, Kiro CLI (V3 engine) — same wire format as the Codex adapter.
#
# Kiro V3 honors {"decision":"block","reason":"…"} on Stop and feeds `reason` back as the
# next prompt, but (verified live, kiro-cli 2.33.1) silently ignores the block when the
# reply carries the extra `hookSpecificOutput` key that mode-stop.sh emits. So Kiro reuses
# the `decision` + `reason`-only Codex adapter rather than duplicating it.
#
# Registered by the installer in ~/.kiro/hooks/speclite-stop.json by absolute path — Kiro
# does not expand ${CLAUDE_PLUGIN_ROOT}.

set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

exec "$here/mode-stop-codex.sh"
