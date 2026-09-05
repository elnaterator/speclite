REPO_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
INSTALL := node $(REPO_ROOT)/bin/install.js

.PHONY: help install install-cursor install-claude install-copilot uninstall list lint ci
.DEFAULT: help

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "; blue = sprintf("%c[34m", 27); reset = sprintf("%c[0m", 27)} {printf "  %s%-18s%s %s\n", blue, $$1, reset, $$2}'

install: ## Install into all detected targets (claude/copilot/cursor)
	@$(INSTALL) --all

install-claude: ## Install/update speclite in Claude Code via local marketplace
	@$(INSTALL) --only claude

install-copilot: ## Install for GitHub Copilot CLI + VS Code (shared location)
	@$(INSTALL) --only copilot

install-cursor: ## Copy plugin files to Cursor plugins directory
	@$(INSTALL) --only cursor

uninstall: ## Uninstall from all selected/detected targets
	@$(INSTALL) --all --uninstall

list: ## List install targets and detection status
	@$(INSTALL) --list

lint: ## Lint all markdown (same check CI runs)
	@npx -y markdownlint-cli2@0.23.2

ci: ## Run the full CI suite locally (installer dry-run + markdown lint)
	@$(INSTALL) --list
	@for t in claude copilot cursor; do $(INSTALL) --only $$t --dry-run >/dev/null || exit 1; done
	@for t in claude copilot cursor; do $(INSTALL) --only $$t --uninstall --dry-run >/dev/null || exit 1; done
	@echo "installer dry-run OK"
	@npx -y markdownlint-cli2@0.23.2
