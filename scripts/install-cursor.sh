#!/usr/bin/env bash
# Install speclite into Cursor's local plugins directory (copy, not symlink).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CURSOR_PLUGIN_DIR="${HOME}/.cursor/plugins/local/speclite"

rm -rf "${CURSOR_PLUGIN_DIR}"
mkdir -p "${CURSOR_PLUGIN_DIR}"
rsync -a --delete \
	--exclude '.git/' \
	--exclude '.DS_Store' \
	--exclude 'CLAUDE.md' \
	--exclude 'README.md' \
	--exclude 'CONTRIBUTING.md' \
	--exclude 'Makefile' \
	--exclude 'LICENSE' \
	--exclude 'scripts/' \
	--exclude '.claude-plugin/' \
	"${REPO_ROOT}/" "${CURSOR_PLUGIN_DIR}/"

echo "Copied speclite to ${CURSOR_PLUGIN_DIR}"
echo "Reload Cursor: Developer → Reload Window"
