# speclite-roadmap skill — design notes

Backs roadmap item 015. Detail captured during roadmap grooming; the plan phase decides
what to keep.

## Role

Shapes the roadmap itself, separate from the plan→build→ship pipeline. The only skill that
edits roadmap *text*; pipeline skills only flip status suffixes. Reads `rules.md` first.
Never dispatched by `speclite-run`.

## Flows

- **investigate** — user brings a rough idea. Explore the codebase, roadmap,
  `docs/QUESTIONS.md`, `research/`, and external docs when useful. Ask sharp clarifying
  questions; surface trade-offs, overlaps with existing items, scope splits. Write findings
  to `research/<topic>.md` (create or update). Items link to research and stay concise.
- **add** — well-formed items: next sequential `<NNN>` (never reused), title + a few
  high-level lines, link to research when it exists.
- **refine** — reorder, merge, split, sharpen backlog items. Never touch non-backlog items.

## No ceremony by default

Roadmap is a living planning doc, not code. No branch, plan, or PR: commit on trunk
(`chore(roadmap): …`) and push. Defensive checks:

- must be on trunk (auto-detect via `origin/HEAD`)
- tree clean except `specs/lite/roadmap.md` and `research/`
- pull `--rebase` before push
- pause and ask on a rejected push or dirty tree

Opt-out: `rules.md` may require the branch+PR path (rules template already documents this);
user can say "don't push" to leave the edit local.

## Relation to parallel-work ideas

Minting ids on trunk (the add flow) is the "mint ids on trunk only" fix from `parallel.md`.
`speclite-groom` and `speclite-add` from that doc are this skill's refine and add flows.
