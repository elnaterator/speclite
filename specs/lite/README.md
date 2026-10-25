# speclite

This directory contains the [speclite](https://github.com/elnaterator/speclite) spec-driven
workflow files for this project: the roadmap, per-item plans, and project rules.

**speclite** is a lightweight, AI-native planning workflow that structures work into a
roadmap → plan → build → review → ship pipeline, driven entirely by markdown files and
AI agent skills.

Each work item moves through this lifecycle, tracked as the heading suffix in `roadmap.md`:

```text
(backlog) → PLANNED → WIP → BUILT → SHIPPED
```

Key commands:

```text
/speclite-plan    pick next item → branch → write a plan
/speclite-build   build the plan → mark BUILT
/speclite-ship    commit, push, open a PR
/speclite-run     dispatcher: run the right next skill automatically
```
