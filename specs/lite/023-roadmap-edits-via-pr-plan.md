---
roadmap_id: 023
issue: n/a
---

# Plan: 023 Roadmap edits go through a branch + PR by default

## Overview

`speclite-roadmap` (015) defaults to committing `chore(roadmap): …` on trunk and pushing,
with branch + PR as a `rules.md` opt-in. That pushes unreviewed changes to a protected-ish
branch, surprises new users (the README quick start had to warn about it), and fails on
repos with branch protection. Flip the default:

- Default: branch `chore/roadmap-<slug>` from an up-to-date trunk, commit, push, open a PR
  (`gh` / `bkt`, same detection as `speclite-ship`), then switch back to trunk.
- Opt-in via `rules.md`: commit straight to trunk (the old behavior, unchanged).
- Keep ids collision-safe: mint from freshly pulled trunk; if the PR later conflicts on the
  roadmap, rebase and re-mint any unmerged ids.

## Acceptance criteria

- [x] `skills/speclite-roadmap/SKILL.md` default commit gate = branch + PR; trunk path is the
      `rules.md` opt-in; description/intro/Step 0 reworded to match.
- [x] Skill starts from trunk, `git pull --ff-only` before minting ids, branches
      `chore/roadmap-<slug>` (no `<NNN>`, so it never looks like pipeline work).
- [x] After opening the PR the skill returns to trunk, and its report says the new items are
      plannable once the PR merges.
- [x] No remote / no PR CLI → commit on the branch, push if possible, print a ready-to-paste
      PR body (same degrade as `speclite-ship`). "Don't push" still honored.
- [x] Defensive checks kept: not on trunk → ask; dirty tree beyond roadmap/research → ask;
      never force-push.
- [x] `templates/rules.md` + inline fallback in `speclite-init/SKILL.md` show the new opt-in
      (direct-to-trunk) example instead of the old opt-in.
- [x] README quick-start note, README Customize example, `CLAUDE.md`, and
      `research/roadmap-skill.md` describe the new default.
- [x] Version `0.6.1` → `0.6.2` (`fix` → patch). `make ci` passes.

## Design

Rewrite Step 5 (commit gate) as two paths. **Default (branch + PR):**

1. On trunk? (else ask). Tree clean except roadmap/research? (else ask).
2. Edits happen before branching (Steps 3–4), so the branch is created with the edits in
   place: `git switch -c chore/roadmap-<slug>`. Ids are minted before that, from a trunk
   refreshed by `git pull --ff-only` at Step 2 (skipped when there is no remote).
3. Commit `chore(roadmap): <summary>`, `git push -u origin <branch>`, open PR.
4. `git switch <trunk>`.

**Opt-in (rules say commit straight to trunk):** existing checks + commit + pull --rebase +
push, unchanged.

The pull moves into Step 2 (Observe) so ids are minted from the latest trunk on both paths.

**Touches:** `skills/speclite-roadmap/SKILL.md` (mod), `templates/rules.md` (mod),
`skills/speclite-init/SKILL.md` (mod), `README.md` (mod), `CLAUDE.md` (mod),
`research/roadmap-skill.md` (mod), `package.json` + 3 plugin manifests (mod, bump),
`specs/lite/roadmap.md` (mod, item 023 added on this branch — dogfooding the new default).

## Steps

- [x] Rewrite roadmap skill: frontmatter description, intro, Step 0, Step 2 pull, Step 5
      two paths, Step 6 report, Boundaries.
- [x] Rules template + init inline fallback.
- [x] README, CLAUDE.md, research note.
- [x] `make bump V=0.6.2`; `make ci`.

## Testing

```bash
make ci
grep -rn -i "straight to trunk\|directly on trunk\|trunk and push" --exclude-dir=.git . \
  | grep -v "specs/lite/0[0-2][0-9]-"     # only opt-in mentions remain
```

Manual: read the rewritten skill end-to-end as an agent would — default path never commits on
trunk; opt-in path matches the old behavior.

As built: staging is explicit (`git add specs/lite/roadmap.md research/`) instead of
`commit -am`, so new research files are included. Remaining "straight to trunk" mentions are
opt-in wording or shipped history (item 015's text is not edited).

## Out of scope

- Changing the pipeline skills (`plan` still treats uncommitted roadmap edits as OK).
- Auto-merging roadmap PRs.
