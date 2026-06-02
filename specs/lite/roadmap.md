# Roadmap

speclite dogfoods itself. Items below track speclite's own development.

Status suffix: _(none)_=backlog, ` - PLANNED`, ` - WIP`, ` - DONE`.

| Suffix | Meaning |
|--------|---------|
| _(none)_ | backlog — not started |
| ` - PLANNED` | a plan exists in `specs/lite/` |
| ` - WIP` | implementation started (branch checked out) |
| ` - DONE` | code complete, ready to commit |

## R001 init skill - DONE
Create `specs/lite/` with roadmap + plan template. Idempotent.

## R002 plan skill - DONE
Pick next backlog item, branch, write plan from template, mark PLANNED.

## R003 implement skill - DONE
Implement the current branch's plan; mark WIP then DONE.

## R004 commit skill - DONE
Plan-completeness check, commit (reuse git-helper/caveman-commit), push, open PR via gh/bkt.

## R005 thin CLI in Go
Single static binary `speclite`. v1 commands: `init` (mkdir + write templates). Backs
deterministic file/config work; skills keep the git/grep/sed orchestration. Sets up
homebrew packaging path. Lang: Go (no runtime dep, easy bottle).

## R006 homebrew packaging
Personal tap `nhadzariga/tap` (confirm org) with a formula building the Go binary.
Depends on R005.

## R007 review skill (maybe)
Optional review step between implement and commit. Likely delegates to `/code-review`
scoped to the branch diff. May be skipped — decide later.

## R008 roadmap/issues skill — GitHub Issues
`speclite-roadmap`: append a roadmap item, optionally pulled from GitHub Issues. Reads
config; credentials via OS keychain or env var (`SPECLITE_GITHUB_TOKEN`), not a flat file.

## R009 issues — Jira support
Extend the issue-store add-on to Jira (PAT via keychain/env). No Bitbucket for issues.

## R010 marketplace publish (maybe)
Publish to a Claude Code marketplace repo so users can
`claude plugin install speclite@elnaterator`. Confirm org/repo. Tentative.
