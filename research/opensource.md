Repo look strong already: MIT license, README, CONTRIBUTING, dogfood roadmap. But no `.github/` (no CI, no templates), no git tags, no releases, no demo. Caveman say 5 things:

1. **Make demo GIF.** Dev tool live or die by 90-second demo. Record asciinema/GIF of `plan → build → review → ship` loop, put top of README. Words no sell workflow — moving picture sell workflow.

2. **Cut real release.** Tag `v0.3.0`, make GitHub Release with notes, keep changelog. Then add tiny CI: `.github/workflows/` run `node bin/install.js --dry-run --all` + markdown lint. Green badge = trust signal for stranger.

3. **Get in watering holes.** Submit to `awesome-claude-code` and other plugin marketplaces/lists, publish to npm (npx path already work — make it official package). Discovery beat quality when nobody know you exist.

4. **Launch loud, once, well.** Show HN + r/ClaudeAI + r/cursor + X thread. Angle: "spec-driven development without ceremony — one tool, three agents (Claude Code, Copilot, Cursor)." Tri-platform is the hook; nobody else do that. Write post before launch, not during.

5. **Make contributing easy before contributors come.** Add `.github/ISSUE_TEMPLATE/`, PR template, enable Discussions, label 3–5 `good first issue` items from own roadmap backlog. First stranger who file issue must get answer <24h — early responsiveness decide whether project feel alive.

Order matter: 1–2 first (make hut sturdy), then 3–4 (light signal fire), 5 before fire lit. Want me start on any? Caveman can make demo script, CI workflow, or issue templates now.

Roadmap: CI (item 2) = roadmap 016. Demo, release, launch, contributor templates not yet on the roadmap.
