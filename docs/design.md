


# Prompts for automated scheduled tasks

## Initialize

* Run `speclite init` to configure project
    * Run `mkdir -p specs/lite`
    * Create `specs/lite/plan-template.md`
    * Create `specs/lite/roadmap.md`
    * Create `specs/lite/system-prompt.md` (per-project instructions every skill reads first)

## Add item to roadmap from issue store (optional, requires add-on or plugin?)

* Run `speclite issues setup` to configure issue store and credentials
* Run `speclite issues list`
    * Reads `~/.config/speclite/config.json` (read keys `issue_store_type` with values like `jira` or `github` and `issue_store_url`)
    * Reads `~/.config/speclite/credentials` (e.g. Jira PAT)
* Pick an issue to add to the roadmap
    * Runs `grep -n -E "## R\d\d\d" specs/lite/roadmap.md`
    * Parses roadmap item ids, increment number, dumps issue content under heading like `## R<seq_num> <title>`, and include issue id

## Plan

System prompt

* List roadmap items using `grep -n -E "## R\d\d\d" specs/lite/roadmap.md` to see ID, title, status.
* List existing plans `ls specs/lite/*-plan.md`.
* Find next roadmap item not marked DONE and no plan yet.
* Read relevant roadmap text with `sed -n '123,456p' specs/lite/roadmap.md`, choose line numbers based on grep output, read previous and/or subsequent roadmap items when potentially helpful context.
* Ensure on trunk branch (main, master, develop, etc.) and clean `git status` (roadmap updates ok), if not pause and ask user.
* Checkout branch, e.g. `fix/<seq_num>-<branch_name>` or `feat/<seq_num>-<branch_name>` (based on type of roadmap item). Include issue id when available like `fix/<seq_num>-<issue_id>-<branch_name>`. Seq num must match roadmap item id like `R<seq_num>`.
* Create plan in `specs/lite/<seq_num>-<description>-plan.md` using template `specs/lite/plan-template.md`.
* Mark roadmap as planned with title suffix " - PLANNED"

## Implement

System prompt

* Run `git status`, ensure branch name has a seq num like `feat/<seq_num>-<branch_name>`. If not, pause and ask user.
* Find plan for seq num with `ls specs/lite/*-plan.md`. If not found, pause and ask user.
* Find roadmap item for seq num with `grep -n -E "## R\d\d\d" specs/lite/roadmap.md`. If not found or marked DONE, pause and ask user.
* Read plan and follow instructions
* Mark roadmap item done with title suffix " - DONE"

## Review (optional)

## Commit

System prompt

* Run `git status`, ensure branch name has a seq num like `feat/<seq_num>-<branch_name>`. If not, pause and ask user.
* Find plan for seq num with `ls specs/lite/*-plan.md`. If not found, pause and ask user.
* Find roadmap item for seq num with `grep -n -E "## R\d\d\d" specs/lite/roadmap.md`. If not found or marked DONE, pause and ask user.
* Review changes, ensure plan is fully implemented, commit all changes
* Push all changes to remote
* Create pull request (use github or bitbucket MCP server) with sections: motivation, what changed, testing (with checkboxes)

