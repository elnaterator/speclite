REPO_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
CURSOR_PLUGIN_HOME := $(HOME)/.cursor/plugins/local
CURSOR_PLUGIN_DIR := $(CURSOR_PLUGIN_HOME)/speclite
CLAUDE_MARKETPLACE := speclite
CLAUDE_PLUGIN := speclite@$(CLAUDE_MARKETPLACE)

.PHONY: help load-cursor load-claude
.DEFAULT: help

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "; blue = sprintf("%c[34m", 27); reset = sprintf("%c[0m", 27)} {printf "  %s%-15s%s %s\n", blue, $$1, reset, $$2}'


load-cursor: ## Copy plugin files to Cursor plugins directory
	rm -rf $(CURSOR_PLUGIN_DIR)
	mkdir -p $(CURSOR_PLUGIN_DIR)
	rsync -a --delete \
		--exclude '.git/' \
		--exclude '.DS_Store' \
		--exclude 'CLAUDE.md' \
		--exclude 'README.md' \
		--exclude 'Makefile' \
		--exclude 'LICENSE' \
		--exclude '.claude-plugin/' \
		./ $(CURSOR_PLUGIN_DIR)/
	@echo "Copied speclite to $(CURSOR_PLUGIN_DIR)"
	@echo "Reload Cursor: Developer → Reload Window"

load-claude: ## Install/update speclite in Claude Code via local marketplace
	@command -v claude >/dev/null 2>&1 || { \
		echo "claude CLI not found — install Claude Code and ensure claude is on PATH"; \
		exit 1; \
	}
	@if ! claude plugin marketplace list 2>/dev/null | grep -q "$(CLAUDE_MARKETPLACE)"; then \
		echo "Adding local marketplace $(CLAUDE_MARKETPLACE) from $(REPO_ROOT)"; \
		claude plugin marketplace add "$(REPO_ROOT)"; \
	fi
	claude plugin marketplace update $(CLAUDE_MARKETPLACE)
	-claude plugin uninstall $(CLAUDE_PLUGIN) 2>/dev/null
	claude plugin install $(CLAUDE_PLUGIN)
	@echo ""
	@claude plugin list | grep -E 'speclite|Plugin' || claude plugin list
	@echo ""
	@echo "Restart Claude Code (or run /reload-plugins) to load skills."
