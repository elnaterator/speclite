# Parallel work, planning, and backlog — design notes

Ideas for making speclite work with multiple features in flight (worktrees, teammates),
plus planning/prioritizing/backlog improvements. Brainstorm, not a plan. Ranked within
each group.

## Root problem

Three things collide when N branches run at once:

1. **Id allocation.** Two planners on trunk both see `018` as last, both mint `019`.
2. **Status writes happen on feature branches.** Every branch edits `roadmap.md` heading
   lines, so every PR conflicts with every other PR on that file.
3. **`roadmap.md` is one file holding shared mutable state.** Git handles "many files, one
   owner each" well and "one file, many writers" badly.

Fix 2 and 3 structurally and 1 mostly disappears.

## Conflict-free roadmap

### Derive status from git, stop writing it (recommended)

Roadmap headings carry no suffix. Status = facts git already knows:

| Status | Derived from |
|--------|--------------|
| backlog | item in roadmap, nothing else |
| PLANNED | plan file exists on some branch |
| WIP | branch `*/<NNN>-*` exists on remote |
| BUILT | plan acceptance checkboxes all ticked, or `built: true` in plan frontmatter (one file per branch, no conflict) |
| SHIPPED | plan file present on trunk — it only lands there via merged PR |

`speclite-status` becomes the board. Breaks the "roadmap suffix = single source of truth"
invariant, but 017 already makes `speclite-run` stateless, so this is the natural next
step. Zero roadmap edits on branches means zero roadmap conflicts.

### One file per item

`specs/lite/roadmap/017-codex.md` with frontmatter (`status`, `priority`, `depends`,
`owner`). Adding an item = new file, changing status = editing your own file. `roadmap.md`
becomes a generated index or goes away. Less radical than deriving, still conflict-free
except two people on the same item — a real conflict anyway.

### Custom merge driver, no format change

`.gitattributes`: `specs/lite/roadmap.md merge=speclite`, driver script in `hooks/`
resolves per heading as max(status) plus union of new items. Installer registers it.
Cheap band-aid. GitHub and Bitbucket PR merges ignore custom drivers, so conflicts still
show in the PR UI. Local rebase only. Use only to defer the status change.

### Mint ids on trunk only

`speclite-roadmap` add flow (015): fetch trunk, take next id, commit stub to trunk, push. Tiny
commit, atomic reservation. Or use issue number as the id when an issue exists — tracker
allocates atomically, branch name format `<type>/<NNN>-<issue_id>-<slug>` already
supports it. Never mint on a feature branch.

## Parallel execution

### Worktree-native plan

`speclite-plan --worktree` runs `git worktree add ../<repo>-<NNN> <branch>`. `.mode` and
`.halt` are gitignored working files, so each worktree gets its own loop state for free.
N worktrees = N independent loops, no new machinery. `speclite-run` must stay scoped to
its own worktree's branch and never touch others.

### Claim by branch

`speclite-plan` fetches, lists `origin/*/<NNN>-*`, skips claimed items. Branch existence
is the lease. No lock file, no owner field required.

### Touches-overlap check

Plans already declare `Touches:`. At plan time, read `Touches` from every in-flight plan
on remote branches and warn: "017 and 018 both touch bin/install.js — sequence or
coordinate". Also use as pick-next heuristic: prefer items whose files don't overlap
active work. Data already exists, cost is one grep.

### Dependencies in roadmap

`depends: 017` line on items. Pick-next = first item with all deps merged to trunk.
Roadmap becomes DAG, not queue. Needed anyway: 018 (Kiro) waits on 017.

### `speclite-swarm N`

Picks N dep-free, non-overlapping items, spins N worktrees, runs the 017 driver loop per
worktree in parallel (or Claude Code subagents, one per worktree). Fan-in is just N PRs.
Only makes sense after status derivation lands — otherwise N roadmap conflicts.

### `speclite-sync`

Fetch, rebase current branch on trunk, re-check claims and deps. Run at start of
`speclite-run`. After one PR merges, other worktrees pick up the change before building
further on stale trunk.

## Planning, prioritizing, team

### Now / Next / Later sections

Replace "ordered list = priority" with three headings, Shape Up style. `speclite-plan`
picks from Now only. Reordering within Now is a trunk edit, rare.

### `speclite-add` quick capture

Called mid-build when scope creep appears: "found a bug, backlog it". Pairs with review's
scope-creep finding, which could offer "move to new item" instead of just flagging.

### `speclite-groom`

Product-owner pass over backlog: propose splits for oversized items, merges, deps, size
tags (S/M/L), missing acceptance criteria. Asks questions, rewrites backlog on trunk.
Runs before a swarm so items are actually independent.

### Batch planning

Plan several items in one session on trunk, no branches yet. User reviews all plans, then
fan out. Plan approval becomes an explicit gate in default mode.

### Team board from git only

`speclite-status --team`: per item — remote branches, last commit author, open PR,
reviewer. No shared team file to conflict on. Optional `owner:` line in item for intent,
but truth is branch author.

### Issue tracker as source

`speclite-import` pulls labeled gh/bkt issues into roadmap, id = issue number. Tracker
owns allocation and assignment; speclite owns plan/build/review/ship.

## Recommended order

1. Derived status — unblocks everything else.
2. `depends:` + DAG pick-next.
3. `--worktree` flag + claim-by-branch.
4. Touches-overlap warning.
5. `speclite-swarm`.

`speclite-groom` is 015's refine flow; `speclite-add` is its add flow. Both land with 015. Merge
driver only if deferring the status change.
