---
roadmap_id: R010
issue: n/a
---

# Plan: R010 Support semi-auto and full-auto mode

## Overview

Replace the binary `/speclite-auto on|off` toggle with a three-state mode selector
`/speclite-mode default|semi-auto|full-auto`, stored in a git-ignored `specs/lite/.mode`
file whose contents are the literal mode string.

Modes:
- **default** — no autopilot. Pipeline only advances when a skill is invoked manually.
  Equivalent to today's `.autopilot` absent.
- **semi-auto** — today's `.autopilot` behavior: Stop hook re-triggers `/speclite-next`,
  pipeline self-advances plan → implement, **halts before commit**. Human runs
  `/speclite-commit`.
- **full-auto** — like semi-auto but also crosses the commit gate: plan → implement →
  commit → push → open PR automatically, then **halts after the PR**. Setting this mode
  must warn the user of the risk (auto-push/PR with no human review gate).

This changes a current core invariant ("autopilot never auto-commits/pushes/PRs") — that
caveat now applies only to `default`/`semi-auto`; `full-auto` deliberately crosses it.

## Acceptance criteria

- [x] `/speclite-mode semi-auto` writes `semi-auto` to `specs/lite/.mode`; `full-auto`
      and `default` likewise. No arg = report current mode + ask.
- [x] Setting `full-auto` prints an explicit risk warning before/while writing the file.
- [x] `specs/lite/.mode` is git-ignored (in repo's own `specs/lite/.gitignore` and in the
      `.gitignore` block `/speclite-init` writes).
- [x] Stop hook (`hooks/autopilot-stop.sh`) reads `.mode`: `default`/absent → allow stop;
      `semi-auto`/`full-auto` + no halt → block + run `/speclite-next`; halt present →
      allow stop.
- [x] `/speclite-next` in `semi-auto` halts at `DONE` (pre-commit gate, unchanged).
- [x] `/speclite-next` in `full-auto` at `DONE` dispatches `/speclite-commit`, then halts
      with a post-PR reason.
- [x] Legacy `.autopilot`/`.autopilot-halt` references migrated; halt marker still works.
- [x] CLAUDE.md + docs/QUESTIONS.md updated to reflect the new model.

## Open questions

- [x] Skill name: rename `skills/speclite-auto/` → `skills/speclite-mode/`?
      _proposed: yes — rename to `speclite-mode`, drop the old `speclite-auto` command
      entirely (roadmap text says "Instead of speclite-auto on/off"). No back-compat alias._
- [x] Halt marker filename — keep `.autopilot-halt` or rename to `.speclite-halt`?
      _proposed: keep `.autopilot-halt` to minimize churn across hook + speclite-next._
- [x] Does `/speclite-init` seed a `.mode` file? _proposed: no — absent `.mode` is treated
      as `default`; only add `.mode` to the git-ignore list._

## Design

`.mode` content is the single source of truth for autopilot intent, replacing the
presence-based `.autopilot` flag. Read path everywhere = `cat specs/lite/.mode` →
`default` if file absent or unreadable.

**Stop hook** (`hooks/autopilot-stop.sh`): replace the `[ -f "$flag" ]` presence test with
a content read of `.mode`. `default`/absent → `exit 0`. Otherwise: halt present → `exit 0`;
no halt → emit the block-and-continue JSON. Hook stays pure bash, no behavior change for
the commit gate (the gate decision lives in `speclite-next`, not the hook).

**`/speclite-next`**: read `.mode` at start. Decision table unchanged for `semi-auto`. New
row: branch + item `DONE` + mode `full-auto` → dispatch `/speclite-commit` (let it run to
completion), then write halt (`post-PR gate — R<NNN> shipped`). `semi-auto`/`default` keep
the existing `DONE` → halt-at-pre-commit-gate behavior.

**`/speclite-mode`** (renamed from `speclite-auto`): parse arg ∈ {default, semi-auto,
full-auto}. Write to `.mode`, clear stale `.autopilot-halt`. For `full-auto`, surface a
risk warning (auto-commit/push/PR, no human gate). No arg → print current `.mode` content
and ask.

**Touches:**
- `skills/speclite-auto/SKILL.md` → `skills/speclite-mode/SKILL.md` (mod, rename)
- `skills/speclite-next/SKILL.md` (mod — read `.mode`, full-auto commit row)
- `hooks/autopilot-stop.sh` (mod — `.mode` content read)
- `skills/speclite-init/SKILL.md` (mod — gitignore `.mode`)
- `specs/lite/.gitignore` (mod — add `.mode`; dogfood)
- `CLAUDE.md` (mod — update autopilot-markers invariant + full-auto commit caveat)
- `docs/QUESTIONS.md` (mod — record three-mode decision + rationale)

## Steps

- [x] Resolve the open questions (default to proposals).
- [x] Rename `skills/speclite-auto/` → `skills/speclite-mode/`; rewrite SKILL.md for the
      three-state arg, `.mode` writes, and the full-auto risk warning. Update the skill
      description/frontmatter.
- [x] Update `hooks/autopilot-stop.sh` to read `.mode` content instead of `.autopilot`
      presence.
- [x] Update `skills/speclite-next/SKILL.md`: read `.mode`, add the `full-auto` + `DONE`
      → `/speclite-commit` → halt-after-PR row; keep `semi-auto` pre-commit halt.
- [x] Update `skills/speclite-init/SKILL.md` gitignore block: add `.mode` (and the inline
      fallback copy, if it embeds the gitignore).
- [x] Add `.mode` to repo's own `specs/lite/.gitignore` (dogfood).
- [x] Update `CLAUDE.md` (R006/autopilot sections) and `docs/QUESTIONS.md`.
- [x] Reinstall plugin and smoke-test each mode (see Testing).

## Testing

No build/test toolchain — verify by installing + running:

```bash
claude plugin marketplace update speclite
claude plugin uninstall speclite
claude plugin install speclite@speclite   # restart Claude Code
```

- `/speclite-mode` (no arg) → reports `default`.
- `/speclite-mode semi-auto` → `.mode` == `semi-auto`; run `/speclite-next`, confirm it
  loops plan→implement and halts at `DONE` before commit.
- `/speclite-mode full-auto` → prints risk warning; `.mode` == `full-auto`; confirm at
  `DONE` it dispatches `/speclite-commit` and halts after PR.
- `git check-ignore specs/lite/.mode` → ignored.
- Hook: with `.mode`==`default`, Stop does not re-trigger; with `semi-auto`/`full-auto`
  and no halt, it blocks + runs `/speclite-next`.

## Out of scope

- Per-item mode overrides (mode is repo-global).
- Auto-merge of the PR — full-auto stops after opening the PR.
- Renaming the `.autopilot-halt` marker (kept as-is unless the open question flips).
