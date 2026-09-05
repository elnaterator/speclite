---
roadmap_id: 016
issue: n/a
---

# Plan: 016 CI — installer dry-run + markdown lint

## Overview

Repo has no `.github/` at all — no CI. Installer (`bin/install.js`, 556 lines, pure Node)
and 37 markdown files (the actual product) are guarded by nothing. Cheap safety net before
installer grows (017 adds a skills-dir installer target + Codex/OpenCode; 018 adds Kiro).

In scope:

- GitHub Actions workflow on push + PR: installer dry-run per target, markdown lint.
- markdownlint config tuned to speclite's intentional formatting.
- Fix the markdown violations that config does not waive, so CI is green on merge.
- README status badge.

## Acceptance criteria

- [x] `.github/workflows/ci.yml` exists; triggers on `push` (trunk) and `pull_request`.
- [x] CI runs `node bin/install.js --list` and `--only <t> --dry-run` for each of
      `claude`, `copilot`, `cursor`; all exit 0.
- [x] CI runs `--only claude --uninstall --dry-run` (uninstall path also covered).
- [x] CI runs markdownlint over all tracked `*.md` and exits 0 on a clean checkout.
- [x] Repo's existing markdown passes the configured lint (no waivers added just to hide
      real breakage).
- [x] README carries a CI status badge pointing at the workflow.
- [x] Workflow needs zero repo dependencies beyond Node + `npx` (no lockfile, no
      `npm install` step) — repo stays dependency-free.
- [x] `CLAUDE.md` documents that CI exists and how to run the same checks locally.

## Open questions

All three taken as proposed:

- Lint tool — `markdownlint-cli2@0.23.2` via `npx -y`. Zero repo deps.
- Lint strictness — waiver set below; everything else fixed in-repo.
- Node version — single `ubuntu-latest` job, Node 20.

## Design

**Installer smoke test.** `--all` filters by `detect()` and `fail()`s with
`no targets detected; nothing to do` (exit 1) — on a bare runner nothing is detected, so
`--all` is wrong for CI. `--only <id>` bypasses detection (`bin/install.js:523-533`), and
each target's dry-run path warns instead of failing when its CLI is absent
(e.g. `bin/install.js:283`). So CI iterates `--only` per target. Verified locally: all
three exit 0, `--list` exits 0.

`resolveSource()` picks the local checkout when `.git` is present, so `actions/checkout`
gives CI a local source with no network fetch.

**Markdown lint.** Defaults are far too noisy (1218 errors) because several rules fight
formatting speclite depends on. Waive these in `.markdownlint-cli2.jsonc`:

| Rule | Why waived |
|------|-----------|
| MD013 line-length | 846 hits; skills/plans are prose-wrapped at author's discretion |
| MD038 no-space-in-code | status suffixes are literally `` ` - PLANNED` `` — the space is the content |
| MD033 no-inline-html | `<NNN>`, `<slug>`, `<type>` placeholders parse as HTML tags |
| MD060 table-column-style | compact pipe style used throughout |
| MD041 first-line-heading | plans start with YAML frontmatter |
| MD024 duplicate-heading | every plan repeats `## Steps`, `## Testing` |
| MD028 no-blanks-blockquote | intentional in docs |

Residual after waivers: 233 errors across 9 rules, almost all mechanical
(MD031 fences 94, MD032 lists 52, MD022 headings 47, MD007 8, MD012 3, MD049 6 — all
`--fix`-able) plus ~23 manual (MD034 bare URLs 15, MD040 fence language 7, MD036 1).
Fix these in-repo; do not widen the waiver list to hide them.

Two files need care when reformatted: `templates/roadmap.md` and `templates/plan-template.md`
are duplicated as inline fallbacks inside `skills/speclite-init/SKILL.md`, and
`templates/plan-template.md` is mirrored at `specs/lite/plan-template.md`. Any whitespace fix
must be applied to all copies (CLAUDE.md "Template sourcing").

**Touches:**

- `.github/workflows/ci.yml` (new)
- `.markdownlint-cli2.jsonc` (new)
- `README.md` (mod) — badge
- `CLAUDE.md` (mod) — CI section, local-check commands
- `Makefile` (mod) — `make lint` / `make ci` running the same checks locally
- markdown files across `docs/`, `research/`, `skills/`, `specs/lite/`, `templates/`,
  `README.md`, `CONTRIBUTING.md` (mod) — lint fixes
- `skills/speclite-init/SKILL.md` (mod) — keep inline fallbacks in sync with templates

## Steps

- [x] Add `.markdownlint-cli2.jsonc` with the waiver set above.
- [x] Run `markdownlint-cli2 --fix`, review the diff, hand-fix the non-auto rules.
- [x] Re-sync `specs/lite/plan-template.md` from `templates/plan-template.md` and re-sync
      the inline fallback blocks in `skills/speclite-init/SKILL.md`.
- [x] Confirm no skill's `grep`/`sed` contract broke (roadmap `^## [0-9]{3}` headings,
      status suffix parsing) after reformatting.
- [x] Add `.github/workflows/ci.yml`: checkout, setup-node 20, installer dry-run matrix
      (`--list`, three `--only … --dry-run`, one `--uninstall --dry-run`), lint step with
      pinned `npx -y markdownlint-cli2@<ver>`.
- [x] Add `make lint` + `make ci` targets mirroring the workflow.
- [x] Add README badge; document CI in `CLAUDE.md`.

## Testing

```bash
# same checks CI runs
node bin/install.js --list
for t in claude copilot cursor; do node bin/install.js --only "$t" --dry-run || exit 1; done
node bin/install.js --only claude --uninstall --dry-run
npx -y markdownlint-cli2 "**/*.md"
make ci
```

Manual: after the branch is pushed, confirm the Actions run is green and the README badge
resolves (badge URL is only verifiable once the workflow file exists on the default branch —
note it if it still shows "no status" pre-merge).

Regression check: reinstall the plugin and run `/speclite-status` to confirm reformatted
roadmap/templates still parse.

## Out of scope

- Release tagging, changelog, npm publish, demo GIF (`research/opensource.md` items 1–4).
- Issue/PR templates, Discussions, `good first issue` labels (item 5 of that research).
- Any real (non-dry-run) install in CI, or testing against actual Claude/Copilot/Cursor CLIs.
- Linting non-markdown (no shellcheck for `hooks/`, no JS lint for `bin/install.js`).

## Build notes (what actually happened)

- Waiver set landed as planned; residual after `--fix` was 8 errors, not the 23 estimated
  (MD034 bare URLs turned out to be auto-fixable — wrapped as `<url>`, safe because MD033
  is waived). Hand-fixed 7 × MD040 (tagged ASCII-tree/usage fences `text`) and 1 × MD036
  (`**Compatibility matrix**` → `### Compatibility matrix`, which then needed a heading-level
  fix for MD001).
- `templates/plan-template.md` and `specs/lite/plan-template.md` needed no lint fixes and
  are still byte-identical; the `speclite-init` inline fallback for `roadmap.md` does not
  embed the example item block, so it needed no sync either.
- MD022 forced a blank line after every `## <NNN>` heading in `specs/lite/roadmap.md`. The
  skill contracts are unaffected (`grep -E "^## [0-9]{3}"` and status-suffix parsing both
  still work), but new items must be written in that shape or the next roadmap commit fails
  CI — so `templates/roadmap.md` (example block) and `skills/speclite-roadmap/SKILL.md`
  (item shape) were updated to teach it.
- Added `make lint` and `make ci` so the CI suite is runnable locally; `make ci` exits 0.
- Badge points at the workflow on `main`; it will read "no status" until this branch merges.

### Review finding + fix (full-auto auto-fix, attempt 1)

The first pass verified the installer dry-runs only on this machine, where all three hosts
are present — a bare runner is the case that matters. Re-verified under
`env HOME=<empty> PATH=<node only>`: `--only copilot --dry-run` exited **1**, because
`installCopilot`'s "neither copilot CLI nor VS Code" `fail()` was not gated on `ctx.dry`
(unlike `installClaude`, which warns in dry-run). CI would have been red on its first run.

Fix: gate that `fail()` on `!ctx.dry` and warn instead, matching `installClaude`. This
touches `bin/install.js`, which the plan did not list under **Touches** — accepted as
in-scope because acceptance criterion 2 ("all exit 0") is unreachable otherwise, and the
change makes `--dry-run` mean the same thing across every target.

Re-verified in the simulated bare environment: all three install dry-runs, all three
uninstall dry-runs, and `--list` exit 0; real (non-dry) installs still exit 1 with the
original error for both claude and copilot; local `make ci` still exits 0.
