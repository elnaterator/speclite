# Hook standardization across agents

Is there a cross-tool standard for the Stop-hook loop primitive speclite relies on?
Researched Oct 2026. Related: `platforms.md`, `kiro.md`.

## Short answer

Skills: yes. Hooks: no — convergent by imitation, not by spec.

## What is standardized

- **Agent Skills** (`SKILL.md` dir, agentskills.io, Dec 2025) — adopted by 30+ tools incl.
  Claude Code, Codex, Copilot, Cursor, OpenCode, Kiro. speclite skills ship verbatim.
- **AGENTS.md** — instructions file, under the Agentic AI Foundation (Linux Foundation,
  Dec 2025, Anthropic/OpenAI/Block). Not relevant to the loop.
- **Plugins** — no standard. Claude-format `.claude-plugin/` is read by Claude Code, Copilot
  CLI + VS Code, and Cursor (own manifest dir). Codex has its own `.codex-plugin/`. Kiro has
  Powers (no hooks in portable spec).

## Hooks: de facto Claude-shaped dialect

Every host with a blocking end-of-turn hook converged on Claude's shape: JSON on stdin,
`{"decision":"block","reason":"…"}` on stdout, `reason` becomes the next prompt. Differences
are what force per-host adapters:

| Host | Event | Continue signal | Quirks |
|------|-------|-----------------|--------|
| Claude Code | `Stop` | `decision:block` | `additionalContext` fed to model; `${CLAUDE_PLUGIN_ROOT}` |
| Copilot CLI | `agentStop` | `decision:block`, `reason` = next prompt | reads Claude plugin `hooks.json`; v1.0.72 caps at 8 consecutive blocks, sets `stop_hook_active` |
| Cursor | `stop` | Claude-compatible | expands `${CLAUDE_PLUGIN_ROOT}` |
| Codex | `Stop` | `decision:block` + `reason` only | `additionalContext` on Stop fails payload; `${PLUGIN_ROOT}`; trust gate; no cap |
| Kiro CLI V3 | `Stop` | JSON block **or** exit 1 | no path var → absolute path; no cap; IDE cannot block |
| Gemini CLI | `AfterAgent` | retry/halt via JSON | `CLAUDE_PROJECT_DIR` alias only |
| OpenCode | none (`session.idle` plugin) | `promptAsync` re-prompt | native stop hook still open upstream |

## Spec efforts (none adopted by a vendor)

- `kaija/agent-hook-spec` 0.1.0 draft — 13 core events, Claude as baseline; 8-host survey,
  no host emits all 13. ~0 adoption.
- AgentHook (agentic-thinking) — Apache 2.0 lifecycle spec, ref impl HookBus.
- Microsoft "Agent Hooks" contract — 8 interception points, governance focus (pre/post tool).
- GenAI Security Project Agent Control Standard — guardian-agent allow/deny wire spec.

All are governance/tool-gating oriented. None specify end-of-turn **continue** semantics, which
is the only thing speclite needs.

## Implications for speclite

- Keep the 017 architecture: one brain (`loop-check.sh`) + thin per-dialect adapters. No spec
  to target instead.
- `decision`+`reason`-only is the lowest common denominator (Codex, Kiro, Copilot all accept).
  `additionalContext` is Claude-only and actively breaks Codex.
- Copilot's 8-block cap + `stop_hook_active` is a useful idea: the brain could honor
  `stop_hook_active` / a counter as a second brake for capless hosts (Codex, Kiro). Not yet
  an item.
- Re-check this article when any vendor ships a spec-conformance claim.

## Refs

- <https://agentskills.io>
- <https://github.com/kaija/agent-hook-spec>
- <https://github.com/agentic-thinking/agenthook>
- <https://commandline.microsoft.com/agent-hooks-framework-neutral-ai-governance-contract/>
- <https://github.com/GenAI-Security-Project/agent-control-standard>
- <https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-hooks-reference>
- <https://geminicli.com/docs/hooks/reference/>
- <https://kiro.dev/docs/cli/v3/hooks-migration/>
