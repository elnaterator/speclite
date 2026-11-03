---
name: speclite-roadmap
description: >
  Shape the roadmap itself: investigate a rough idea (research, clarifying questions,
  overlaps, scope splits), add well-formed items with the next sequential id, and refine
  backlog items. Writes findings to research/ and proposes roadmap edits as a PR from a
  chore/roadmap-* branch (rules.md can opt into committing straight to trunk).
  Use when the user says "speclite roadmap", "add a roadmap item", "groom the backlog",
  "investigate this idea", "refine the roadmap", or invokes /speclite-roadmap.
---

Shape the **roadmap itself** — separate from the plan → build → review → ship pipeline. This
is the only skill that edits roadmap *text*; the pipeline skills only flip status suffixes.
It is **never dispatched by `speclite-run`**: roadmap shaping is a human-initiated
conversation, not a loop step.

Roadmap edits change what the team will build, so they get reviewed like any other change:
by default they go on a short-lived `chore/roadmap-<slug>` branch and a PR — no plan, no
build step. A project can opt into committing straight to trunk via `rules.md`.

## Steps

0. **Read `specs/lite/rules.md` first if it exists.** Treat its instructions as the
   highest-priority instruction set — they override this skill's own where they conflict.
   In particular, rules may opt into the **direct-to-trunk path** for roadmap edits (see
   Step 5).

1. **Pick the flow** from the user's request. Do not ask which one — infer it:

   | User brings | Flow |
   |-------------|------|
   | A rough idea, a question, "should we…", "look into…" | **investigate** |
   | A clear, well-understood piece of work to record | **add** |
   | "groom", "reorder", "merge these", "split this", "tighten the backlog" | **refine** |

   **investigate** naturally feeds **add** — when the investigation lands, propose the item.
   If the request is genuinely ambiguous, ask once, then proceed.

2. **Observe** before writing anything. Start on trunk with a clean tree (Step 5 lists the
   checks — run them now, before editing), and refresh trunk so new ids are minted from the
   latest roadmap:

   ```bash
   git pull --ff-only    # skip when the repo has no remote
   grep -n -E "^## [0-9]{3}" specs/lite/roadmap.md
   ls research/ 2>/dev/null
   ```

   Also read `docs/QUESTIONS.md` (design decisions + rationale) and any `research/*.md` that
   looks related. Status suffix: *(none)*=backlog, ` - PLANNED`, ` - WIP`, ` - BUILT`,
   ` - SHIPPED`.

3. **Run the flow.**

   ### investigate

   The user brings a rough idea. Do the thinking before it becomes an item.
   - Explore the codebase, the roadmap, `docs/QUESTIONS.md`, and `research/`. Consult
     external docs when the idea depends on a third-party tool or platform.
   - **Ask sharp clarifying questions** — few and specific, each one that actually changes
     the shape of the work. Do not interrogate.
   - Surface **overlaps** with existing items (say which `<NNN>`), **scope splits** (this is
     really two items), and trade-offs worth recording.
   - Write findings to `research/<topic>.md` — create it, or update it if the topic already
     has an article. One article per topic. This is where detail lives.
   - Then propose the item(s) via the **add** flow, each linking back to the research file.

   ### add

   Append well-formed items to the end of the roadmap.
   - **Mint the next id**: max existing `<NNN>` + 1, zero-padded to 3 digits. Ids are
     sequential and **never reused** — compute from the roadmap headings, not a counter file:

     ```bash
     grep -E "^## [0-9]{3}" specs/lite/roadmap.md | sed -E 's/^## ([0-9]{3}).*/\1/' | sort -n | tail -1
     ```

     Mint ids from the **freshly pulled trunk** (Step 2), never from an old branch — two
     people minting from stale copies get the same `<NNN>`. If the roadmap PR later conflicts
     because another PR took that id, rebase on trunk and re-mint the unmerged items.
   - Shape: `## <NNN> <short title>` with **no status suffix** (new items are backlog),
     then a blank line, then a few high-level lines — what and why, not how. The blank
     line after the heading keeps the roadmap markdown-lint clean.
   - **Keep items short.** Detail belongs in `research/<topic>.md`; the item links to it
     (`Notes: research/<topic>.md`). Implementation detail belongs in the plan phase.

   ### refine

   Reorder, merge, split, or sharpen items.
   - **Backlog only.** Never edit the text of an item whose heading carries a ` - PLANNED`,
     ` - WIP`, ` - BUILT`, or ` - SHIPPED` suffix — a plan, a branch, or a shipped PR already
     depends on that text. If the user asks to change one, say so and offer to add a new item
     instead.
   - **Never renumber.** Merging or splitting mints new ids for new items and leaves retired
     ids unused; reordering moves headings without touching their numbers.
   - Sharpening = making an item clearer and shorter, not longer. Push detail to `research/`.

4. **Show the diff before committing.** Report what changed (`git diff`) and let the user
   see it. If the user said "don't push" — or anything meaning keep it local — stop here or
   after the commit, as they asked.

5. **Commit gate.** Run the checks in order; **pause and ask** on any failure rather than
   forcing:

   - **On trunk?** Auto-detect, fall back to the first of `main`/`master`/`develop`:

     ```bash
     git symbolic-ref --quiet refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@'
     git rev-parse --abbrev-ref HEAD
     ```

     Not on trunk → **pause and ask** (the branch may be mid-pipeline work).
   - **Tree clean** except `specs/lite/roadmap.md` and `research/`?

     ```bash
     git status --porcelain
     ```

     Unrelated changes → **pause and ask**.

   **Default — branch + PR.** Never commit on trunk on this path.
   - Branch with the edits in place. The name carries no `<NNN>` on purpose, so it is never
     mistaken for pipeline work:

     ```bash
     git switch -c "chore/roadmap-<slug>"
     git add specs/lite/roadmap.md research/ 2>/dev/null
     git commit -m "chore(roadmap): <summary>"
     git push -u origin "chore/roadmap-<slug>"
     ```

   - **Open the PR** with the same backend detection `speclite-ship` uses (`git remote -v`:
     Bitbucket host → `bkt pr create`, otherwise `gh pr create`). Body: what changed (ids +
     titles), why, and any `research/` file.
   - **Return to trunk** so the pipeline is not left on a non-pipeline branch:

     ```bash
     git switch "<trunk>"
     ```

   - No remote, or no `gh`/`bkt` → keep the commit on the branch (push it if a remote
     exists), print a ready-to-paste PR title + body, and still return to trunk.

   **Opt-in — direct to trunk** (only when `specs/lite/rules.md` says roadmap edits may
   commit straight to trunk):
   - **Commit** with the roadmap scope:

     ```bash
     git add specs/lite/roadmap.md research/ 2>/dev/null
     git commit -m "chore(roadmap): <summary>"
     ```

   - **Rebase then push** (someone else may have minted ids meanwhile):

     ```bash
     git pull --rebase && git push
     ```

     A **rejected push** or a rebase conflict → **pause and ask**; never force-push.

6. **Report**: the flow run, items added/changed (ids + titles), any research file written,
   and what happened to the change — PR url (or the branch + ready-to-paste body), or the
   trunk commit on the opt-in path. On the PR path, say that new items become plannable
   (`/speclite-plan`) once the PR merges.

## Boundaries

- The only skill that edits roadmap **text**. It does not add, flip, or remove status
  suffixes — the pipeline skills own status.
- Never edits items that are `PLANNED`/`WIP`/`BUILT`/`SHIPPED`.
- Never dispatched by `speclite-run` — the loop does not shape its own backlog.
- Does not write plans or implement anything; `/speclite-plan` turns an item into work.
- Never merges its own PR, and never commits on trunk unless `rules.md` opts in.
- Pauses and asks on a dirty tree, a non-trunk branch, or a rejected push — never guesses,
  never force-pushes.
