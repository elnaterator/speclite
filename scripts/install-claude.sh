#!/usr/bin/env bash
# Install/update speclite in Claude Code via the local plugin marketplace.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_MARKETPLACE="speclite"
CLAUDE_PLUGIN="speclite@${CLAUDE_MARKETPLACE}"

command -v claude >/dev/null 2>&1 || {
	echo "claude CLI not found — install Claude Code and ensure claude is on PATH" >&2
	exit 1
}

if ! claude plugin marketplace list 2>/dev/null | grep -q "${CLAUDE_MARKETPLACE}"; then
	echo "Adding local marketplace ${CLAUDE_MARKETPLACE} from ${REPO_ROOT}"
	claude plugin marketplace add "${REPO_ROOT}"
fi

claude plugin marketplace update "${CLAUDE_MARKETPLACE}"
claude plugin uninstall "${CLAUDE_PLUGIN}" 2>/dev/null || true
claude plugin install "${CLAUDE_PLUGIN}"

echo ""
claude plugin list | grep -E 'speclite|Plugin' || claude plugin list
echo ""
echo "Restart Claude Code (or run /reload-plugins) to load skills."
