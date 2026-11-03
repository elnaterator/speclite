# Installing speclite

speclite ships as a single plugin for **Claude Code**, **GitHub Copilot** (CLI + VS Code), and
**Cursor**, as a plugin for **Codex**, and as an Agent Skills directory for **OpenCode** and
**Kiro CLI**. Skills,
hooks, and templates are shared. One cross-platform installer
([`bin/install.js`](../bin/install.js), pure Node, zero deps) drives every target.

## Quick start (npx — no clone)

Needs Node 16+. `@latest` makes npx check the registry every run, so you always get the
current installer — nothing to install globally or keep up to date.

```bash
# install for every agent detected on your machine:
npx speclite@latest --all

# or a single agent like GitHub Copilot (CLI + VS Code):
npx speclite@latest --only copilot

# preview without writing anything:
npx speclite@latest --only copilot --dry-run
```

Targets: `--only claude`, `--only copilot`, `--only cursor`, `--only codex`,
`--only opencode`, `--only kiro` (repeatable), or `--all`. Add `--uninstall` to remove, `--list` to see
what's detected.

> Cloned the repo? Use the Makefile: `make install-copilot`, `make install-cursor`,
> `make install-claude`, `make install-codex`, `make install-opencode`, `make install-kiro`,
> `make install` (all),
> or `make uninstall`.

> No npm registry access? Run straight from GitHub instead (npx caches git packages, so
> this can lag behind the latest release): `npx -y github:elnaterator/speclite -- --all`.

## Check, repair, update

Every real install is recorded in `~/.speclite/installs.json` (target, version, git sha,
source, time; set `SPECLITE_HOME` to use another dir). Three subcommands read it:

```bash
# CLI version + what each target has installed:
npx speclite@latest version

# find stale or conflicting copies (exit 1 if any); --fix prunes the safe ones:
npx speclite@latest doctor
npx speclite@latest doctor --fix

# reinstall every recorded target from the current source:
npx speclite@latest update
```

`doctor` checks for: old Claude Code / Codex cache version dirs, an installed version older
than the source, pre-plugin `~/.codex/skills/speclite-*` copies, the VS Code fallback copy
beside a Copilot CLI install, recorded installs whose files are gone, and
`speclite-*` skills in `~/.claude/skills/` or the project's `.claude/skills/` that shadow
the plugin. `--fix` removes the first four kinds; shadowing skills are reported only (they
may be a deliberate dev setup). From a clone: `make installed`, `make doctor` (`FIX=1`),
`make update`.

To update speclite itself, run `npx speclite@latest update` — it fetches the newest release
and reinstalls every target you installed before. Claude Code, Copilot, and Codex track the
GitHub repo through their own marketplaces; `update` drives their native updaters.

Installs made before the manifest existed are not listed until you install them once more.

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
npx speclite@latest --only claude
# or, from a clone: make install-claude
```

This registers the repo as a local plugin marketplace and installs `speclite@speclite`. Needs
the `claude` CLI on PATH. Restart Claude Code (or `/reload-plugins`); verify with
`claude plugin list`.

## Cursor

```bash
npx speclite@latest --only cursor
# or, from a clone: make install-cursor
```

Copies the plugin into `~/.cursor/plugins/local/speclite`. Then run **Developer: Reload Window**
and confirm in **Settings → Rules** that the speclite skills appear (Agent Decides section).

## Codex CLI + desktop app

Codex installs speclite as a real plugin — skills and the Stop hook together, one install
covering the CLI and the ChatGPT desktop app:

```bash
npx speclite@latest --only codex
# or, from a clone: make install-codex
```

That runs `codex plugin marketplace add` then `codex plugin add speclite@speclite`, landing in
`~/.codex/plugins/cache/speclite/speclite/<version>/`. Restart Codex afterwards.

Two things to know about the loop on Codex:

- **Trust the hook once.** Codex skips untrusted hooks silently — no loop, no error. Trust it
  from `/hooks`. Headless runs need `codex exec --dangerously-bypass-hook-trust`.
- **`.halt` is the only brake.** Codex will keep building continuation prompts for as long as
  the Stop hook blocks; it has no iteration cap. That is fine for the real pipeline (every
  `speclite-run` halt path writes `.halt`) but means you should not point the hook at an agent
  that never reaches a halt.

**Sandbox caveat:** under the default `workspace-write` sandbox Codex cannot write `.git`
refs, so `speclite-plan` cannot create a branch and the pipeline halts. There is no config
toggle; use `-s danger-full-access` (or an externally sandboxed host) when you want Codex to
drive git.

## OpenCode

OpenCode gets the skills directory plus a loop plugin:

```bash
npx speclite@latest --only opencode
# or, from a clone: make install-opencode
```

- skills → `~/.config/opencode/skills/`
- loop plugin → `~/.config/opencode/plugins/speclite-loop.js`
- loop brain → `~/.config/opencode/speclite/hooks/` (kept out of the plugins dir, which
  OpenCode scans for modules)

The plugin watches `session.idle` and re-prompts the session while a loop mode is on. It is
the **interactive** path: under headless `opencode run`, `session.idle` does not fire in time,
so use the driver loop there:

```bash
bin/loop.sh --agent "opencode run"
```

## Kiro CLI

Kiro reads Agent Skills natively and its V3 engine honors a Stop block reply, so it
gets the skills directory plus a global Stop hook:

```bash
npx speclite@latest --only kiro
# or, from a clone: make install-kiro
```

- skills → `~/.kiro/skills/` (each auto-registers as a `/<name>` command)
- loop brain + adapter → `~/.kiro/speclite/hooks/`
- Stop hook → `~/.kiro/hooks/speclite-stop.json`, pointing at the installed
  `mode-stop-kiro.sh` by **absolute** path (Kiro does not expand `${CLAUDE_PLUGIN_ROOT}`).
  Like Codex, it replies with `decision` + `reason` only — Kiro silently ignores a block
  that also carries `hookSpecificOutput`.

Two things to know about the loop on Kiro:

- **V3 engine only.** Global hooks and the Stop block reply need `kiro-cli chat --v3` (or 3.0
  saved as default). The V2 engine's stop hook cannot continue a session.
- **IDE has no loop.** Kiro IDE `Stop` hooks cannot block, so drive the IDE with
  `bin/loop.sh`. `.halt` is the only brake on the CLI — Kiro has no iteration cap.

Custom Kiro agents must opt in to skills with
`resources: ["skill://~/.kiro/skills/*/SKILL.md"]`; the default agent loads them already.

`templates/` is not copied for OpenCode or Kiro — neither sets `CLAUDE_PLUGIN_ROOT`, so
`speclite-init` uses its inline template fallback.

## Compatibility

| Feature | Claude Code | Copilot CLI | VS Code / Copilot | Cursor | Codex CLI | OpenCode | Kiro CLI |
|---------|-------------|-------------|-------------------|--------|-----------|----------|----------|
| Skills (`skills/*/SKILL.md`) | ✓ | ✓ | ✓ (preview) | ✓ | ✓ | ✓ | ✓ |
| Loop driver | Stop hook | Stop hook | Stop hook (Claude-format) | Stop hook | Stop hook (Codex dialect) | plugin on `session.idle`, else `bin/loop.sh` | Stop hook (V3 engine), IDE: `bin/loop.sh` |
| Hook matchers | ✓ | ✓ | ignored | partial | n/a | n/a | n/a |
| Install | `claude plugin install` | `copilot plugin install` | auto-discovers Copilot installs | local copy | `codex plugin add` | skills dir + plugin copy | skills dir + global hook JSON |
| Preview flag | — | — | `chat.plugins.enabled` | — | — | — | `--v3` |

The same Claude-format manifest (`.claude-plugin/`) is detected by all four plugin tools — no
fork.
Known gaps: VS Code ignores hook matchers and does not expand `${CLAUDE_PLUGIN_ROOT}` for a
pure Copilot-format plugin (speclite stays Claude-format, so the Stop hook still works).
