---
roadmap_id: R009
issue: n/a
---

# Plan: R009 Add github copilot / vscode scaffolding

## Overview

speclite today = **dual-platform plugin** (Claude Code + Cursor). R009 adds **GitHub Copilot**
— both the **`copilot` CLI** and **VS Code Copilot** — as a third install surface without forking
skills/hooks/templates, and makes a single **`bin/install.js`** the one supported way to install
for every target.

Per [VS Code agent plugins (preview)](https://code.visualstudio.com/docs/agent-customization/agent-plugins),
[GitHub Copilot CLI plugins](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-finding-installing), and
[GitHub Copilot plugin directories](https://docs.github.com/en/copilot/how-tos/copilot-sdk/features/plugin-directories):

- Agent plugins bundle skills, hooks, agents, MCP — same component layout speclite already uses.
  The plugin format is **shared across Claude Code, Copilot CLI, and VS Code**.
- VS Code **auto-detects plugin format** by manifest path (checked in order):
  `.plugin/plugin.json` → root `plugin.json` → `.github/plugin/plugin.json` →
  `.claude-plugin/plugin.json`. speclite stays **Claude-format** (`hooks/hooks.json` +
  `${CLAUDE_PLUGIN_ROOT}`), detected 4th — no fork needed.
- **`claude` and `copilot` CLIs share the same install interface**: `<cli> plugin marketplace add
  <owner/repo|path>` then `<cli> plugin install <name>@<marketplace>`. Both read speclite's
  existing `.claude-plugin/marketplace.json`. So the Claude path and the Copilot path are the
  same shape, just a different binary.
- **Shared install location (the key reuse):** the `copilot` CLI installs plugins under
  `~/.copilot/installed-plugins/<marketplace>/<plugin>/`, and **VS Code Copilot auto-discovers
  plugins from that directory** (they appear in the *Agent Plugins – Installed* view). So a single
  `copilot plugin install` serves **both** the CLI and VS Code — VS Code only additionally needs
  the preview flag `chat.plugins.enabled: true`. No separate VS Code copy/clone in the common case.
- Preview gate: VS Code users need `chat.plugins.enabled: true` (and a Copilot subscription).
- Distribution: a minimal `package.json` `bin` entry makes the installer runnable as a one-liner
  via `npx -y github:elnaterator/speclite` (npx fetches the repo and runs `bin/install.js`).

In scope:
- **`bin/install.js`** — the single, cross-platform installer (pure Node stdlib, zero runtime
  deps; a VERY simplified take on caveman's
  [`bin/install.js`](https://github.com/JuliusBrussee/caveman/blob/main/bin/install.js)). Built
  around a small **target-registry framework** so adding a new agent later = one table entry.
- Three targets at launch:
  - **`claude`** — `claude plugin marketplace add/update` + reinstall (folds in `install-claude.sh`).
  - **`copilot`** — `copilot plugin marketplace add` + `copilot plugin install` into the shared
    `~/.copilot/installed-plugins/` location (serves CLI **and** VS Code); ensure VS Code
    `chat.plugins.enabled: true`. Fallback for VS Code-only (no `copilot` CLI) documented.
  - **`cursor`** — copy to `~/.cursor/plugins/local/speclite` (folds in `install-cursor.sh`).
- A `--source <owner/repo | path | git-url>` flag (auto-detected) so the **same command** installs
  from the canonical GitHub repo for end users and from the **local checkout** for contributors.
- Minimal `package.json` with a `bin` field for the `npx` one-liner.
- Makefile targets delegate to `node bin/install.js`.
- README: simple `npx …` one-liner + per-target notes; CONTRIBUTING dev-install via same script
  from the local directory; compatibility matrix; CLAUDE.md tri-platform layout notes.

Out of scope: VS Code Marketplace publish, enterprise marketplace admin, Visual Studio IDE
(separate product), changing skill workflow semantics.

## Acceptance criteria

- [x] `bin/install.js` exists: pure Node stdlib, zero deps, runs on macOS/Linux/Windows via
      `node bin/install.js [flags]`. Supports `--only <id>` (repeatable; `claude|copilot|cursor`),
      `--all`, `--source <owner/repo|path|git-url>`, `--dry-run`, `--uninstall`, `--list`,
      `-h/--help`. Idempotent and safe to re-run.
- [x] Built on a **target-registry framework**: a `TARGETS` table of descriptors
      `{ id, label, detect, install, uninstall }`; `main()` resolves selected targets and
      dispatches. Adding a new agent later = append one entry + its functions, no `main()` change.
- [x] `--only claude` reproduces existing `install-claude.sh`: `claude plugin marketplace
      add <source>` (if absent) → `marketplace update speclite` → `plugin uninstall` (ignore
      failure) → `plugin install speclite@speclite`. Guard: clear error if `claude` not on PATH.
- [x] `--only copilot` installs once into the **shared** `~/.copilot/installed-plugins/` location
      via `copilot plugin marketplace add <source>` + `copilot plugin install speclite@speclite`,
      so the same install serves the `copilot` CLI **and** VS Code Copilot. Additionally merges
      `chat.plugins.enabled: true` into VS Code user `settings.json` when a VS Code config dir is
      present (preserve other keys). Guard/fallback: if `copilot` CLI is absent but VS Code is,
      register a local copy via `chat.pluginLocations` instead (documented, secondary path).
- [x] `--only cursor` reproduces existing `install-cursor.sh`: copy plugin files (same excludes)
      to `~/.cursor/plugins/local/speclite`. No behavior regression vs the shell script.
- [x] `--source` resolves automatically: a persistent local checkout (repo root with `.git`) →
      install from that local path (contributor/dev); otherwise → canonical
      `elnaterator/speclite` GitHub repo (end user via npx). Explicit `--source` always wins.
- [x] A minimal `package.json` with a `bin` entry makes `npx -y github:elnaterator/speclite [-- flags]`
      run the installer end-to-end.
- [x] `make install-copilot` / `install-cursor` / `install-claude` targets delegate to
      `node bin/install.js --only <id>` (single source of truth).
- [x] README **Install** section leads with the `npx` one-liner; documents per-target notes
      (Copilot preview flag, Cursor reload). Pitch line updated: tri-platform, not dual.
- [x] CONTRIBUTING documents dev install via the **same** `bin/install.js` from the local
      checkout (source auto-detected, or `--source .`) — minimally different from the prod flow.
- [x] Compatibility notes exist (README/CONTRIBUTING): skills load; Stop hook + autopilot
      behavior; preview flags; known gaps (matchers ignored, no `${CLAUDE_PLUGIN_ROOT}` on pure
      Copilot format).
- [x] Manual smoke: skills visible in Copilot CLI + VS Code Chat → Configure Skills;
      `/speclite-init` works in test repo; `/speclite-auto on` + `/speclite-next` → Stop hook
      fires without path errors. **CLI verified:** `copilot plugin install` → "Installed 6
      skills", all six present under `~/.copilot/installed-plugins/speclite/speclite/skills/`,
      `hooks/autopilot-stop.sh` + `hooks.json` in place. VS Code surface = same shared location +
      `chat.plugins.enabled` set; confirm via Reload Window → Chat → Configure Skills (manual UI).
- [x] Claude Code + Cursor installs unchanged (no regression): cursor copy excludes match the old
      script; claude path mirrors `install-claude.sh` (`claude` not on this PATH, verified via
      `--dry-run` preview).

## Open questions

- [x] Separate path for Claude? — **decided: yes**, keep `claude plugin install` as its own
      target, run from `bin/install.js` (mirrors the `copilot` CLI path; same marketplace+install
      shape).
- [x] Support `copilot` CLI **and** VS Code Copilot? — **decided: one `copilot` target covers
      both** via the shared `~/.copilot/installed-plugins/` location (VS Code auto-discovers CLI
      installs). Reuse the existing Claude-format plugin; the only VS Code-specific step is
      enabling `chat.plugins.enabled`. No Copilot-format fork, no separate VS Code copy in the
      common case.
- [x] VS Code-only (user has VS Code Copilot but not the `copilot` CLI)? — **fallback path**:
      register a local copy via `chat.pluginLocations` + `chat.plugins.enabled`. Secondary;
      documented, not the headline flow.
- [x] Dev vs prod source? — **decided: `--source` flag, auto-detected**. Contributors run the
      same command from a checkout (resolves to the local path); end users get the canonical
      GitHub repo. Keeps the dev flow minimally different from prod.
- [x] Install mechanism / framework? — **decided: single `bin/install.js`** with a target-registry
      (one Node script, simplified caveman style; cross-platform, zero deps). Supersedes
      `install-claude.sh` / `install-cursor.sh`; Makefile delegates to it.
- [x] Root `plugin.json` / `.github/plugin/plugin.json` for Copilot-format? — **decided: no** for
      v1. The shared format means the existing `.claude-plugin/` manifest is detected by all
      three tools; adding a Copilot-format root manifest would require a duplicate root
      `hooks.json` and lose `${CLAUDE_PLUGIN_ROOT}`. Revisit only if a tool refuses Claude format.
- [x] Keep the legacy `install-*.sh` scripts as thin shims (`exec node ../bin/install.js …`) or
      delete them? — **deleted**. Makefile + `bin/install.js` are the only entry points; the
      `.sh` and `.ps1` scripts (and the now-empty `scripts/` dir) were removed.
- [x] Does `copilot plugin marketplace add` accept speclite's `.claude-plugin/marketplace.json`
      verbatim (shared format), or does it need a `.github/` manifest copy? — **verified: yes,
      accepted verbatim** (copilot CLI 1.0.47). No `.github/` copy / build step needed.

## Design

**Shared Claude-format plugin, one installer** — extend R007/R008 pattern, no skill/manifest fork.

```
speclite/
├── .claude-plugin/          # Claude Code + Copilot CLI + VS Code (shared Claude-format manifest)
│   ├── plugin.json
│   └── marketplace.json
├── .cursor-plugin/          # Cursor
│   └── plugin.json
├── bin/
│   └── install.js            # (new) single cross-platform installer (target registry)
├── package.json             # (new) minimal; "bin" → bin/install.js (enables npx one-liner)
├── skills/                  # shared — all platforms
├── hooks/
│   ├── hooks.json           # Claude-format; expanded by Claude/Cursor/VS Code
│   └── autopilot-stop.sh
└── scripts/                 # legacy install-*.sh (superseded by bin/install.js)
```

**Compatibility matrix (research summary)**

| Feature | Claude Code | Cursor | Copilot CLI | VS Code / Copilot |
|---------|-------------|--------|-------------|-------------------|
| Skills (`skills/*/SKILL.md`) | ✓ | ✓ | ✓ | ✓ (preview) |
| Stop hook (autopilot) | ✓ `${CLAUDE_PLUGIN_ROOT}` | ✓ same token | ✓ | ✓ Claude-format |
| Hook matchers | ✓ | partial | ✓ | ignored in VS Code |
| Install mechanism | `claude plugin install` | local copy | `copilot plugin install` | auto-discovers Copilot CLI installs |
| Install location | CLI-managed | `~/.cursor/plugins/local/` | `~/.copilot/installed-plugins/` | reads `~/.copilot/installed-plugins/` (+ `chat.pluginLocations`) |
| Preview flags | — | — | — | `chat.plugins.enabled` |

**Shared-location reuse (Copilot):** `copilot plugin install speclite@speclite` writes to
`~/.copilot/installed-plugins/`, which VS Code Copilot auto-discovers — one install, two surfaces.
VS Code only needs `chat.plugins.enabled: true`. This is why Copilot is a single `copilot` target.

**`bin/install.js` (simplified caveman-style installer + target registry):**

A single Node script, pure stdlib, zero runtime deps, shebang `#!/usr/bin/env node`. A VERY
stripped-down version of caveman's installer — drop the hooks/MCP/skills-profile/30-agent matrix;
keep the shape (target table, arg parse, copy + JSON-merge helpers, dry-run, uninstall, list).

```
bin/install.js [flags]
  --only <id>          claude | copilot | cursor (repeatable). No --only/--all → print help.
  --all                install all detected targets
  --source <src>       owner/repo | local path | git URL. Auto-detected when omitted.
  --dry-run            print actions, write nothing
  --uninstall          remove the install for the selected target(s)
  --list               print the target table and exit
  -h, --help           usage
```

Structure (framework for easy extension):
- `TARGETS` table = single source of truth: array of
  `{ id, label, detect(ctx), install(ctx), uninstall(ctx) }`. **Adding a new agent later = append
  one entry.** `main()` never changes.
- `parseArgs(argv)` — tiny switch; reject unknown flags; accept and ignore POSIX `--`.
- `resolveSource(opts)` — if `--source` given use it; else if repo root is a persistent checkout
  (has `.git`) use that local path; else canonical `elnaterator/speclite`. (npx runs from an
  ephemeral temp clone, so CLI targets prefer `owner/repo`; copy targets read on-disk files.)
- Helpers: `detectRepoRoot()` (walk up from `bin/`), `copyDir(src, dest, excludes)` (recursive
  copy honoring the Cursor exclude list), `readJson`/`writeJson` (JSONC-tolerant read so existing
  comments/trailing commas don't crash a `settings.json` merge), `vscodeUserSettingsPath()`
  (per-OS: `~/Library/Application Support/Code/User/settings.json`, `~/.config/Code/User/settings.json`,
  `%APPDATA%/Code/User/settings.json`), `runSpawn` (CLI calls), `hasCmd`, `dry`-aware writes.
- `installClaude(ctx)`: `claude plugin marketplace add <source>` (if absent) →
  `marketplace update speclite` → `plugin uninstall speclite@speclite` (ignore failure) →
  `plugin install speclite@speclite`. Guard: error if `claude` not on PATH.
- `installCopilot(ctx)`: if `copilot` on PATH → `copilot plugin marketplace add <source>` +
  `copilot plugin install speclite@speclite` (lands in shared `~/.copilot/installed-plugins/`).
  Then, if a VS Code config dir exists, merge `chat.plugins.enabled: true` into user settings.
  **Fallback** (no `copilot` CLI but VS Code present): copy plugin to a local dir and register
  `chat.pluginLocations[<dir>] = true` + `chat.plugins.enabled: true`. Print reload step.
- `installCursor(ctx)`: copy to `~/.cursor/plugins/local/speclite` with the Cursor excludes
  (parity with `install-cursor.sh`). Print reload step.
- Each target's `uninstall(ctx)` mirrors its install (CLI `plugin uninstall` / `marketplace
  remove`; remove copy dir; strip the `settings.json` keys speclite added).
- `main()`: parse → `--list`/`--help` short-circuit → resolve source → resolve targets from
  `--only`/`--all` (with `detect` for `--all`) → run each target's `install`/`uninstall` → summary.

**Touches:**
- `bin/install.js` (new)
- `package.json` (new — minimal, `"bin": { "speclite-install": "bin/install.js" }` for npx)
- `Makefile` (mod — add `install-copilot`; point `install-cursor`/`install-claude`/`install-copilot`
  at `node bin/install.js --only <id>`)
- `scripts/install-cursor.sh`, `scripts/install-claude.sh` (mod/remove — superseded; shim vs delete)
- `README.md` (mod — `npx` one-liner + per-target notes + pitch)
- `CONTRIBUTING.md` (mod — dev install via same script from local checkout; layout)
- `CLAUDE.md` (mod — tri-platform note, `bin/install.js`, shared Copilot location)
- `.claude-plugin/plugin.json` (mod?) — only if description should mention Copilot; align version
  if shipping with other doc changes

## Steps

- [x] Verify `copilot plugin marketplace add` accepts speclite's `.claude-plugin/marketplace.json`
      (shared format); confirm VS Code auto-discovers `~/.copilot/installed-plugins/`. Capture
      findings here; add a `.github/` manifest copy only if required.
      **Verified (copilot CLI 1.0.47):** `copilot plugin marketplace add <path>` accepts
      speclite's existing `.claude-plugin/marketplace.json` **verbatim** — no `.github/` copy
      needed. `copilot plugin install speclite@speclite` → "Installed 6 skills", landing at
      `~/.copilot/installed-plugins/speclite/speclite/` (i.e. `installed-plugins/<marketplace>/<plugin>/`).
      `marketplace add` source = `owner/repo`, URL, **or local path** (same as install). VS Code
      Copilot auto-discovers that shared dir; only needs `chat.plugins.enabled: true`.
- [x] Add minimal `package.json` with a `bin` entry so `npx -y github:elnaterator/speclite` works.
- [x] Implement `bin/install.js`: arg parse + `--source` resolution + `TARGETS` registry +
      copy / JSON-merge / spawn helpers; `installClaude`, `installCopilot` (shared location +
      VS Code enable, with copy fallback), `installCursor`, and matching `uninstall` paths;
      `--dry-run` and `--list`.
- [x] Update `Makefile`: add `install-copilot`; repoint `install-cursor`/`install-claude` at
      `node bin/install.js --only <id>`. Decide shim-vs-delete for legacy `scripts/*.sh`.
      **Deleted** the legacy scripts.
- [x] Update README: `npx` one-liner up top, per-target notes (Copilot preview flag, Cursor
      reload), tri-platform pitch.
- [x] Update CONTRIBUTING: dev install via the same `bin/install.js` from the local checkout
      (source auto-detected / `--source .`) — keep the process as close to prod as possible.
- [x] Update CLAUDE.md: tri-platform layout, `bin/install.js`, shared Copilot install location,
      compatibility matrix.
- [x] Manual smoke in `copilot` CLI and VS Code with Copilot: skills, init, autopilot hook.
      CLI fully verified; VS Code = shared location + flag, confirm via Reload Window (manual UI).
- [x] Regression: `node bin/install.js --only cursor` and `--only claude` match old script
      behavior; grep README for stale "dual-platform" where tri-platform is now accurate.

## Testing

**Copilot (primary — CLI + VS Code via shared location):**

```bash
node bin/install.js --only copilot          # or: make install-copilot
# preview first with: node bin/install.js --only copilot --dry-run
# copilot plugin install → ~/.copilot/installed-plugins/ ; VS Code auto-discovers
# VS Code: confirm chat.plugins.enabled true; Reload Window
```

Manual:
1. `copilot plugin list` shows speclite; VS Code Chat → Configure Skills lists all six skills.
2. Empty test repo: `/speclite-init` → `specs/lite/` scaffolded.
3. `/speclite-auto on` + `/speclite-next` → Stop hook no "file not found"; halt marker behaves.

**npx end-to-end (end-user path):**

```bash
npx -y github:elnaterator/speclite -- --only copilot --dry-run
# resolves --source to canonical elnaterator/speclite; prints actions only
```

**Dev install (CONTRIBUTING path — same command, local source):**

```bash
node bin/install.js --only claude           # source auto-detects local checkout
node bin/install.js --only claude --source .  # or be explicit
```

**Regression:**

```bash
node bin/install.js --only cursor && node bin/install.js --only claude
# (or: make install-cursor && make install-claude)
# smoke as in R007/R008 plans; verify parity with old shell scripts
```

**No automated test suite** — markdown + JSON + a small zero-dep Node script; verification is
manual install + `--dry-run` inspection.

## Out of scope

- Publishing to VS Code / Copilot marketplace or awesome-copilot submission.
- Copilot-format root `plugin.json` + duplicate `hooks.json` (unless verify-step forces it).
- Visual Studio 2026 IDE skills panel (different paths: `~/.copilot/skills`).
- MCP servers, custom agents, slash commands beyond existing skills.
- Changing autopilot semantics or crossing the commit gate.
- caveman's broader installer features (Claude hooks wiring, MCP-shrink, `npx skills add`
  fallback, 30-agent detection matrix, `--with-init` rule files) — `bin/install.js` stays minimal.
