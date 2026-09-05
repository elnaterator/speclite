# Kiro support research

Backs roadmap item 018. Researched Sep 2026 against kiro-cli 2.21.1 docs; local CLI was
logged out, so nothing below is live-verified yet.

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
- <https://kiro.dev/docs/cli/headless/>
