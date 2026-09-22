---
roadmap_id: 017
issue: n/a
---

# Plan: 017 loop mode everywhere — one brain, native loops on Codex + OpenCode

## Overview

Loop-continue logic lived inline in `hooks/mode-stop.sh`, so it only worked on platforms with
a blocking Claude-format Stop hook. Extract the decision into one brain and make every driver
a thin adapter over it.

Mid-build research (see `research/platforms.md`) overturned the assumption this plan started
from — that Codex and OpenCode have no native loop and need a shell driver loop:

- **Codex has plugins and a blocking Stop hook.** A plugin bundles skills + hooks and installs
  once for CLI *and* the desktop app. A Stop hook returning `decision: block` makes Codex
  build a continuation prompt from `reason`. So Codex gets a native loop, not a driver loop.
- **OpenCode has plugins.** A plugin sees `session.idle` and can re-prompt its own session via
  the SDK client — a native loop for interactive sessions (headless still races).

In scope:

- `hooks/loop-check.sh` — sole owner of the continue/stop decision.
- `hooks/mode-stop.sh` — Claude-format adapter (Claude Code, Copilot, Cursor).
- `hooks/mode-stop-codex.sh` + `hooks/hooks.codex.json` — Codex-dialect adapter.
- `plugins/opencode/speclite-loop.js` — OpenCode `session.idle` loop plugin.
- `bin/loop.sh` — headless driver loop, the fallback wherever none of the above applies.
- `.codex-plugin/plugin.json` + `.agents/plugins/marketplace.json` — Codex plugin packaging.
- Installer: `codex` as a plugin target, `opencode` as skills dir + plugin, `make` + CI + docs.

## Acceptance criteria

- [x] `hooks/loop-check.sh` exists, takes the repo root as `$1` (default `$PWD`), exits `0`
      to continue and `1` to stop, printing the halt reason on stop. No other file
      duplicates the mode/halt decision.
- [x] `hooks/mode-stop.sh` is behaviourally identical to today for all three states
      (default/absent mode, loop mode + `.halt`, loop mode + no `.halt`). The two allow-stop
      states are byte-identical (empty output, exit 0); the block JSON keeps its structure but
      its `reason` is deliberately widened to carry the "run /speclite-run now" instruction
      alongside `additionalContext` — byte-identical output and a widened `reason` are
      mutually exclusive, and the widened `reason` is the point (Kiro surfaces only `reason`).
- [x] Claude Code loop still works end-to-end after the refactor: plugin reinstalled from
      this branch, `loop-check.sh` ships alongside `mode-stop.sh` in the plugin cache, and the
      installed hook returns the block JSON for this repo's live state.
- [x] `bin/loop.sh` runs the agent once unconditionally, then consults `loop-check.sh`
      between iterations; it never self-starts from a `.halt` written by `speclite-mode`,
      and stops with the halt reason. Agent command and prompt are configurable via flags
      with env fallback; `--max-iterations` caps runaway loops.
- [x] `node bin/install.js --list` shows `codex` and `opencode`. `--only opencode` installs
      `skills/*` into the platform skills dir; `--only codex` installs the Codex plugin
      instead (the skills-dir path was superseded mid-build). `--uninstall` removes exactly
      what each target installed, and the Codex target additionally prunes the pre-plugin
      `~/.codex/skills/speclite-*` copies so an upgrade cannot leave skills defined twice.
- [x] `--only <codex|opencode> --dry-run` and the `--uninstall --dry-run` pair exit 0 on a
      machine with neither CLI present (CI invariant: missing host in dry-run = `warn`).
- [x] `make install-codex` and `make install-opencode` exist; `make ci` and
      `.github/workflows/ci.yml` cover the two new targets.
- [x] Live verify on Codex and OpenCode, findings recorded in `research/platforms.md`.
      Codex: skills discovered, `speclite-init` run end-to-end, plugin install verified,
      Stop hook verified firing and looping. OpenCode: skills discovered, `speclite-init`
      run end-to-end, plugin verified loading. The full plan → build → review cycle on Codex
      is **not** verified — its sandbox blocks `.git` writes and the user chose not to run it
      unsandboxed (see Divergences).
- [x] Codex installs as a plugin: `.codex-plugin/plugin.json` + `.agents/plugins/marketplace.json`
      are accepted by `codex plugin marketplace add` / `codex plugin add`, the plugin shows
      `installed, enabled`, and its skills and Stop hook both load from the plugin cache.
- [x] `hooks/mode-stop-codex.sh` emits `decision` + `reason` only. Verified live: with
      `additionalContext` present Codex reports `hook: Stop Failed`; without it, `hook: Stop
      Blocked` and the turn continues from `reason`.
- [x] `plugins/opencode/speclite-loop.js` calls `client.session.promptAsync` exactly when the
      brain says continue. All six branches unit-tested (loop off, semi-auto, gate reached,
      full-auto, malformed `.mode`, non-idle event), and the plugin loads in a live
      `opencode run` without error or spurious re-prompt.
- [x] `--only opencode` installs the plugin to `~/.config/opencode/plugins/` and the brain to
      a sibling `~/.config/opencode/speclite/hooks/` (never inside the scanned plugins dir);
      `--uninstall` removes both.
- [x] Branding updated off "tri-platform" in `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`,
      `docs/INSTALL.md`, and all three manifests.

## Open questions

- [x] **Resolved.** Skills dir per platform — Codex `~/.codex/skills/` works but is
      undocumented and CLI-only, so Codex moved to the plugin path instead; OpenCode confirmed
      at `~/.config/opencode/skills/<name>/`.
- [x] **Resolved.** OpenCode CLI was installed mid-build by the user, so the target is live
      verified rather than dry-run only.
- [ ] Codex plugin packaging copies the whole repo root (`source.path: "./"`), `.git` and all,
      with no exclude mechanism — *proposed: ship it as-is for 017 and note the wart; revisit
      with a pruned publish subtree if the cache size becomes a problem.*
- [ ] The OpenCode plugin's interactive re-prompt is unverified (headless provably does not
      fire `session.idle` in time) — *proposed: ship it, documented as interactive-only with
      `bin/loop.sh` as the supported headless path, and confirm in a TUI session later.*

## Design

**One brain.** `hooks/loop-check.sh` owns the table that today lives inside the Stop hook:

| `.mode` | `.halt` | exit | meaning |
|---------|---------|------|---------|
| `default` / absent | any | 1 | loop off |
| `semi-auto` / `full-auto` | present | 1 | gate reached (prints reason) |
| `semi-auto` / `full-auto` | absent | 0 | continue |

Every consumer becomes thin, and there are now four:

| Driver | Platform | Translates exit 0 into |
|--------|----------|------------------------|
| `hooks/mode-stop.sh` | Claude Code, Copilot, Cursor | block JSON with `reason` + `additionalContext` |
| `hooks/mode-stop-codex.sh` | Codex CLI + desktop | block JSON, `reason` only (Codex rejects `additionalContext` on Stop) |
| `plugins/opencode/speclite-loop.js` | OpenCode (interactive) | `client.session.promptAsync` on `session.idle` |
| `bin/loop.sh` | anything hook-less / headless | one more agent invocation |

Exit 1 always means the same thing: end the turn, print the reason. No driver reimplements
the table.

**Driver loop.** Do-while, because `speclite-mode` deliberately writes `.halt` when setting a
loop mode — the first iteration is the explicit start (mirrors `/speclite-run` clearing
`.halt`). Fresh headless session per iteration is safe: `speclite-run` is stateless, all
state lives in the roadmap, git, and the markers. Redundant on hook platforms — document it
as the hook-less path.

**Installer helper.** `skillsDirTarget({ id, label, dir, detect })` returns a TARGETS entry
whose install copies each `skills/*` subdir into `dir` and whose uninstall removes only
those subdirs (never the whole skills dir — other tools' skills live there). Honors
`ctx.dry`; a missing host CLI in dry-run is a `warn`, matching `installClaude` /
`installCopilot`. Templates are not shipped: these platforms have no `CLAUDE_PLUGIN_ROOT`,
so `speclite-init` uses its inline fallback.

**Codex packaging.** `.codex-plugin/plugin.json` declares `skills: "./skills/"` and
`hooks: "./hooks/hooks.codex.json"`; `.agents/plugins/marketplace.json` points at `./` so the
repo root is the plugin. Codex expands `${PLUGIN_ROOT}` in hook commands.

**OpenCode packaging.** The plugin is one ES module copied into the plugins dir. Because
OpenCode loads *every* module it finds there, the brain goes in a sibling
`~/.config/opencode/speclite/hooks/` instead, resolved relative to the plugin (or via
`SPECLITE_HOME`).

**Touches:**

- `hooks/loop-check.sh` (new)
- `hooks/mode-stop.sh` (mod)
- `hooks/mode-stop-codex.sh` (new)
- `hooks/hooks.codex.json` (new)
- `.codex-plugin/plugin.json` (new)
- `.agents/plugins/marketplace.json` (new)
- `plugins/opencode/speclite-loop.js` (new)
- `bin/loop.sh` (new)
- `bin/install.js` (mod — skills-dir helper, codex plugin target, opencode plugin extras)
- `Makefile` (mod), `.github/workflows/ci.yml` (mod)
- `README.md`, `CLAUDE.md`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`,
  `.cursor-plugin/plugin.json` (mod — branding)
- `research/platforms.md` (mod — live-verify findings)

## Steps

- [x] 1. Add `hooks/loop-check.sh` with the decision table; `chmod +x`.
- [x] 2. Rewrite `hooks/mode-stop.sh` as an adapter over it; keep the three output states
      identical and add the instruction to `reason` as well as `additionalContext`.
- [x] 3. Verify the Claude Code loop still works (reinstall plugin, semi-auto run to gate).
- [x] 4. Add `bin/loop.sh` (do-while, `--agent`/`--prompt`/`--max-iterations`, env
      fallback); `chmod +x`.
- [x] 5. Add `skillsDirTarget()` to `bin/install.js` and register `codex` + `opencode`.
- [x] 6. Live-verify Codex: install, `/speclite-init`, plugin install, Stop hook firing.
      The plan → build → review cycle is **not** verified — Codex's sandbox blocks `.git`
      writes and the user declined an unsandboxed run. Quirks in `research/platforms.md`.
- [x] 7. Same for OpenCode: skills discovered, `speclite-init` end-to-end, plugin loads.
      Interactive re-prompt unverified (headless provably does not fire `session.idle`).
- [x] 8. Extend `Makefile` targets and `make ci` / `.github/workflows/ci.yml` to the two new
      target ids.
- [x] 9. Update branding + install docs (README, CLAUDE.md, INSTALL, manifests).
- [x] 10. Research Codex/OpenCode plugin systems; ship Codex as a plugin (manifest,
      marketplace, `mode-stop-codex.sh`) and OpenCode as skills dir + `session.idle` plugin.
- [x] 11. Prune the pre-plugin `~/.codex/skills/speclite-*` copies on Codex install and
      uninstall so an upgrade cannot leave every skill defined twice.

## Testing

```bash
make ci                                   # installer dry-run (5 targets) + markdown lint
node bin/install.js --list                # codex + opencode listed
node bin/install.js --only codex --dry-run
node bin/install.js --only codex --uninstall --dry-run
```

Brain unit checks in a scratch repo — assert exit codes for each row of the table:

```bash
bash hooks/loop-check.sh /path/to/scratch; echo $?
```

Stop-hook parity: pipe `{"cwd":"/path/to/scratch"}` into `hooks/mode-stop.sh` under all
three marker states and diff against the pre-refactor output.

Manual: one semi-auto `/speclite-run` cycle in Claude Code (hook path) and one `bin/loop.sh`
run per new platform (driver path), each halting at the pre-commit gate.

## Out of scope

- Kiro target (roadmap item 018).
- A native OpenCode loop plugin — blocked on upstream `session.stopping`
  (<https://github.com/anomalyco/opencode/issues/16626>); driver loop until then.
- Any change to speclite pipeline semantics (statuses, gates, full-auto never merging).

## Divergences from the plan as written

Recorded during build; the plan above is updated to match.

1. **Hook parity is behavioural, not byte-for-byte.** The two allow-stop states are
   byte-identical. The block JSON's `reason` was deliberately widened to carry the
   "run /speclite-run now" instruction — the plan asked for both byte-identical output *and*
   that widened `reason`, which cannot both hold. The widened `reason` wins: it is the whole
   reason for putting the instruction in two fields.
2. **The brain is stricter than the old hook on a malformed `.mode`.** The old hook treated
   *anything* other than `default` as a loop mode, so a typo'd mode file looped forever.
   `loop-check.sh` continues only for exactly `semi-auto` / `full-auto` and stops otherwise.
   Deliberate fail-safe change.
3. **Codex live verify is partial.** `~/.codex/skills/` confirmed; skills are discovered and
   run headlessly (`speclite-init` verified end to end). But under Codex's default
   `workspace-write` sandbox the agent cannot write `.git` refs, so `speclite-plan` cannot
   branch and the pipeline halts immediately. No config toggle exists for this. Completing a
   plan → build → review cycle on Codex needs `-s danger-full-access` (an unsandboxed agent
   run), which is a call for the user, not a default. The driver loop machinery itself was
   verified against this run: one iteration, halt reason read, clean stop.
4. **OpenCode live verify happened after all** — the user installed the CLI mid-build.
   That verify is what surfaced the missing `plan-template.md` inline fallback in
   `speclite-init` (fixed here: with no `templates/` shipped, the agent was improvising a plan
   shape).
5. **Scope grew: both platforms have plugin systems with native loops.** The plan assumed
   "skills dir + shell driver loop" for Codex and OpenCode. Research during the build proved
   otherwise, so 017 now ships:
   - Codex as a **plugin** (skills + Stop hook, one install covering CLI and desktop app),
     with `hooks/mode-stop-codex.sh` because Codex rejects a Stop payload containing
     `additionalContext`.
   - OpenCode as **skills dir + loop plugin** re-prompting on `session.idle`.

   `bin/loop.sh` stays, demoted from "the Codex/OpenCode path" to the hook-less/headless
   fallback. Roadmap item text updated to match.
6. **Codex has no loop cap of its own.** A Stop hook that keeps blocking will keep generating
   continuation prompts; `.halt` is the only brake. Learned by burning an account usage limit
   with a test whose agent never reached a halt path.
7. **Codex hook trust is a real gate.** An untrusted Stop hook is skipped silently — no loop,
   no error. Interactive users trust once via `/hooks`; headless needs
   `--dangerously-bypass-hook-trust`.
