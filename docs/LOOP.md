# Loop modes — how the autopilot works

By default you drive the pipeline one skill at a time. A loop mode chains them for you. Pick a
mode with `/speclite-mode` (stored in `specs/lite/.mode`):

```bash
/speclite-mode semi-auto   # loop, but halt before commit (you run /speclite-ship)
/speclite-mode full-auto   # loop AND auto commit + push + open PR, halt after the PR
/speclite-mode default     # off — drive the pipeline manually
/speclite-run              # plan → (Stop hook) → build → review → halt at the gate for your mode
```

Setting a loop mode never starts the loop by itself — only an explicit `/speclite-run` does.

## The dispatcher

`speclite-run` is a pure **state-machine dispatcher** over the roadmap status plus git state.
It owns no state. Each run advances the pipeline by one step or **halts**:

| Observed state | Action |
|----------------|--------|
| `specs/lite/` missing | run `speclite-init`, then halt |
| On trunk, a backlog item exists, tree clean | run `speclite-plan` |
| On `<type>/<NNN>-…` branch, item `PLANNED` or `WIP` | run `speclite-build` |
| On branch, item `BUILT`, `default`/`semi-auto` | run `speclite-review`, then halt at the pre-commit gate |
| On branch, item `BUILT`, `full-auto` | run `speclite-review`, then `speclite-ship`, then halt after the PR |
| No backlog item left | halt — nothing to do |
| Dirty tree, off-trunk, branch without `<NNN>`, missing item | halt and ask |

## Guarantees

- **semi-auto** never commits, pushes, or opens a PR — it halts at the pre-commit gate (item
  `BUILT`); you run `/speclite-ship`. **full-auto** crosses that gate: `speclite-run`
  dispatches `/speclite-ship` at `BUILT` and halts after the PR is opened (it **never
  merges**). Setting full-auto warns you of that risk first.
- `speclite-review` runs before every commit gate. In full-auto it auto-fixes failed findings
  and re-reviews, up to 3 attempts, else halts rather than commit broken work.
- Either mode halts and asks on any ambiguous or unsafe state (dirty tree, off-trunk, branch
  without `<NNN>`, missing item).
- No infinite loop: every halt writes `specs/lite/.halt`, which tells the Stop hook to let
  the session end. Both `.mode` and `.halt` are git-ignored.

## One brain, many drivers

One script decides whether to keep going: `hooks/loop-check.sh` reads `.mode` + `.halt` and
exits 0 (continue) or 1 (stop, printing the reason). Every driver is a thin wrapper over it.

- **Claude Code, Copilot, Cursor** — platforms with a blocking Stop hook. The bundled
  `hooks/mode-stop.sh` calls the brain and re-triggers `speclite-run` after each step.
- **Codex** gets the same thing in its own dialect: speclite installs as a Codex plugin and
  registers `hooks/mode-stop-codex.sh`, which emits `reason` only (Codex rejects a Stop
  payload carrying `additionalContext`, and turns `reason` into the next prompt). Trust the
  hook once via `/hooks` before it will run; headless runs need
  `codex exec --dangerously-bypass-hook-trust`.
- **OpenCode** has no stop hook, but its plugin API does: `plugins/opencode/speclite-loop.js`
  watches `session.idle` and re-prompts the session through the SDK client. Interactive only.
- **Kiro CLI** (V3 engine) honors a Stop block reply, so the installer copies `hooks/` to
  `~/.kiro/speclite/hooks/` and registers `mode-stop-kiro.sh` (`reason` only, like Codex —
  Kiro ignores a block carrying `hookSpecificOutput`) by absolute path in
  `~/.kiro/hooks/speclite-stop.json`. Run `kiro-cli chat --v3`; Kiro IDE cannot block Stop.
- **Anywhere hook-less or headless**, drive the same loop from the shell with
  [`bin/loop.sh`](../bin/loop.sh) — a fresh session per iteration, which is safe because
  `speclite-run` is stateless:

  ```bash
  bin/loop.sh --agent "codex exec"      # or: --agent "opencode run"
  ```

  It is do-while on purpose: the first iteration runs unconditionally (setting a mode writes
  `.halt`, so the loop never self-starts), then the brain decides each subsequent one.
  `--max-iterations` caps a runaway loop.
