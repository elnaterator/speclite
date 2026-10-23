# Kiro support research

Backs roadmap item 018. Researched Sep 2026 against kiro-cli 2.21.1 docs; re-checked Oct 2026
against docs updated 2026-10-10 and changelog through CLI 2.28.0 / IDE 1.2.56. Still not
live-verified.

## Oct 2026 build (018) — local findings, kiro-cli 2.33.1

- Hook file schema confirmed from docs: `{"version":"v1","hooks":[{name, trigger:"Stop",
  action:{type:"command", command}}]}`; optional `description`, `timeout` (s, default 60),
  `enabled`, `confirm`. Global `~/.kiro/hooks/` is loaded by CLI V3 only.
- 2.33.1 still defaults to V2: `--agent-engine` lists `v2 (default)`; `--v3` launches V3.
- Installer writes `~/.kiro/hooks/speclite-stop.json` → absolute
  `~/.kiro/speclite/hooks/mode-stop-kiro.sh`.
- **Verified live (headless `kiro-cli chat --v3 --no-interactive --trust-all-tools`):**
  - Global `~/.kiro/hooks/*.json` load; `Stop` fires with stdin
    `{"session_id","hook_event_name":"Stop","cwd"}`; `UserPromptSubmit` also gets `prompt`.
  - `{"decision":"block","reason":"…"}` continues the turn with `reason` as the next prompt
    — compact or pretty-printed JSON both work, headless included.
  - The **same reply plus `hookSpecificOutput` is silently ignored** (no continue, no
    error). So `mode-stop.sh` cannot be reused; `hooks/mode-stop-kiro.sh` execs the
    `reason`-only `mode-stop-codex.sh`.
  - Full loop: `.mode` = semi-auto, no `.halt` → hook blocked, agent continued, wrote
    `.halt`, next Stop allowed. With `.halt` present → single turn, stops.
  - Skills: default agent lists all 9 `speclite-*`; `/speclite-init` as prompt text runs the
    skill end-to-end (inline template fallback).
- Headless `kiro-cli chat --v3 --no-interactive` with no login hangs silently (no error, no
  exit) — not a usable failure mode for `bin/loop.sh`; log in first. Logged in, headless works.

## Oct 2026 re-check — item still holds

- CLI V3 `Stop` continue is now documented two ways (hooks-migration page): exit code **1**,
  or stdout `{"decision":"block","reason":"…"}`. Exit 1 with no reason → Kiro injects a
  default continue instruction. Exit 2 cannot reject `Stop`. Generic actions page: exit 0 →
  stdout added to agent context; other codes → stderr sent to agent.
- Prefer the JSON reply (matches `mode-stop.sh`) — exit 1 continue would lose our specific
  "run /speclite-run" instruction unless stderr is also used as the reason. Verify which
  Kiro honors when both are present.
- V3 trending to default: CLI 2.26.0 (Sep 30) shows a Classic deprecation notice; 2.28.0
  (Oct 5) offers "switch to 3.0 and save as default". The `--v3` caveat below is fading.
- Stop stdin payload is `session_id`, `hook_event_name`, `cwd` only (kirodotdev/Kiro#10344) —
  enough for `loop-check.sh`.
- No documented iteration cap (unlike Copilot's 8) → `.halt` is the only brake, same as Codex.
- Other changelog: `SessionEnd` trigger + CLI install/uninstall of Powers (2.25.0); V3 tighter
  approval for hook file writes (2.26.0); IDE asks before agent edits hook files (1.2.4).
  None change the 018 plan.
- Still no Claude-plugin / `marketplace.json` import in Kiro. Skills dir + standalone hook
  JSON remains the delivery.
- Docs inconsistency: `hooks/types` page lists Agent Stop for IDE + CLI with no block
  semantics; the IDE-cannot-block gap below is unchanged.

## Why it is cheap now

- Kiro implements the Agent Skills standard: `~/.kiro/skills/<name>/SKILL.md` is global for
  IDE + CLI; `.kiro/skills/` is workspace-scoped. Folder name must equal frontmatter `name`
  (already true for every speclite skill). Each skill auto-registers as a `/<name>` slash
  command.
- CLI 3.0's `Stop` hook honors `{"decision":"block","reason":"…"}` on stdout to continue the
  session; `reason` is sent back as the next user message. Same contract as the Claude Code
  Stop hook, which was the old blocker.

## Hooks

- Standalone `.kiro/hooks/*.json` files: `"version":"v1"`, trigger `Stop`,
  `action.type: "command"`. Global hooks in `~/.kiro/hooks/` fire in every workspace.
- Command gets JSON on stdin (`cwd`, `session_id`, `hook_event_name`) and runs in the project
  root, so `mode-stop.sh`'s cwd parsing + `$PWD` fallback already fit.
- Kiro does not expand `${CLAUDE_PLUGIN_ROOT}` → hook command must be an absolute path.
- No `additionalContext`; the "run /speclite-run now" instruction must go in `reason`. 017
  makes the shared adapter emit it in both fields, so Kiro may reuse `mode-stop.sh`
  unchanged if it tolerates the extra `hookSpecificOutput` key.

## Installer layout (018)

- Detect `kiro-cli` or `~/.kiro`.
- Skills → `~/.kiro/skills/` via the shared skills-dir helper (017). `hooks/` →
  `~/.kiro/speclite/`. No `templates/` copy — `speclite-init` uses its inline fallback.
- Write `~/.kiro/hooks/speclite-stop.json` whose command is the **absolute** adapter path.
- Try the shared `mode-stop.sh` first; write `hooks/kiro-stop.sh` only if Kiro rejects the
  extra `hookSpecificOutput` key.
- `--uninstall` reverses all of it. `make install-kiro`.

## Engine + agent config

- Loop mode needs the v3 engine: `kiro-cli --v3` / `--agent-engine v3`. 2.21.x defaults to v2,
  whose `stop` hook has no block decision.
- Custom agents must opt in to skills: `resources: ["skill://~/.kiro/skills/*/SKILL.md"]`.
  The default agent auto-loads skills.
- Headless (for the 017 driver loop):
  `kiro-cli chat --no-interactive --trust-all-tools --v3 "…"`, exit codes 0/1/3, docs mention
  `KIRO_API_KEY`. Unknown: whether login-based headless works without an API key, and whether
  `/speclite-run` works as prompt text (fallback: "use the speclite-run skill").

## Known gaps / out of scope for v1

- Kiro IDE loop: docs say IDE `Stop` cannot block, and IDE command hooks get empty stdin
  (kirodotdev/Kiro#7500). IDE gets the core pipeline + driver loop only.
- Kiro Powers (Agent Plugins 1.0: root `plugin.json` + `skills/` + `mcp.json`): hooks are not
  in the portable spec, install is IDE-UI only, not Claude-plugin compatible
  (kirodotdev/Kiro#6526). Skip. Optional later: root `plugin.json` for one-click IDE skill
  install.

## Refs

- <https://kiro.dev/docs/hooks/>
- <https://kiro.dev/docs/cli/v3/hooks-migration/>
- <https://kiro.dev/docs/cli/2x-reference/> ("stop hook gained Block Decision support")
- <https://kiro.dev/docs/skills/>
- <https://kiro.dev/changelog/>
- <https://github.com/kirodotdev/Kiro/issues/10344>
- <https://github.com/Chemaclass/agnostic-ai/issues/1974> (third party reading V3 Stop exit 1 as block)
- <https://kiro.dev/docs/cli/headless/>
