REPO_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
INSTALL := node $(REPO_ROOT)/bin/install.js

.PHONY: help install install-cursor install-claude install-copilot install-codex install-opencode install-kiro uninstall list installed doctor update pack lint ci version bump tag
.DEFAULT: help

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "; blue = sprintf("%c[34m", 27); reset = sprintf("%c[0m", 27)} {printf "  %s%-18s%s %s\n", blue, $$1, reset, $$2}'

install: ## Install into all detected targets (claude/copilot/cursor/codex/opencode/kiro)
	@$(INSTALL) --all

install-claude: ## Install/update speclite in Claude Code via local marketplace
	@$(INSTALL) --only claude

install-copilot: ## Install for GitHub Copilot CLI + VS Code (shared location)
	@$(INSTALL) --only copilot

install-cursor: ## Copy plugin files to Cursor plugins directory
	@$(INSTALL) --only cursor

install-codex: ## Install skills into the Codex CLI skills dir
	@$(INSTALL) --only codex

install-opencode: ## Install skills into the OpenCode skills dir
	@$(INSTALL) --only opencode

install-kiro: ## Install skills + V3 Stop hook for Kiro CLI
	@$(INSTALL) --only kiro

uninstall: ## Uninstall from all selected/detected targets
	@$(INSTALL) --all --uninstall

list: ## List install targets and detection status
	@$(INSTALL) --list

installed: ## Show CLI version + what each target has installed
	@$(INSTALL) version

doctor: ## Report stale or conflicting speclite copies (FIX=1 to prune)
	@$(INSTALL) doctor $(if $(FIX),--fix)

update: ## Reinstall every target recorded in ~/.speclite/installs.json
	@$(INSTALL) update

pack: ## Show what `npm publish` would ship (no tarball written)
	@npm pack --dry-run

version: ## Print the canonical version (package.json)
	@node $(REPO_ROOT)/bin/version.js

bump: ## Stamp V=x.y.z into package.json + every plugin manifest
	@test -n "$(V)" || { echo "usage: make bump V=x.y.z"; exit 1; }
	@node $(REPO_ROOT)/bin/version.js --set $(V)

tag: ## Tag HEAD as v<version> (does not push)
	@v=$$(node $(REPO_ROOT)/bin/version.js) && git tag "v$$v" && echo "tagged v$$v — push with: git push origin v$$v"

lint: ## Lint all markdown (same check CI runs)
	@npx -y markdownlint-cli2@0.23.2

ci: ## Run the full CI suite locally (version check + installer dry-run + markdown lint)
	@node $(REPO_ROOT)/bin/version.js --check
	@$(INSTALL) --list
	@for t in claude copilot cursor codex opencode kiro; do $(INSTALL) --only $$t --dry-run >/dev/null || exit 1; done
	@for t in claude copilot cursor codex opencode kiro; do $(INSTALL) --only $$t --uninstall --dry-run >/dev/null || exit 1; done
	@tmp=$$(mktemp -d); SPECLITE_HOME=$$tmp $(INSTALL) version >/dev/null && SPECLITE_HOME=$$tmp $(INSTALL) update --dry-run >/dev/null; rc=$$?; rm -rf "$$tmp"; exit $$rc
	@echo "installer dry-run OK"
	@npm pack --dry-run >/dev/null 2>&1 && echo "npm pack OK"
	@npx -y markdownlint-cli2@0.23.2
