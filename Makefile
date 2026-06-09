REPO_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))

.PHONY: help install-cursor install-claude
.DEFAULT: help

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "; blue = sprintf("%c[34m", 27); reset = sprintf("%c[0m", 27)} {printf "  %s%-15s%s %s\n", blue, $$1, reset, $$2}'

install-cursor: ## Copy plugin files to Cursor plugins directory
	@$(REPO_ROOT)/scripts/install-cursor.sh

install-claude: ## Install/update speclite in Claude Code via local marketplace
	@$(REPO_ROOT)/scripts/install-claude.sh
