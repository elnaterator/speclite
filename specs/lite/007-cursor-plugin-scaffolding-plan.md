---
roadmap_id: R007
issue: n/a
---

# Plan: R007 Add cursor plugin scaffolding

## Overview

speclite ships today as a **Claude Code plugin** (`.claude-plugin/`, marketplace at repo root).
R007 adds the parallel **Cursor plugin** scaffolding so the same skills/hooks/templates work in
Cursor without duplicating the workflow.

Per [Cursor plugin docs](https://cursor.com/docs/plugins#creating-plugins) and
[cursor/plugin-template](https://github.com/cursor/plugin-template):

- Plugin = directory with `.cursor-plugin/plugin.json` + components in default folders.
- `skills/`, `hooks/hooks.json` are auto-discovered — speclite already has these.
- Local test: copy or symlink into `~/.cursor/plugins/local/<name>`, reload window.
- Single-plugin repo: manifest at **repository root**; no `marketplace.json` required (unlike
  Claude's multi-plugin marketplace pattern or the template's `plugins/*` layout).

In scope:
- `.cursor-plugin/plugin.json` manifest (name, version, description, author, keywords).
- Keep existing Claude-format `hooks/hooks.json` unchanged except a top-level `description`
  comment explaining why `${CLAUDE_PLUGIN_ROOT}` also works in Cursor (IDE-injected at runtime;
  no user env setup).
- README + CLAUDE.md install/dev notes for Cursor alongside existing Claude instructions.
- Manual verification checklist for local Cursor load.

Out of scope for this item: Cursor Marketplace submission (R013 territory), Go CLI (R008),
homebrew (R009).

## Acceptance criteria

- [x] `.cursor-plugin/plugin.json` exists at repo root with valid `name`, `version`,
      `description`, `author`, `license`, `keywords` (aligned with `.claude-plugin/plugin.json`).
- [x] Existing `skills/*` and `hooks/hooks.json` load in Cursor when plugin installed locally
      (`~/.cursor/plugins/local/speclite` or symlink).
- [x] Autopilot Stop hook runs from Cursor with existing `${CLAUDE_PLUGIN_ROOT}` command path
      (no `${CURSOR_PLUGIN_ROOT}`, no shell-script fallback).
- [x] `hooks/hooks.json` has a `description` field noting `${CLAUDE_PLUGIN_ROOT}` is
      Claude-native but Cursor expands it too when spawning plugin hooks.
- [x] README documents Cursor local install (symlink path, reload) and dual manifest layout —
      no hook env-var explanation (noise).
- [x] CLAUDE.md repo layout section mentions `.cursor-plugin/`.
- [x] Claude Code plugin still works unchanged (no regression to `.claude-plugin/` flow).

## Open questions

- [x] Single-plugin at root vs `plugins/speclite/` subfolder. — _proposed: keep root layout;
      matches current Claude marketplace (`source: "./"`) and avoids moving skills/hooks._
- [x] Add `.cursor-plugin/marketplace.json`? — _proposed: no; single-plugin repo per Cursor
      docs. Only needed for multi-plugin repos._
- [x] Hook env var: `CLAUDE_PLUGIN_ROOT` vs `CURSOR_PLUGIN_ROOT`. — _decided: `${CLAUDE_PLUGIN_ROOT}`
      only in `hooks.json`; Cursor honors it for plugin hooks. Comment in `description` field;
      no README mention._
- [x] Cursor-native hook syntax vs Claude? — _decided: keep Claude syntax (nested `Stop` /
      `type: "command"`) for now; no parallel Cursor-format `hooks.json`._
- [x] Logo asset? — _proposed: skip for v1; optional `logo` field can land later._

## Design

**Dual-manifest, shared components.** No fork of skills or templates.

```
speclite/
├── .claude-plugin/          # Claude Code (existing)
│   ├── plugin.json
│   └── marketplace.json
├── .cursor-plugin/          # Cursor (new)
│   └── plugin.json
├── skills/                  # shared — both platforms discover here
├── hooks/                   # shared
│   ├── hooks.json
│   └── autopilot-stop.sh
└── templates/               # shared (speclite-init source)
```

**Cursor `plugin.json` fields** (from plugin-template + docs reference):

| Field | Value (proposed) |
|-------|------------------|
| `name` | `speclite` (lowercase kebab-case) |
| `displayName` | `speclite` |
| `version` | `0.1.0` (sync with Claude manifest) |
| `description` | Same as Claude plugin.json |
| `author` | `{ "name": "Nathan Hadzariga" }` |
| `license` | `MIT` |
| `keywords` | spec-driven, workflow, roadmap, planning, git |

Component paths: rely on defaults (`skills/`, `hooks/hooks.json`). No manifest overrides unless
discovery fails in testing.

**Hooks.** Keep Claude plugin format as-is. Plugin hook `command` paths cannot use bare relative
paths (`./hooks/...`) — cwd is the user's workspace, not the plugin install dir. Use
`${CLAUDE_PLUGIN_ROOT}` in `hooks.json` only; both Claude Code and Cursor expand it at hook
spawn time (no user env config). Add a top-level `description` in `hooks.json` explaining the
Cursor compatibility — do not document this in README.

No changes to `autopilot-stop.sh` for plugin-root resolution (script already reads target-repo
paths from hook stdin `cwd`).

**Local dev loop (Cursor).**

```bash
ln -sf "$(pwd)" ~/.cursor/plugins/local/speclite
# Developer: Reload Window in Cursor
# Settings → Rules: verify skills listed; invoke /speclite-init in a test repo
```

Unlike Claude's cache-copy model, symlink gives live edits — document this difference.

**Touches:**
- `.cursor-plugin/plugin.json` (new)
- `hooks/hooks.json` (mod — add `description` comment only; keep `${CLAUDE_PLUGIN_ROOT}` path)
- `README.md` (mod — Cursor install + layout; no hook env-var docs)
- `CLAUDE.md` (mod)

## Steps

- [x] Add `.cursor-plugin/plugin.json` — mirror Claude metadata; follow cursor/plugin-template
      field set (`displayName`, `keywords`, `license`).
- [x] Install locally via symlink to `~/.cursor/plugins/local/speclite`; reload Cursor.
- [x] Verify skills appear (Settings → Rules / Agent Decides) and `/speclite-init` runs in a
      clean test repo.
- [x] Add `description` to `hooks/hooks.json` — why `${CLAUDE_PLUGIN_ROOT}` works in Cursor too.
- [x] Test autopilot hook: enable `/speclite-auto on`, run `/speclite-next`, confirm Stop hook
      fires without "file not found".
- [x] Update README: Cursor install section (local symlink + dual manifest); skip hook path docs.
- [x] Update CLAUDE.md repo layout + note dual-plugin identity.
- [x] Smoke-test Claude Code install still works (`claude plugin list`).

## Testing

**Cursor (primary for this item):**

```bash
ln -sf "$(pwd)" ~/.cursor/plugins/local/speclite
# Reload window in Cursor IDE
```

Manual checks:
1. Settings → Rules: `speclite-init`, `speclite-plan`, `speclite-implement`, `speclite-commit`,
   `speclite-next`, `speclite-auto` skills visible.
2. In empty repo: `/speclite-init` → creates `specs/lite/` with roadmap, plan template, system prompt.
3. `/speclite-auto on` + `/speclite-next` → Stop hook does not error; check Cursor hook logs if
   available.

**Claude Code regression:**

```bash
claude plugin marketplace update speclite
claude plugin list    # speclite enabled
```

**No automated test suite** — plugin is markdown + JSON; verification is manual install smoke.

## Out of scope

- Submitting to Cursor Marketplace (`cursor.com/marketplace/publish`).
- Team marketplace setup.
- Rules, agents, commands, or MCP servers (speclite has none today).
- Logo/branding assets.
- Changes to skill workflow semantics.
- Go CLI or homebrew (R008/R009).
