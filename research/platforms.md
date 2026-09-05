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
| Codex CLI | Agent Skills dir | no | driver loop (`bin/loop.sh`) |
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
