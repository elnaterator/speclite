# Rules

Use caveman ultra.

## Versioning (this repo)

`package.json` is the single version source. Never hand-edit a manifest version — run
`make bump V=x.y.z` (stamps `.claude-plugin`, `.cursor-plugin`, `.codex-plugin`). CI fails on
drift (`node bin/version.js --check`).

- Bump in the same PR as the change, by commit type: `feat` → minor, `fix`/`perf` → patch,
  `docs`/`chore`/`ci`/`test`/`refactor`/`style`/`build` → no bump. Breaking change → minor
  while `0.x`.
- After the PR merges, tag trunk: `git checkout main && git pull && make tag`, then
  `git push origin v<version>`. The tag push runs `.github/workflows/release.yml`, which
  checks the tag matches `package.json` and publishes `speclite` to npm (needs the
  `NPM_TOKEN` repo secret). Only bumped versions get tagged — npm refuses a republish.
