---
roadmap_id: R013
issue: n/a
---

# Plan: R013 usability refactor — clearer names, statuses, vocabulary

## Overview

Reduce cognitive load across speclite by removing names that mislead. Six mechanical renames, no backwards-compat (early, single-user). The work is wide but shallow: change a token, keep behavior. The hard part is **consistency** — every skill, hook, template, manifest, installer, doc, and the dogfood `specs/lite/` must agree, or we re-introduce the dual-vocabulary smell we're killing.

In scope:
- `system-prompt.md` → `rules.md` (drop LLM jargon; keep read-first-overrides semantics).
- Status `DONE` → `BUILT` (code complete, ready to commit) + new terminal `SHIPPED` (pushed + PR open). Lifecycle: backlog → `PLANNED` → `WIP` → `BUILT` → `SHIPPED`.
- Unify "autopilot" → "mode" everywhere (hook file, halt marker, prose).
- Drop the `R` prefix from the item id everywhere — bare zero-padded number (`013`) as the join key.
- `speclite-next` → `speclite-run`.
- `speclite-implement` → `speclite-build`.
- `speclite-commit` → `speclite-ship` (pairs with `SHIPPED`).

## Acceptance criteria

- [x] Fresh `speclite-init` produces `specs/lite/rules.md` (not `system-prompt.md`) and roadmap/plan templates using bare-number ids (`## <NNN>`, `<NNN>-<slug>-plan.md`, branch `<type>/<NNN>-<slug>`). *(template + inline-fallback wording updated; live init pending manual reinstall.)*
- [x] Status legend + state machine use `PLANNED / WIP / BUILT / SHIPPED`; `speclite-build` sets `BUILT`, `speclite-ship` sets `SHIPPED` after the PR.
- [x] Skills live at `skills/speclite-run/`, `skills/speclite-build/`, `skills/speclite-ship/`; frontmatter `name:` matches each dir.
- [x] Stop hook is `hooks/mode-stop.sh`, referenced from `hooks/hooks.json`; halt marker is `specs/lite/.halt`.
- [ ] Full pipeline runs end-to-end with new names (plan → build → review → ship) on a throwaway item. *(manual — needs plugin reinstall.)*
- [x] Grep is clean — no live references to `system-prompt`, status `DONE`, `autopilot`, `speclite-next`, `speclite-implement`, `speclite-commit`, or `R<NNN>` ids (historical `QUESTIONS.md`/`design.md`/past plan bodies + the R013 item/plan exempted).
- [x] Dogfood `specs/lite/` migrated: roadmap headings are bare numbers (`## 001`…`## 014`), `rules.md` present, historical statuses reconciled to `SHIPPED`.

## Open questions

- [x] Historical roadmap items 001–012 are all merged and were ` - DONE`. Convert to ` - SHIPPED`? — **Resolved: yes.** All converted to ` - SHIPPED`.
- [x] Past plan files (`005-…` … `012-…`), `docs/QUESTIONS.md`, and `docs/design.md` contain old tokens as historical record. Rewrite them? — **Resolved: leave them as historical record**, exempt from the grep gate. Plan filenames already bare, so no renames. Canonical templates / skills / roadmap (legend + live bodies) / user-facing docs fully migrated.

## Design

Pure rename refactor — no new behavior. Token → replacement:

| Old | New | Notes |
|-----|-----|-------|
| `system-prompt.md` | `rules.md` | template, inline fallback in `speclite-init`, every Step-0 read |
| status `DONE` | `BUILT` | "ready to commit" |
| _(new)_ | `SHIPPED` | set by `speclite-commit` after PR |
| `autopilot` | `mode` | prose + filenames |
| `hooks/autopilot-stop.sh` | `hooks/mode-stop.sh` | + `hooks.json` command path |
| `.autopilot-halt` | `.halt` | `.gitignore`, dispatcher writes/clears, settings.local permission |
| id `R<NNN>` | `<NNN>` | bare number; roadmap `## NNN`, branch `<type>/NNN-slug`, commit `(NNN)`; regex `R[0-9]{3}`→`[0-9]{3}` |
| `speclite-next` | `speclite-run` | dir, frontmatter, hook command, refs |
| `speclite-implement` | `speclite-build` | dir, frontmatter, refs |
| `speclite-commit` | `speclite-ship` | dir, frontmatter, refs; sets `SHIPPED` |

Manifests (`plugin.json`, `marketplace.json`, cursor `plugin.json`) **auto-discover** skills — no skill list to edit, only the `description` prose ("autopilot", "implement") needs updating.

**Touches** (from repo-wide grep):
- Skill dirs (mod, some renamed): `skills/speclite-{init,plan,review,mode,status}/SKILL.md` (mod); `skills/speclite-implement/` → `skills/speclite-build/`, `skills/speclite-next/` → `skills/speclite-run/`, `skills/speclite-commit/` → `skills/speclite-ship/` (rename+mod each).
- Hooks: `hooks/autopilot-stop.sh` → `hooks/mode-stop.sh` (rename+mod, internal `speclite-next`→`speclite-run`, `.autopilot-halt`→`.halt`); `hooks/hooks.json` (mod command path + description).
- Templates (canonical): `templates/roadmap.md`, `templates/plan-template.md` (mod). Plus inline fallback inside `speclite-init/SKILL.md`.
- Manifests: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `.cursor-plugin/plugin.json` (mod description prose).
- Dotfiles: `specs/lite/.gitignore` (mod `.autopilot-halt`→`.halt`); `.claude/settings.local.json` (mod `rm -f` permission, local/untracked-ish).
- Docs: `README.md`, `CONTRIBUTING.md`, `CLAUDE.md`, `docs/design.md`, `docs/INSTALL.md` (mod). `docs/QUESTIONS.md` exempt from grep gate (historical).
- ID parsers: every skill that greps `^## R[0-9]{3}` or extracts an `R<NNN>` branch segment (plan, build, run, review, status, commit/ship) → `[0-9]{3}` / bare segment; plus the `R<NNN>` invariant prose in `CLAUDE.md`.
- Dogfood `specs/lite/`: `roadmap.md` (legend + historical statuses + headings `R0NN`→`0NN`), `system-prompt.md`→`rules.md` (rename, currently `Use caveman ultra.`), `plan-template.md` (sync from templates). Plan files already bare-numbered — no rename needed.

## Steps

- [x] 1. **rules.md**: `git mv specs/lite/system-prompt.md specs/lite/rules.md` and `git mv templates/system-prompt.md templates/rules.md`; updated every Step-0 read across all 8 skills + the inline fallback (`# Rules` heading) in `speclite-init`. Dogfood `rules.md` heading updated too.
- [x] 2. **Skill dir renames**: `git mv` speclite-implement→speclite-build, speclite-next→speclite-run, speclite-commit→speclite-ship; fixed each `SKILL.md` frontmatter `name:` + description + self-references.
- [x] 3. **Cross-skill refs**: replaced the three skill names across all remaining skills + README + CLAUDE.md + CONTRIBUTING + docs/INSTALL.
- [x] 4. **Status vocab**: legend (templates + dogfood) now `PLANNED/WIP/BUILT/SHIPPED`; `speclite-build` sets `BUILT`, `speclite-ship` sets `SHIPPED` (new Step 7); `speclite-run`/`speclite-status`/`speclite-review` status logic updated; historical dogfood items reconciled to `SHIPPED` (Open Q1).
- [x] 5. **mode vocab**: `git mv hooks/autopilot-stop.sh hooks/mode-stop.sh`; updated `hooks.json` command path + description; `.autopilot-halt`→`.halt` in `.gitignore`, dispatcher, status, review, mode, ship, settings.local; scrubbed "autopilot" prose in manifests/docs/skills → "mode"/"loop mode".
- [x] 6. **Drop `R` from id**: regex `R[0-9]{3}`→`[0-9]{3}` and branch-segment wording in all parsers (plan/build/run/review/status/ship); template + skill wording for branch (`<type>/NNN-slug`) and commit scope (`(NNN)`); migrated dogfood roadmap headings `R0NN`→`0NN` and `CLAUDE.md`/`CONTRIBUTING.md` invariants. Plan filenames already bare — no file rename.
- [x] 7. **Sync + verify**: synced `plan-template.md` to dogfood; bumped manifest `version` 0.2.0→0.3.0 (claude/cursor) so the reinstall picks up the rename; ran grep-clean + structural gates (pass). **Pending (manual):** reinstall plugin and run the pipeline end-to-end.

**Divergences from plan:** (a) `docs/design.md` exempted from the grep gate as historical — it is a pre-implementation prompt-flow sketch describing a CLI/MCP design that never shipped; rewriting it would be revisionist. (b) Dogfood `roadmap.md` item *bodies* (not just the legend) were scrubbed to current vocab, since the roadmap is the live single source of truth a developer reads daily; detailed history stays in the untouched plan files + git. (c) Manifest `version` bumped (not originally listed) — required for `claude plugin update` to re-sync.

## Testing

```bash
# grep-clean gate (exempt historical: QUESTIONS.md, design.md, past plan bodies,
# and the R013 item/plan which necessarily describe old→new tokens)
grep -rn --exclude-dir=.git -e 'system-prompt' -e 'autopilot' -e 'speclite-next' -e 'speclite-implement' -e 'speclite-commit' . \
  | grep -vE 'docs/QUESTIONS.md|docs/design.md|specs/lite/013|specs/lite/0(0[0-9]|1[0-2])-'
# status token: ensure no live ' - DONE' in templates/skills (dogfood historical may show SHIPPED)
grep -rn --exclude-dir=.git ' - DONE' templates/ skills/
# id prefix gone from live files (regex/branch/commit) — historical plan bodies exempt
grep -rn --exclude-dir=.git -E 'R[0-9]{3}' templates/ skills/ hooks/ README.md CLAUDE.md

# structural checks
test -f specs/lite/rules.md && ! test -f specs/lite/system-prompt.md && echo rules-ok
test -d skills/speclite-build && test -d skills/speclite-run && test -d skills/speclite-ship && echo dirs-ok
test -f hooks/mode-stop.sh && ! test -f hooks/autopilot-stop.sh && echo hook-ok
grep -qE '^## [0-9]{3} ' specs/lite/roadmap.md && echo headings-bare
```

Manual: reinstall (`claude plugin uninstall/install` loop per CLAUDE.md), then run `speclite-init` in a scratch repo → confirm `rules.md` + bare-number template wording; run `speclite-plan` → `speclite-build` → `speclite-review` on a throwaway item → confirm statuses flow `PLANNED → WIP → BUILT`, branch is `<type>/NNN-slug`, and the Stop hook (`mode-stop.sh`) re-triggers `speclite-run` under a loop mode.

## Out of scope

- Moving `specs/lite/` → `specs/` (explicitly kept).
- Any new feature/behavior — rename + status-machine wording only.
- Rewriting historical prose in `docs/QUESTIONS.md` and inside old plan-file bodies.
- R014 (bkt CLI) work.
