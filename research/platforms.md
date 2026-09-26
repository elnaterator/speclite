# Platform support research

Which agents speclite targets beyond Claude Code / Copilot / Cursor, how skills install on
each, and how loop mode works there. Feeds roadmap items 017 (Codex + OpenCode + driver
loop) and 018 (Kiro). Researched Sep 2026; re-verify at plan time.

## Priority

1. OpenCode
2. Codex
3. Kiro (see `kiro.md`)

## Loop strategy per platform

| Platform | Skills | Native Stop hook that can block | Loop flavor |
|----------|--------|--------------------------------|-------------|
| Claude Code | plugin | yes (`additionalContext`) | native hook |
| Copilot CLI / VS Code | plugin (Claude-format) | yes | native hook |
| Cursor | plugin copy | yes (expands `${CLAUDE_PLUGIN_ROOT}`) | native hook, shared adapter |
| Codex CLI | Agent Skills dir | **yes — undocumented, unverified** (see below) | driver loop (`bin/loop.sh`) today |
| OpenCode | Agent Skills dir | not yet (see below) | driver loop |
| Kiro CLI 3.0 | Agent Skills dir | yes (`reason` only) | native hook via absolute path |

Driver loop = fresh headless session per iteration. Safe because `speclite-run` is stateless
(all state in roadmap + git + `.mode`/`.halt`). Must be do-while: `speclite-mode` writes
`.halt` so the loop never self-starts; the first iteration is the explicit start.

On platforms with a native hook, `claude -p` / `copilot -p` also fire the Stop hook, so the
driver loop is redundant there — document it as the hook-less path only.

## OpenAI Codex CLI

- Adopted the Agent Skills standard: a skill = directory with `SKILL.md` (name + description
  frontmatter). speclite skills should work near-verbatim.
- Custom prompts in `~/.codex/prompts` are deprecated in favor of skills.
- Skills location / discovery mechanism: verify at
  <https://developers.openai.com/codex/skills> before building.
- No Stop-hook equivalent known → driver loop via `codex exec`.
- Open questions to record after live verify: slash-command syntax, implicit vs explicit
  invocation, whether `/speclite-run` works as prompt text.

## OpenCode

- Discovers `SKILL.md` skills GA. Scans `.opencode/skills`, `~/.config/opencode/skills`, and
  reportedly `.claude/skills` — verify which path is most reliable and prefer it.
  Docs: <https://opencode.ai/docs/>
- Plugin `session.idle` event can re-prompt but races in headless mode. A proper
  `session.stopping` hook is an open upstream request:
  <https://github.com/anomalyco/opencode/issues/16626> . Revisit a native OpenCode loop plugin
  when that lands; driver loop via `opencode run` until then.

## Shared installer shape

Every Agent-Skills platform needs the same thing: copy `skills/*` into a directory, reverse
on `--uninstall`, one `TARGETS` entry. Build one helper (017) and reuse it for Codex,
OpenCode, Kiro. Templates: these platforms have no `CLAUDE_PLUGIN_ROOT`, so `speclite-init`
uses its inline fallback — no need to ship `templates/`. Install all skills, including
`speclite-run` (the driver loop calls it).

## Branding

CLAUDE.md, README, and both manifests currently say "tri-platform". Update as each target
lands.

## 017 design notes (loop brain + driver loop + skills-dir installer)

- **`hooks/loop-check.sh`** — reads `specs/lite/.mode` + `.halt`; exit 0 = keep looping,
  exit 1 = stop (prints reason). Decision logic lives here only.
- **`mode-stop.sh`** — thin adapter: calls `loop-check.sh`, emits the Stop-hook JSON. Put
  the "run /speclite-run now" instruction in **both** `reason` and `additionalContext` so
  platforms without `additionalContext` (Kiro) still get it. Claude Code / Copilot / Cursor
  behavior must be unchanged; Cursor already runs this shared hook, so no separate adapter.
- **`bin/loop.sh`** — do-while: run the agent once unconditionally (mirrors an explicit
  `/speclite-run` clearing `.halt`), then `loop-check.sh` between iterations. Agent command
  *and* prompt configurable (`codex exec`, `opencode run`, `claude -p`, `copilot -p`;
  `/speclite-run` vs "use the speclite-run skill"). Same invariants: `.halt` on every halt
  path, full-auto never merges, loop never self-starts.
- **Skills-dir installer helper** — copy `skills/*` → a directory, `--uninstall` reverses,
  one `TARGETS` entry per platform, `make install-<id>`. Used by codex, opencode, kiro.
- **Verify live** — scratch repo, `/speclite-init` + one plan→build→review cycle per
  platform, then one semi-auto driver-loop run. Record invocation differences here.

## 017 live-verify findings (Sep 2026, build time)

### Codex CLI 0.146.0

- **Skills dir confirmed: `~/.codex/skills/<name>/`.** A `.system` subdir already lives there;
  the installer adds/removes only speclite's own skill dirs, never the parent.
- Skills are discovered and invoked from a headless run without any config change:
  `codex exec "Use the speclite-init skill …"` scaffolded `specs/lite/` correctly.
- **Sandbox blocks git.** Under the default `-s workspace-write`, Codex cannot write `.git`
  refs, so `speclite-plan` fails to create a branch and `speclite-run` halts with
  `branch creation blocked — unable to write .git refs`. There is **no** config key for it —
  `sandbox_workspace_write.allow_git_writes` is rejected by `--strict-config`, and the
  writable-roots knobs (`writable_roots`, `exclude_slash_tmp`, `exclude_tmpdir_env_var`) do
  not cover `.git`. Driving git needs `-s danger-full-access` or an externally sandboxed host.
- The driver loop itself behaved correctly against this: it ran one iteration, read the
  `.halt` the skill wrote, printed the reason, and stopped.

### Codex has plugins AND a blocking Stop hook — both confirmed (CLI 0.155.1, Sep 2026)

The "no Stop-hook equivalent, skills dir only" assumption above is **wrong**. Verified live.

**Plugins.** Codex shipped a plugin marketplace (27 Mar 2026). A plugin bundles skills, hooks,
MCP servers and app connectors, and installs once for **CLI + ChatGPT desktop app + VS Code
extension**. Manifest is `.codex-plugin/plugin.json` (or `plugin.json`); fields are
`name version description author homepage repository license keywords skills hooks mcpServers
apps interface`. `skills` / `hooks` / string `mcpServers` are paths that *supplement* default
discovery. Catalog is `.agents/plugins/marketplace.json`, with entries
`{name, source:{source:"local", path:"./"}, policy:{installation, authentication}, category}`.
Install: `codex plugin marketplace add <path|git>` then `codex plugin add speclite@speclite`;
it lands in `~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/`.

Gotcha: the bundled `plugin-creator` scaffold's `validate_plugin.py` rejects `hooks` as an
unknown manifest key, but the **runtime loader accepts it** — the validator is behind the spec.
Verified by installing speclite with `"hooks": "./hooks/hooks.codex.json"` and watching the
hook fire.

Second gotcha: with `source.path: "./"` Codex copies the **whole repo root** into the plugin
cache — `.git`, `specs/`, `docs/` and all. There is no exclude mechanism like the copy-based
targets' `COPY_EXCLUDES`.

**Stop hook.** Events: `SessionStart SessionEnd SubagentStart SubagentStop PreToolUse
PermissionRequest PostToolUse PreCompact PostCompact UserPromptSubmit Stop Interrupt`. A Stop
hook returning `{"decision":"block","reason":"…"}` does **not** reject the turn — Codex builds
a **continuation prompt out of `reason`**. That is the loop primitive, and it means `reason`
must read as an instruction to the agent, not a note to the user.

`additionalContext` is accepted only on PreToolUse / PostToolUse / SessionStart /
UserPromptSubmit / SubagentStart. On Stop it is not merely ignored — its presence makes Codex
**reject the whole payload** (`hook: Stop Failed`, opaque; cf. openai/codex#18887). So
`mode-stop.sh` cannot be reused verbatim; speclite ships `hooks/mode-stop-codex.sh`, a second
thin adapter over the same brain that emits `decision` + `reason` only.

Hook command paths expand `${PLUGIN_ROOT}` (and `${PLUGIN_DATA}`), not
`${CLAUDE_PLUGIN_ROOT}`. hooks.json is also read from `~/.codex/hooks.json`,
`<repo>/.codex/hooks.json` and `config.toml`, plus enabled plugins.

**Trust gate.** Non-managed hooks are skipped until the user reviews and trusts the exact hook
definition (`/hooks`). Verified: an untrusted Stop hook simply never fires, silently. Headless
automation needs `codex exec --dangerously-bypass-hook-trust`.

**No iteration cap.** Codex will keep generating continuation prompts as long as the hook
blocks. Confirmed the hard way: a test whose agent never ran `speclite-run` (so nothing ever
wrote `.halt`) looped until it hit the account usage limit. `.halt` is the **only** brake, so a
Codex Stop hook is only safe paired with an agent that actually reaches a halt path.

**Skills dirs.** Docs now list `$CWD/.agents/skills` (up to repo root), `$HOME/.agents/skills`,
`/etc/codex/skills`, then bundled. `~/.codex/skills` is undocumented but **still works** on
0.155.1 (verified). Separately, the desktop app does not index bare `~/.agents/skills` at all
(openai/codex#28505, open) though plugin-backed skills do appear — another reason the plugin,
not a skills dir, is the right Codex delivery.

### OpenCode 1.18.30 — skills dir confirmed, and plugins give a partial loop

- **Skills dir confirmed: `~/.config/opencode/skills/<name>/`.** `speclite-init` runs
  end-to-end from a headless `opencode run`.
- This is how the missing `plan-template.md` inline fallback in `speclite-init` was found:
  with no `templates/` shipped, OpenCode improvised its own plan shape. Fixed in 017; the
  re-run now writes a file byte-identical to `templates/plan-template.md`.
- **Plugins exist.** ES modules in `~/.config/opencode/plugins/` (global) or
  `.opencode/plugins/` (project), or npm packages via `opencode.json`'s `plugin` array. A
  plugin is `async ({ client, project, directory, worktree, $ }) => Hooks`. `Hooks.event`
  receives every event; `session.idle` carries `{ sessionID }`. The SDK client exposes
  `client.session.prompt` / `promptAsync`, so a plugin **can** re-prompt its own session —
  that is the loop.
- speclite ships `plugins/opencode/speclite-loop.js`: on `session.idle` it runs the same
  `hooks/loop-check.sh` brain and, on exit 0, calls `promptAsync` with the run instruction.
  All six decision branches are unit-tested (loop off / semi-auto / gate / full-auto /
  malformed mode / non-idle event).
- **Headless does not loop.** Verified: under `opencode run`, `session.idle` does not produce
  a re-prompt before the process exits — matching the known race. The plugin is therefore the
  **interactive** path; `bin/loop.sh` remains the supported headless path. The interactive
  re-prompt is not yet verified live (needs a TUI session).
- The plugins dir is scanned as modules, so the brain must not live there. The installer puts
  it in a sibling `~/.config/opencode/speclite/hooks/`; `SPECLITE_HOME` overrides.
- A native blocking stop hook is still an open upstream request
  (<https://github.com/anomalyco/opencode/issues/16626>).
