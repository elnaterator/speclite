---
roadmap_id: 015
issue: n/a
---

# Plan: 015 speclite-roadmap skill

## Overview

Add `speclite-roadmap` — the skill that shapes the roadmap itself. Today every skill *reads*
roadmap status and the pipeline skills flip status suffixes, but nothing owns roadmap **text**:
adding items, minting ids, splitting/merging backlog entries, and capturing the research behind
an idea. That work is done ad hoc by hand today (see commit `3b39b9e`).

In scope:

- **investigate** flow — take a rough idea, explore repo + roadmap + `docs/QUESTIONS.md` +
  `research/` (and external docs when useful), ask sharp clarifying questions, surface overlaps
  and scope splits, write findings to `research/<topic>.md`.
- **add** flow — append well-formed items with the next sequential `<NNN>`, a title, a few
  high-level lines, and a link to research when it exists.
- **refine** flow — reorder, merge, split, sharpen **backlog** items only.
- **no-ceremony default** — no branch/plan/PR: commit on trunk as `chore(roadmap): …` and
  push, behind defensive checks, with a `rules.md` opt-out and a "don't push" escape.
- Never dispatched by `speclite-run`.

## Acceptance criteria

- [x] `skills/speclite-roadmap/SKILL.md` exists with valid frontmatter (`name`, `description`)
      matching the style of the other skills; description triggers on "speclite roadmap",
      "add a roadmap item", "groom the backlog", "investigate this idea", `/speclite-roadmap`.
- [x] Step 0 reads `specs/lite/rules.md` first and treats it as highest priority, like every
      other skill.
- [x] The skill documents all three flows (investigate / add / refine) and how it picks one
      from the user's request.
- [x] **add** mints the next sequential id: max existing `<NNN>` + 1, zero-padded, never reused
      — computed from the roadmap headings, not from a counter file.
- [x] **refine** refuses to edit items whose heading carries a `PLANNED`/`WIP`/`BUILT`/`SHIPPED`
      suffix (backlog only), and says so when asked.
- [x] Roadmap items written by the skill stay short and high-level; detail goes to
      `research/<topic>.md`, which the item links to.
- [x] Defensive checks documented and ordered: on trunk (auto-detect via `origin/HEAD`,
      fallback `main`/`master`/`develop`), tree clean except `specs/lite/roadmap.md` and
      `research/`, `git pull --rebase` before push, pause-and-ask on a dirty tree or a
      rejected push.
- [x] Honors the `rules.md` opt-in for the branch+PR path (the line already in
      `templates/rules.md`) and honors a user "don't push" by leaving the edit local.
- [x] Commits roadmap edits as `chore(roadmap): <summary>`.
- [x] `speclite-run`'s dispatch table is unchanged — the roadmap skill is never auto-dispatched
      (state this explicitly in the skill's Boundaries).
- [x] README skill table lists `speclite-roadmap`.
- [~] Installed plugin exposes `/speclite-roadmap` — **deferred**: skills are
      auto-discovered and `bin/install.js` copies the repo tree wholesale (no per-skill
      registry), so no code change is needed — `--dry-run --all` is clean for claude /
      copilot / cursor. The live reinstall was not run because
      swapping the plugin cache mid-loop would pull the Stop hook out from under the
      running session. Verify with the reinstall block in Testing, then restart.

## Design

Same shape as every other skill: one `skills/speclite-roadmap/SKILL.md`, frontmatter +
numbered steps + Boundaries. Skills are auto-discovered, so **no manifest edit is needed** —
`.claude-plugin/plugin.json` and `.cursor-plugin/plugin.json` list no skills.

Structure of the SKILL.md:

- Step 0 — read `specs/lite/rules.md`.
- Step 1 — pick the flow from the user's request (investigate / add / refine); investigate
  naturally feeds add.
- Step 2 — observe: roadmap headings + ids, `research/` contents, `docs/QUESTIONS.md`.
- Step 3 — flow bodies, each ending in the roadmap edit.
- Step 4 — commit gate: defensive checks → `chore(roadmap): …` → `pull --rebase` → push;
  rules opt-in routes to branch + PR instead; "don't push" stops after the commit (or after
  the edit).
- Boundaries — only skill that edits roadmap text; never touches status suffixes of
  non-backlog items; never dispatched by `speclite-run`; pauses rather than guessing.

Id minting on trunk is deliberate (the "mint ids on trunk only" fix from `research/parallel.md`):
two people adding items from branches would collide on `<NNN>`.

**Touches:**

- `skills/speclite-roadmap/SKILL.md` (new)
- `README.md` (mod) — skill table row
- `CLAUDE.md` (mod) — note the skill under repo conventions / roadmap workflow
- `research/roadmap-skill.md` — left as-is; it is design notes, still accurate
- `specs/lite/roadmap.md` (mod) — status suffix

## Steps

- [x] Write `skills/speclite-roadmap/SKILL.md` (frontmatter, Step 0 rules, three flows,
      id minting, defensive commit gate, Boundaries).
- [x] Add the README skill-table row.
- [x] Add a short line to `CLAUDE.md` describing the skill and that the loop never runs it.
- [~] Reinstall the plugin and confirm `/speclite-roadmap` is offered — deferred to
      after this session (see acceptance criteria).
- [x] Dry-run the add flow: the id-minting command returns `018` against the real
      roadmap, so the next minted id is `019`. Correct.

## Testing

```bash
# NOTE: node lives in mise shims (`~/.local/share/mise/shims`, put on PATH by
# ~/.dotfiles/dotfiles/.zshrc), which the agent's shell PATH omits — prepend it to run node.
# Dry-run verified clean for all three targets.

# frontmatter + structure sanity
head -20 skills/speclite-roadmap/SKILL.md
grep -n "rules.md" skills/speclite-roadmap/SKILL.md

# id minting math against the real roadmap
grep -E "^## [0-9]{3}" specs/lite/roadmap.md | tail -3

# installer still enumerates the new skill dir
node bin/install.js --dry-run --only claude

# live check
claude plugin marketplace update speclite
claude plugin uninstall speclite
claude plugin install speclite@speclite   # restart, then /speclite-roadmap
```

Manual: invoke `/speclite-roadmap` with a rough idea and confirm it investigates, asks
clarifying questions, and proposes a well-formed item without committing anything unasked.

## Out of scope

- Changing `speclite-run`'s dispatch table or any loop-mode behavior.
- Editing items that are already `PLANNED`/`WIP`/`BUILT`/`SHIPPED`.
- Issue-tracker integration (creating GitHub/Bitbucket issues from roadmap items).
- Automatic research fetching from the web without the user asking.
