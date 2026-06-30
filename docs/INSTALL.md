# Installing speclite

speclite ships as a single plugin for **Claude Code**, **GitHub Copilot** (CLI + VS Code), and
**Cursor**. Skills, hooks, and templates are shared. One cross-platform installer
([`bin/install.js`](../bin/install.js), pure Node, zero deps) drives every target.

## Quick start (npx — no clone)

```bash
# install for every agent detected on your machine:
npx -y github:elnaterator/speclite -- --all

# or a single agent like GitHub Copilot (CLI + VS Code):
npx -y github:elnaterator/speclite -- --only copilot

# preview without writing anything:
npx -y github:elnaterator/speclite -- --only copilot --dry-run
```

Targets: `--only claude`, `--only copilot`, `--only cursor` (repeatable), or `--all`.
Add `--uninstall` to remove, `--list` to see what's detected.

> Cloned the repo? Use the Makefile: `make install-copilot`, `make install-cursor`,
> `make install-claude`, `make install` (all), or `make uninstall`.

## GitHub Copilot (CLI + VS Code)

`--only copilot` installs once into the shared `~/.copilot/installed-plugins/` location via the
`copilot` CLI — which **both** the Copilot CLI and VS Code Copilot read. The installer also flips
on the VS Code preview flag `chat.plugins.enabled`.

- Needs the [`copilot` CLI](https://docs.github.com/copilot/concepts/agents/copilot-cli) on PATH
  for the headline flow. Verify with `copilot plugin list`.
- **VS Code:** Reload Window, then **Chat → Configure Skills** to confirm the six skills.
  Requires a Copilot subscription and the **Agent Plugins** preview.
- **No `copilot` CLI but have VS Code?** The installer falls back to registering a local copy via
  `chat.pluginLocations` + `chat.plugins.enabled` (secondary path).

## Claude Code

```bash
npx -y github:elnaterator/speclite -- --only claude
# or, from a clone: make install-claude
```

This registers the repo as a local plugin marketplace and installs `speclite@speclite`. Needs
the `claude` CLI on PATH. Restart Claude Code (or `/reload-plugins`); verify with
`claude plugin list`.

## Cursor

```bash
npx -y github:elnaterator/speclite -- --only cursor
# or, from a clone: make install-cursor
```

Copies the plugin into `~/.cursor/plugins/local/speclite`. Then run **Developer: Reload Window**
and confirm in **Settings → Rules** that the speclite skills appear (Agent Decides section).

## Compatibility

| Feature | Claude Code | Copilot CLI | VS Code / Copilot | Cursor |
|---------|-------------|-------------|-------------------|--------|
| Skills (`skills/*/SKILL.md`) | ✓ | ✓ | ✓ (preview) | ✓ |
| Stop hook (loop modes) | ✓ | ✓ | ✓ (Claude-format) | ✓ |
| Hook matchers | ✓ | ✓ | ignored | partial |
| Install | `claude plugin install` | `copilot plugin install` | auto-discovers Copilot installs | local copy |
| Preview flag | — | — | `chat.plugins.enabled` | — |

The same Claude-format manifest (`.claude-plugin/`) is detected by all four tools — no fork.
Known gaps: VS Code ignores hook matchers and does not expand `${CLAUDE_PLUGIN_ROOT}` for a
pure Copilot-format plugin (speclite stays Claude-format, so the Stop hook still works).
