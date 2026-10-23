---
roadmap_id: 018
issue: n/a
---

# Plan: 018 Kiro support

## Overview

Kiro implements the Agent Skills standard and its CLI 3.0 (v3 engine) `Stop` hook honors
`{"decision":"block","reason":"…"}` — same contract as Claude Code's. So Kiro gets the core
pipeline cheaply via the 017 skills-dir helper, plus a native loop via a standalone global
hook. Research, layout, gaps: `research/kiro.md`.

In scope:

- `kiro` installer target: skills → `~/.kiro/skills/`, loop brain + adapter →
  `~/.kiro/speclite/hooks/`, global hook `~/.kiro/hooks/speclite-stop.json` pointing at the
  **absolute** adapter path (Kiro does not expand `${CLAUDE_PLUGIN_ROOT}`).
- Reuse `hooks/mode-stop.sh` if Kiro tolerates the extra `hookSpecificOutput` key; add
  `hooks/mode-stop-kiro.sh` (`reason` only, like Codex) only if it does not. **Outcome:** it
  does not — Kiro silently ignores the block — so `mode-stop-kiro.sh` execs
  `mode-stop-codex.sh`.
- `--uninstall` reverses all of it. `make install-kiro`, CI dry-run, docs.
- Live verify on the local `kiro-cli` (2.33.1).

## Acceptance criteria

- [x] `node bin/install.js --list` shows `kiro`; detect = `kiro-cli` on PATH or `~/.kiro`.
- [x] `--only kiro` copies every `skills/*` into `~/.kiro/skills/`, `hooks/` into
      `~/.kiro/speclite/hooks/`, and writes `~/.kiro/hooks/speclite-stop.json` whose command
      is an absolute path to the adapter. Re-running is idempotent.
- [x] `--only kiro --uninstall` removes exactly those: the speclite skill dirs (never the
      whole skills dir), `~/.kiro/speclite/hooks/`, and `speclite-stop.json` — nothing else
      in `~/.kiro/`.
- [x] `--only kiro --dry-run` and `--only kiro --uninstall --dry-run` exit 0 with no
      `kiro-cli` on PATH (CI invariant: missing host in dry-run = `warn`).
- [x] `make install-kiro` exists; `make ci` and `.github/workflows/ci.yml` loop over `kiro`.
- [x] Live: Kiro CLI lists the speclite skills and runs `speclite-init` (or `speclite-status`)
      in a scratch repo.
- [x] Live: under the v3 engine, with `.mode` = loop mode and no `.halt`, the Stop hook
      fires and Kiro continues the turn from `reason`; with `.halt` present it stops. Result
      (and whether `mode-stop.sh` was accepted verbatim) recorded in `research/kiro.md`.
- [x] `docs/INSTALL.md` (Kiro section + feature table), `README.md`, `CLAUDE.md` mention
      Kiro, incl. v3-engine requirement and IDE-loop gap.
- [x] `make ci` passes (also fixed pre-existing MD047 on `roadmap.md`).

## Open questions

- [x] Hook file schema — _proposed: follow `research/kiro.md` (`"version":"v1"`, trigger
      `Stop`, `action.type: "command"`); confirm against the live CLI and adjust before
      writing the installer code._
- [x] If live v3 Stop block cannot be made to work on 2.33.1 — _proposed: ship skills +
      hook anyway, document loop as unverified with `bin/loop.sh` fallback, don't block
      the item._

## Design

Generalize the `skillsDirTarget` `extras` hook in `bin/install.js` so the target-specific
step is a pair of functions (`installExtras(ctx)` / `uninstallExtras(ctx)`) rather than an
OpenCode-shaped `pluginFile` config. OpenCode's current behavior moves into its own pair,
unchanged. Kiro's pair: copy `hooks/` → `~/.kiro/speclite/hooks/`, write the hook JSON via
`writeJson` (honors `ctx.dry`); reverse on uninstall. The post-install loop message becomes
per-target (Kiro: "needs v3 engine — `kiro-cli --v3` or save 3.0 as default").

No `templates/` copy — `speclite-init` uses its inline fallback.

**Touches:**

- `bin/install.js` (mod — extras refactor, `kiro` target)
- `hooks/mode-stop-kiro.sh` (new — needed, see Overview)
- `hooks/mode-stop.sh` (mod — comment only)
- `Makefile` (mod)
- `.github/workflows/ci.yml` (mod)
- `docs/INSTALL.md`, `README.md`, `CLAUDE.md`, `CONTRIBUTING.md` (mod)
- `specs/lite/roadmap.md` (mod — status + pre-existing MD047 trailing-newline fix)
- `research/kiro.md` (mod — live findings)

## Steps

- [x] Inspect live Kiro: `kiro-cli --help`, hook docs/schema, where global hooks live,
      how to select the v3 engine.
- [x] Refactor `skillsDirTarget` extras into install/uninstall functions; confirm OpenCode
      dry-run output unchanged.
- [x] Add `kiro` target; dry-run + real install + uninstall locally, inspect `~/.kiro/`.
- [x] Live test skills + Stop-hook loop in a scratch repo; add Kiro adapter only if needed.
- [x] Makefile + CI + docs.
- [x] `make ci`.

## Testing

```bash
node bin/install.js --list
node bin/install.js --only kiro --dry-run
node bin/install.js --only kiro --uninstall --dry-run
node bin/install.js --only opencode --dry-run   # unchanged after refactor
node bin/install.js --only kiro && ls ~/.kiro/skills ~/.kiro/speclite/hooks ~/.kiro/hooks
make ci
```

Manual: scratch git repo, `echo full-auto > specs/lite/.mode`, run `kiro-cli chat --v3`,
end a turn → expect hook block + continue; `echo x > specs/lite/.halt` → expect stop.

## Out of scope

- Kiro IDE loop (IDE `Stop` cannot block; empty stdin — kirodotdev/Kiro#7500).
- Kiro Powers / root `plugin.json` one-click IDE install.
- Workspace-scoped `.kiro/` install.
