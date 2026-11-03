# speclite

[![CI](https://github.com/elnaterator/speclite/actions/workflows/ci.yml/badge.svg)](https://github.com/elnaterator/speclite/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@elnaterator/speclite)](https://www.npmjs.com/package/@elnaterator/speclite)

**Spec-driven development for AI coding agents, without the ceremony.**

AI agents write code fast but drift from what you meant, forget context between sessions, and
blur the line between "done" and "shipped". speclite gives them a lightweight track to run
on: a roadmap of one-line items, a short plan per item with acceptance criteria, and one git
branch and PR per item — with a human checkpoint at every gate that matters.

```text
roadmap item → plan → build → review → PR
```

It is just markdown skills plus git. No server, no database, no build step.

## Why speclite

- **Your agent stays on intent.** Every change starts from a written plan with testable
  acceptance criteria, and a review step checks the diff against it before anything is
  committed — missing criteria, scope creep, and unverified claims get flagged.
- **State survives the session.** Status lives in the roadmap file and the branch name, not
  in the chat. Close the session, switch agents, come back next week — `/speclite-run` picks
  up exactly where you left off.
- **You stay in control.** By default each step is one command you run. Turn on a loop mode
  and it runs itself, but still stops before the commit (or after the PR) — it never merges.
- **Small and portable.** Works in any git repo, new or existing, with Claude Code, GitHub
  Copilot, Cursor, Codex, OpenCode, or Kiro. Rules for your project go in one file.

## Quick start

**1. Install** (Node 16+; detects which agents you have):

```bash
npx @elnaterator/speclite@latest --all
```

Restart your agent so it picks up the skills.

**2. Set up a repo** — in your agent, from the repo root:

```text
/speclite-init
```

This creates `specs/lite/` with a roadmap, a plan template, and a rules file. It never
overwrites anything.

**3. Add work:**

```text
/speclite-roadmap add rate-limit the login endpoint
```

This writes item `001` to `specs/lite/roadmap.md` on a `chore/roadmap-…` branch and opens a
PR for it, so roadmap changes get reviewed like code. Merge it, then run step 4. Prefer to
type it yourself? Add a `## 001 <title>` heading to the roadmap by hand.

**4. Run it:**

```text
/speclite-run
```

Run it again after each step, or turn on [autopilot](#autopilot-loop-modes). You end up with
a branch `feat/001-login-rate-limit`, a plan at `specs/lite/001-login-rate-limit-plan.md`,
the code, a review against the plan, and a PR.

## What you get

A roadmap where each heading's suffix is the item's status:

```markdown
## 001 Rate-limit the login endpoint - SHIPPED

Cap failed logins per IP and per account. Return 429 with Retry-After.

## 002 Password reset via email - WIP

## 003 Audit log for admin actions
```

And a plan per item, written before any code:

```markdown
# Plan: 002 Password reset via email

## Acceptance criteria

- [ ] Reset link expires after 30 minutes and works once
- [ ] Unknown emails get the same response as known ones (no account enumeration)
- [ ] Integration test covers request → email → reset → login

## Steps

- [ ] Token table + expiry
- [ ] POST /password-reset, POST /password-reset/confirm
- [ ] Email template + send
```

Each item moves through one lifecycle:

```text
(backlog) → PLANNED → WIP → BUILT → SHIPPED
```

`BUILT` = code complete and verified locally, not committed. `SHIPPED` = committed, pushed,
PR open. Merging is always yours.

Everything lives in one directory:

```text
specs/lite/
  roadmap.md            # ordered items 001, 002, … status in the heading suffix
  plan-template.md      # shape of every plan
  rules.md              # your project's instructions; every skill reads it first
  00N-<slug>-plan.md    # one plan per item
```

Default is 1 item = 1 plan = 1 branch, named `<type>/<NNN>-<slug>` (`feat`, `fix`, `docs`,
`chore`, …), but ask for something else and the skills follow. Trunk is auto-detected.

## Skills

| Skill | Does |
|-------|------|
| `speclite-init` | Create `specs/lite/` with roadmap, plan template + rules (idempotent) |
| `speclite-roadmap` | Shape the roadmap: investigate an idea, add items, groom the backlog |
| `speclite-plan` | Pick the next backlog item, branch, write a plan, mark PLANNED |
| `speclite-build` | Build the branch's plan; mark WIP → BUILT |
| `speclite-review` | Review the branch diff vs the plan's acceptance criteria; flag drift |
| `speclite-ship` | Plan-completeness check, commit, push, open a PR, mark SHIPPED |
| `speclite-run` | Read the state and run the right next skill; halt at gates |
| `speclite-mode` | Set the mode: default / semi-auto / full-auto |
| `speclite-status` | Read-only: where you are, and what `run` would do next |

## Autopilot (loop modes)

Pick how far speclite goes on its own with `/speclite-mode`, then start it with
`/speclite-run`:

| Mode | Runs by itself | Stops at |
|------|----------------|----------|
| `default` | nothing — one step per `/speclite-run` | after each step |
| `semi-auto` | plan → build → review | before commit — you run `/speclite-ship` |
| `full-auto` | plan → build → review → commit → push → PR | after the PR is open |

Guarantees in every mode:

- **Never merges**, and never commits on its own unless you chose `full-auto`.
- **Halts and asks** on anything ambiguous: dirty working tree, unexpected branch, missing
  roadmap item.
- **Always terminates** — every stop is recorded in `specs/lite/.halt`, and setting a mode
  never starts the loop by itself.
- In `full-auto`, a failed review is auto-fixed and re-checked up to 3 times, then halts
  rather than commit broken work.

How the loop is driven on each platform: [docs/LOOP.md](./docs/LOOP.md).

## Platforms

| Agent | Install | Autopilot |
|-------|---------|-----------|
| Claude Code | `--only claude` | ✓ Stop hook |
| GitHub Copilot (CLI + VS Code) | `--only copilot` | ✓ Stop hook |
| Cursor | `--only cursor` | ✓ Stop hook |
| Codex (CLI + desktop) | `--only codex` | ✓ Stop hook — trust it once via `/hooks` |
| OpenCode | `--only opencode` | ✓ interactive sessions |
| Kiro CLI | `--only kiro` | ✓ with `kiro-cli chat --v3` |
| Anything else / headless | — | [`bin/loop.sh`](./bin/loop.sh) |

```bash
npx @elnaterator/speclite@latest --only cursor      # one agent
npx @elnaterator/speclite@latest --list             # what's detected
```

Per-agent details: [docs/INSTALL.md](./docs/INSTALL.md).

## Keeping current

```bash
npx @elnaterator/speclite@latest update     # update everything you installed
npx @elnaterator/speclite@latest doctor     # find stale or duplicate copies (--fix to prune)
npx @elnaterator/speclite@latest version    # what is installed where
```

## Customize

`specs/lite/rules.md` is read first by every skill and overrides its defaults. Plain
sentences work:

```markdown
- Run `make test` before marking anything BUILT.
- Roadmap edits may commit straight to main (default: branch + PR).
- Bump the version in the same PR: feat → minor, fix → patch.
```

## FAQ

**Can I use it in an existing repo?** Yes. `/speclite-init` only adds `specs/lite/` and never
overwrites files.

**Does it work for a team?** The roadmap and plans are committed files, and every item gets
its own branch and PR, so it fits normal review flow. Loop mode markers are per-machine and
git-ignored.

**GitHub only?** No — `speclite-ship` detects the remote and opens PRs with `gh` (GitHub) or
[`bkt`](https://github.com/avivsinai/bitbucket-cli) (Bitbucket).

**What does autopilot cost?** Each loop step is an ordinary agent turn — the same tokens as
running the skills by hand, without the waiting.

**How is this different from heavier spec frameworks?** speclite keeps one short plan per
item and no extra tooling. If a feature needs a requirements doc, write it and link it from
the roadmap item.

## Contributing

speclite builds itself with speclite — its own roadmap lives in
[`specs/lite/roadmap.md`](./specs/lite/roadmap.md). Dev setup, core invariants, and
conventions: [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
