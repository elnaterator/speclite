#!/usr/bin/env node
"use strict";

/*
 * speclite installer — single cross-platform entry point.
 *
 * Pure Node stdlib, zero runtime deps. Built around a small target-registry
 * framework: TARGETS is the single source of truth; adding a new agent later =
 * append one descriptor + its functions, main() never changes.
 *
 * Usage:
 *   node bin/install.js [command] [flags]
 *     (no command)    install / uninstall per the flags below
 *     version         print CLI version + what each target has installed
 *     doctor [--fix]  report stale or conflicting copies; --fix prunes the safe ones
 *     update          reinstall every target recorded in the install manifest
 *     --only <id>     claude | copilot | cursor | codex | opencode | kiro (repeatable)
 *     --all           install all detected targets
 *     --source <src>  owner/repo | local path | git URL (auto-detected when omitted)
 *     --dry-run       print actions, write nothing
 *     --uninstall     remove the install for the selected target(s)
 *     --list          print the target table and exit
 *     -h, --help      usage
 *
 * Every real install is recorded in ~/.speclite/installs.json ($SPECLITE_HOME overrides
 * ~/.speclite) so version / doctor / update know what was put where.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const PLUGIN_NAME = "speclite";
const MARKETPLACE = "speclite";
const CANONICAL_SOURCE = "elnaterator/speclite";

// Files/dirs not shipped into copy-based installs (Cursor, VS Code fallback).
const COPY_EXCLUDES = new Set([
  ".git",
  ".DS_Store",
  "CLAUDE.md",
  "README.md",
  "CONTRIBUTING.md",
  "Makefile",
  "LICENSE",
  "scripts",
  "bin",
  "package.json",
  "package-lock.json",
  "node_modules",
  ".claude-plugin",
]);

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(msg) {
  process.stdout.write(msg + "\n");
}
function warn(msg) {
  process.stderr.write(msg + "\n");
}
function fail(msg) {
  process.stderr.write("error: " + msg + "\n");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

function detectRepoRoot() {
  // bin/install.js lives at <root>/bin/. Walk up looking for the manifest.
  let dir = __dirname;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, ".claude-plugin", "marketplace.json"))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: parent of bin/.
  return path.resolve(__dirname, "..");
}

function copyDir(src, dest, ctx, excludes) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  if (!ctx.dry) fs.mkdirSync(dest, { recursive: true });
  for (const entry of entries) {
    if (excludes && excludes.has(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d, ctx, null); // only top-level names are excluded
    } else if (entry.isSymbolicLink()) {
      const link = fs.readlinkSync(s);
      if (!ctx.dry) fs.symlinkSync(link, d);
    } else {
      if (!ctx.dry) fs.copyFileSync(s, d);
    }
  }
}

function rmDir(target, ctx) {
  if (!fs.existsSync(target)) return false;
  if (!ctx.dry) fs.rmSync(target, { recursive: true, force: true });
  return true;
}

// JSONC-tolerant read so existing comments / trailing commas in a user's
// settings.json don't crash a merge.
function stripJsonComments(text) {
  let out = "";
  let inStr = false;
  let strCh = "";
  let inLine = false;
  let inBlock = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inLine) {
      if (ch === "\n") {
        inLine = false;
        out += ch;
      }
      continue;
    }
    if (inBlock) {
      if (ch === "*" && next === "/") {
        inBlock = false;
        i++;
      }
      continue;
    }
    if (inStr) {
      out += ch;
      if (ch === "\\") {
        out += next;
        i++;
      } else if (ch === strCh) {
        inStr = false;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inStr = true;
      strCh = ch;
      out += ch;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLine = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlock = true;
      i++;
      continue;
    }
    out += ch;
  }
  // Remove trailing commas before } or ].
  return out.replace(/,(\s*[}\]])/g, "$1");
}

function readJson(file) {
  if (!fs.existsSync(file)) return {};
  const raw = fs.readFileSync(file, "utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(stripJsonComments(raw));
  } catch (e) {
    throw new Error(`could not parse JSON at ${file}: ${e.message}`);
  }
}

function writeJson(file, obj, ctx) {
  const text = JSON.stringify(obj, null, 2) + "\n";
  if (ctx.dry) {
    log(`  [dry-run] would write ${file}`);
    return;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

// ---------------------------------------------------------------------------
// Command helpers
// ---------------------------------------------------------------------------

function hasCmd(cmd) {
  const finder = process.platform === "win32" ? "where" : "which";
  const r = spawnSync(finder, [cmd], { stdio: "ignore" });
  return r.status === 0;
}

function runSpawn(cmd, args, ctx, opts) {
  opts = opts || {};
  const printable = `${cmd} ${args.join(" ")}`;
  if (ctx.dry) {
    log(`  [dry-run] ${printable}`);
    return { status: 0, dry: true };
  }
  log(`  $ ${printable}`);
  const r = spawnSync(cmd, args, { stdio: "inherit" });
  if (r.status !== 0 && !opts.ignoreFailure) {
    throw new Error(`command failed (${r.status}): ${printable}`);
  }
  return r;
}

// ---------------------------------------------------------------------------
// VS Code settings
// ---------------------------------------------------------------------------

function vscodeUserDir() {
  const home = os.homedir();
  if (process.platform === "darwin") {
    return path.join(home, "Library", "Application Support", "Code", "User");
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(home, "AppData", "Roaming");
    return path.join(appData, "Code", "User");
  }
  return path.join(home, ".config", "Code", "User");
}

function vscodeSettingsPath() {
  return path.join(vscodeUserDir(), "settings.json");
}

function vscodePresent() {
  return fs.existsSync(vscodeUserDir());
}

function mergeVscodeSettings(updates, ctx) {
  const file = vscodeSettingsPath();
  const settings = readJson(file);
  let changed = false;
  for (const [k, v] of Object.entries(updates)) {
    if (JSON.stringify(settings[k]) !== JSON.stringify(v)) {
      settings[k] = v;
      changed = true;
    }
  }
  if (!changed) {
    log(`  VS Code settings already up to date (${file})`);
    return;
  }
  log(`  Merging VS Code settings (${file})`);
  writeJson(file, settings, ctx);
}

function stripVscodeKeys(keys, ctx) {
  const file = vscodeSettingsPath();
  if (!fs.existsSync(file)) return;
  const settings = readJson(file);
  let changed = false;
  for (const k of keys) {
    if (k in settings) {
      delete settings[k];
      changed = true;
    }
  }
  if (changed) {
    log(`  Removing speclite keys from VS Code settings (${file})`);
    writeJson(file, settings, ctx);
  }
}

// ---------------------------------------------------------------------------
// Target registry
// ---------------------------------------------------------------------------

const CURSOR_DIR = path.join(os.homedir(), ".cursor", "plugins", "local", PLUGIN_NAME);
// Local dir for the VS Code fallback (no copilot CLI). chat.pluginLocations
// points at the parent; the plugin lives in a named subdir.
const VSCODE_FALLBACK_PARENT = path.join(os.homedir(), ".speclite", "plugins");
const VSCODE_FALLBACK_DIR = path.join(VSCODE_FALLBACK_PARENT, PLUGIN_NAME);
// Where the host CLIs land their copies. Claude + Codex keep one subdir per version.
const CLAUDE_CACHE_DIR = () =>
  path.join(os.homedir(), ".claude", "plugins", "cache", MARKETPLACE, PLUGIN_NAME);
const CODEX_CACHE_DIR = () =>
  path.join(os.homedir(), ".codex", "plugins", "cache", MARKETPLACE, PLUGIN_NAME);
const COPILOT_PLUGIN_DIR = () =>
  path.join(os.homedir(), ".copilot", "installed-plugins", MARKETPLACE, PLUGIN_NAME);

function installClaude(ctx) {
  if (!hasCmd("claude")) {
    if (!ctx.dry) {
      fail("claude CLI not found — install Claude Code and ensure `claude` is on PATH");
    }
    warn("  [dry-run] claude CLI not found — preview only");
  }
  const listed = ctx.dry
    ? {}
    : spawnSync("claude", ["plugin", "marketplace", "list"], { encoding: "utf8" });
  const registered = listed.stdout && listed.stdout.includes(MARKETPLACE);
  if (!registered) {
    runSpawn("claude", ["plugin", "marketplace", "add", ctx.source], ctx);
  }
  const updated = runSpawn("claude", ["plugin", "marketplace", "update", MARKETPLACE], ctx, {
    ignoreFailure: true,
  });
  if (updated.status !== 0) {
    // Registered marketplace is stale (e.g. points at a moved/deleted dir).
    // Re-register against the current source.
    warn("  marketplace update failed — re-registering against current source");
    runSpawn("claude", ["plugin", "marketplace", "remove", MARKETPLACE], ctx, {
      ignoreFailure: true,
    });
    runSpawn("claude", ["plugin", "marketplace", "add", ctx.source], ctx);
  }
  runSpawn("claude", ["plugin", "uninstall", `${PLUGIN_NAME}@${MARKETPLACE}`], ctx, {
    ignoreFailure: true,
  });
  runSpawn("claude", ["plugin", "install", `${PLUGIN_NAME}@${MARKETPLACE}`], ctx);
  log("  Restart Claude Code (or run /reload-plugins) to load skills.");
}

function uninstallClaude(ctx) {
  if (!hasCmd("claude")) {
    warn("  claude CLI not found — skipping");
    return;
  }
  runSpawn("claude", ["plugin", "uninstall", `${PLUGIN_NAME}@${MARKETPLACE}`], ctx, {
    ignoreFailure: true,
  });
  runSpawn("claude", ["plugin", "marketplace", "remove", MARKETPLACE], ctx, {
    ignoreFailure: true,
  });
}

function installCopilot(ctx) {
  if (hasCmd("copilot")) {
    // Primary path: install into the shared ~/.copilot/installed-plugins/
    // location, which VS Code Copilot also auto-discovers.
    // Always re-register: an existing entry may point at a moved/deleted
    // source dir, which makes `plugin install` fail. Uninstall the plugin
    // first — `marketplace remove` refuses while its plugins are installed.
    const listed = ctx.dry
      ? {}
      : spawnSync("copilot", ["plugin", "marketplace", "list"], { encoding: "utf8" });
    const registered = listed.stdout && listed.stdout.includes(MARKETPLACE);
    runSpawn("copilot", ["plugin", "uninstall", `${PLUGIN_NAME}@${MARKETPLACE}`], ctx, {
      ignoreFailure: true,
    });
    if (registered) {
      runSpawn("copilot", ["plugin", "marketplace", "remove", MARKETPLACE], ctx, {
        ignoreFailure: true,
      });
    }
    runSpawn("copilot", ["plugin", "marketplace", "add", ctx.source], ctx);
    runSpawn("copilot", ["plugin", "install", `${PLUGIN_NAME}@${MARKETPLACE}`], ctx);
    log("  Installed for Copilot CLI (and VS Code Copilot via the shared location).");
    if (vscodePresent()) {
      mergeVscodeSettings({ "chat.plugins.enabled": true }, ctx);
      log("  VS Code: Reload Window, then Chat → Configure Skills to confirm.");
    }
    return;
  }

  // Fallback: no copilot CLI. If VS Code is present, register a local copy
  // via chat.pluginLocations + enable the preview flag.
  if (!vscodePresent()) {
    // Same convention as installClaude: a dry-run is a preview, so a missing
    // host is a warning, not a failure. Keeps `--dry-run` usable as a smoke
    // test on a bare machine (e.g. CI) while a real install still fails.
    if (!ctx.dry) {
      fail(
        "neither the `copilot` CLI nor VS Code was found — install the Copilot CLI " +
          "(github.com/github/copilot-cli) or VS Code with Copilot, then re-run"
      );
    }
    warn("  [dry-run] neither copilot CLI nor VS Code found — preview only");
  }
  warn("  copilot CLI not found — using VS Code-only fallback (chat.pluginLocations).");
  rmDir(VSCODE_FALLBACK_DIR, ctx);
  log(`  Copying plugin → ${VSCODE_FALLBACK_DIR}`);
  copyDir(ctx.repoRoot, VSCODE_FALLBACK_DIR, ctx, COPY_EXCLUDES);
  const locations = readJson(vscodeSettingsPath())["chat.pluginLocations"] || {};
  locations[VSCODE_FALLBACK_PARENT] = true;
  mergeVscodeSettings(
    { "chat.plugins.enabled": true, "chat.pluginLocations": locations },
    ctx
  );
  log("  VS Code: Reload Window, then Chat → Configure Skills to confirm.");
}

function uninstallCopilot(ctx) {
  if (hasCmd("copilot")) {
    runSpawn("copilot", ["plugin", "uninstall", `${PLUGIN_NAME}@${MARKETPLACE}`], ctx, {
      ignoreFailure: true,
    });
    runSpawn("copilot", ["plugin", "marketplace", "remove", MARKETPLACE], ctx, {
      ignoreFailure: true,
    });
  }
  // Also clean up the VS Code fallback copy + the pluginLocations entry.
  if (rmDir(VSCODE_FALLBACK_DIR, ctx)) {
    log(`  Removed ${VSCODE_FALLBACK_DIR}`);
  }
  if (vscodePresent()) {
    const settings = readJson(vscodeSettingsPath());
    const locations = settings["chat.pluginLocations"];
    if (locations && VSCODE_FALLBACK_PARENT in locations) {
      delete locations[VSCODE_FALLBACK_PARENT];
      settings["chat.pluginLocations"] = locations;
      writeJson(vscodeSettingsPath(), settings, ctx);
      log("  Removed speclite from VS Code chat.pluginLocations.");
    }
  }
}

function installCursor(ctx) {
  rmDir(CURSOR_DIR, ctx);
  log(`  Copying plugin → ${CURSOR_DIR}`);
  copyDir(ctx.repoRoot, CURSOR_DIR, ctx, COPY_EXCLUDES);
  log("  Reload Cursor: Developer → Reload Window.");
}

function uninstallCursor(ctx) {
  if (rmDir(CURSOR_DIR, ctx)) {
    log(`  Removed ${CURSOR_DIR}`);
  } else {
    log(`  Nothing to remove at ${CURSOR_DIR}`);
  }
}

// ---------------------------------------------------------------------------
// Agent Skills targets (platforms that read a plain skills directory)
// ---------------------------------------------------------------------------

// Codex, OpenCode (and later Kiro) all adopted the Agent Skills standard: a skill is a
// directory containing SKILL.md. Installing means copying each skills/* subdir into the
// platform's skills dir; uninstalling removes exactly those subdirs and nothing else
// (other tools' skills live in the same dir).
//
// templates/ is deliberately not shipped: these platforms have no CLAUDE_PLUGIN_ROOT, so
// speclite-init falls back to its inline templates.
function skillNames(repoRoot) {
  const src = path.join(repoRoot, "skills");
  if (!fs.existsSync(src)) return [];
  return fs
    .readdirSync(src, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(src, e.name, "SKILL.md")))
    .map((e) => e.name)
    .sort();
}

// Build a TARGETS entry for an Agent-Skills platform.
//   dir(): absolute path to the platform's skills directory
//   cmd:   host CLI name, checked on a real install (a dry-run only warns, matching
//          installClaude/installCopilot — CI previews on machines with no host CLI)
function skillsDirTarget({ id, name, label, cmd, dir, detect, extras }) {
  return {
    id,
    label,
    detect,
    installedPath: () => path.join(dir(), "speclite-run"),
    install(ctx) {
      if (cmd && !hasCmd(cmd)) {
        if (!ctx.dry) {
          fail(`${cmd} CLI not found — install ${name} and ensure \`${cmd}\` is on PATH`);
        }
        warn(`  [dry-run] ${cmd} CLI not found — preview only`);
      }
      const dest = dir();
      const names = skillNames(ctx.repoRoot);
      if (!names.length) fail(`no skills found under ${path.join(ctx.repoRoot, "skills")}`);
      log(`  Installing ${names.length} skills → ${dest}`);
      if (!ctx.dry) fs.mkdirSync(dest, { recursive: true });
      for (const name of names) {
        const target = path.join(dest, name);
        rmDir(target, ctx);
        copyDir(path.join(ctx.repoRoot, "skills", name), target, ctx, null);
        log(`    ${name}`);
      }
      if (extras) extras.install(ctx);
      log(`  Restart ${name} to pick up the skills.`);
      const note = extras && extras.loopNote
        ? extras.loopNote
        : ["Loop mode: this platform has no blocking Stop hook — drive it with bin/loop.sh."];
      for (const line of note) log(`  ${line}`);
    },
    uninstall(ctx) {
      const dest = dir();
      let removed = 0;
      for (const name of skillNames(ctx.repoRoot)) {
        if (rmDir(path.join(dest, name), ctx)) removed++;
      }
      if (removed) {
        log(`  Removed ${removed} speclite skills from ${dest}`);
      } else {
        log(`  Nothing to remove at ${dest}`);
      }
      if (extras) extras.uninstall(ctx);
    },
  };
}

// Copy hooks/ (loop brain + adapters) into <supportDir>/hooks — kept out of any dir the
// host scans for modules or hook definitions.
function installLoopBrain(supportDir, ctx) {
  const brainDest = path.join(supportDir, "hooks");
  log(`  Installing loop brain → ${brainDest}`);
  rmDir(brainDest, ctx);
  copyDir(path.join(ctx.repoRoot, "hooks"), brainDest, ctx, null);
  return brainDest;
}

function uninstallLoopBrain(supportDir, ctx) {
  if (rmDir(path.join(supportDir, "hooks"), ctx)) {
    log(`  Removed loop brain from ${supportDir}`);
  }
  // supportDir is speclite's own; drop it once empty so uninstall leaves no trace.
  if (!ctx.dry && fs.existsSync(supportDir) && !fs.readdirSync(supportDir).length) {
    fs.rmdirSync(supportDir);
  }
}

function removeFile(file, ctx) {
  if (!fs.existsSync(file)) return;
  if (!ctx.dry) fs.rmSync(file, { force: true });
  log(`  Removed ${file}`);
}

const OPENCODE_DIR = () => path.join(os.homedir(), ".config", "opencode");
const OPENCODE_SKILLS_DIR = () => path.join(OPENCODE_DIR(), "skills");
const OPENCODE_PLUGINS_DIR = () => path.join(OPENCODE_DIR(), "plugins");
const OPENCODE_SUPPORT_DIR = () => path.join(OPENCODE_DIR(), "speclite");
const OPENCODE_PLUGIN_FILE = path.join("plugins", "opencode", "speclite-loop.js");
const OPENCODE_PLUGIN_DEST = () =>
  path.join(OPENCODE_PLUGINS_DIR(), path.basename(OPENCODE_PLUGIN_FILE));

// OpenCode loop: a session.idle plugin that shells out to the brain. The brain goes in a
// sibling dir because OpenCode loads every module it finds in the plugins dir.
const OPENCODE_EXTRAS = {
  install(ctx) {
    const pluginDest = OPENCODE_PLUGIN_DEST();
    log(`  Installing loop plugin → ${pluginDest}`);
    if (!ctx.dry) {
      fs.mkdirSync(OPENCODE_PLUGINS_DIR(), { recursive: true });
      fs.copyFileSync(path.join(ctx.repoRoot, OPENCODE_PLUGIN_FILE), pluginDest);
    }
    installLoopBrain(OPENCODE_SUPPORT_DIR(), ctx);
  },
  uninstall(ctx) {
    removeFile(OPENCODE_PLUGIN_DEST(), ctx);
    uninstallLoopBrain(OPENCODE_SUPPORT_DIR(), ctx);
  },
  loopNote: [
    "Loop mode: the bundled plugin re-prompts on session.idle in interactive",
    "sessions; for headless runs use bin/loop.sh.",
  ],
};

// Kiro (CLI V3) reads standalone hook files from ~/.kiro/hooks/*.json and honors a Stop
// block reply carrying `decision` + `reason` only (mode-stop-kiro.sh). It does not expand
// ${CLAUDE_PLUGIN_ROOT}, so the hook command is the absolute path of the installed adapter.
const KIRO_DIR = () => path.join(os.homedir(), ".kiro");
const KIRO_SKILLS_DIR = () => path.join(KIRO_DIR(), "skills");
const KIRO_SUPPORT_DIR = () => path.join(KIRO_DIR(), "speclite");
const KIRO_HOOK_FILE = () => path.join(KIRO_DIR(), "hooks", "speclite-stop.json");

const KIRO_EXTRAS = {
  install(ctx) {
    const brainDest = installLoopBrain(KIRO_SUPPORT_DIR(), ctx);
    const hookFile = KIRO_HOOK_FILE();
    log(`  Installing Stop hook → ${hookFile}`);
    writeJson(
      hookFile,
      {
        version: "v1",
        hooks: [
          {
            name: "speclite-loop",
            description: "speclite loop mode: continue the pipeline while a loop mode is on",
            trigger: "Stop",
            action: { type: "command", command: path.join(brainDest, "mode-stop-kiro.sh") },
          },
        ],
      },
      ctx
    );
  },
  uninstall(ctx) {
    removeFile(KIRO_HOOK_FILE(), ctx);
    uninstallLoopBrain(KIRO_SUPPORT_DIR(), ctx);
  },
  loopNote: [
    "Loop mode: the Stop hook needs the V3 engine — run `kiro-cli chat --v3`",
    "(or save 3.0 as default). Kiro IDE cannot block Stop; use bin/loop.sh there.",
  ],
};

// Codex installs speclite as a real plugin (skills + Stop hook in one), the same shape the
// desktop app reads — a bare skills dir is CLI-only and does not carry hooks.
function codexMarketplaceRegistered() {
  const listed = spawnSync("codex", ["plugin", "marketplace", "list"], { encoding: "utf8" });
  return Boolean(listed.stdout && listed.stdout.includes(MARKETPLACE));
}

// speclite <= 0.3.0 installed Codex support by copying skills/* into ~/.codex/skills/.
// That location still works, so an upgrade would leave every skill defined twice — once
// there, once inside the plugin. Clear the old copies on both install and uninstall.
const CODEX_LEGACY_SKILLS_DIR = () => path.join(os.homedir(), ".codex", "skills");

function pruneLegacyCodexSkills(ctx) {
  const dir = CODEX_LEGACY_SKILLS_DIR();
  let removed = 0;
  for (const name of skillNames(ctx.repoRoot)) {
    if (rmDir(path.join(dir, name), ctx)) removed++;
  }
  if (removed) {
    log(`  Removed ${removed} skills from the pre-plugin location ${dir}`);
  }
}

function installCodex(ctx) {
  if (!hasCmd("codex")) {
    if (!ctx.dry) {
      fail("codex CLI not found — install Codex CLI and ensure `codex` is on PATH");
    }
    warn("  [dry-run] codex CLI not found — preview only");
  }
  if (ctx.dry || !codexMarketplaceRegistered()) {
    runSpawn("codex", ["plugin", "marketplace", "add", ctx.source], ctx);
  }
  runSpawn("codex", ["plugin", "remove", `${PLUGIN_NAME}@${MARKETPLACE}`], ctx, {
    ignoreFailure: true,
  });
  runSpawn("codex", ["plugin", "add", `${PLUGIN_NAME}@${MARKETPLACE}`], ctx);
  pruneLegacyCodexSkills(ctx);
  log("  Restart Codex to pick up the skills.");
  log("  Loop mode: trust the speclite Stop hook once (`/hooks`) before it will run;");
  log("  headless runs need `codex exec --dangerously-bypass-hook-trust`.");
}

function uninstallCodex(ctx) {
  runSpawn("codex", ["plugin", "remove", `${PLUGIN_NAME}@${MARKETPLACE}`], ctx, {
    ignoreFailure: true,
  });
  runSpawn("codex", ["plugin", "marketplace", "remove", MARKETPLACE], ctx, {
    ignoreFailure: true,
  });
  pruneLegacyCodexSkills(ctx);
}

const TARGETS = [
  {
    id: "claude",
    label: "Claude Code (claude CLI + local marketplace)",
    detect: () => hasCmd("claude"),
    installedPath: CLAUDE_CACHE_DIR,
    install: installClaude,
    uninstall: uninstallClaude,
  },
  {
    id: "copilot",
    label: "GitHub Copilot CLI + VS Code (shared install location)",
    detect: () => hasCmd("copilot") || vscodePresent(),
    installedPath: () =>
      fs.existsSync(COPILOT_PLUGIN_DIR()) ? COPILOT_PLUGIN_DIR() : VSCODE_FALLBACK_DIR,
    install: installCopilot,
    uninstall: uninstallCopilot,
  },
  {
    id: "cursor",
    label: "Cursor IDE or `agent` CLI (local plugin copy)",
    detect: () => hasCmd("agent") || fs.existsSync(path.join(os.homedir(), ".cursor")),
    installedPath: () => CURSOR_DIR,
    install: installCursor,
    uninstall: uninstallCursor,
  },
  {
    id: "codex",
    label: "Codex CLI + desktop app (plugin: skills + Stop hook)",
    detect: () => hasCmd("codex") || fs.existsSync(path.join(os.homedir(), ".codex")),
    installedPath: CODEX_CACHE_DIR,
    install: installCodex,
    uninstall: uninstallCodex,
  },
  skillsDirTarget({
    id: "opencode",
    name: "OpenCode",
    label: "OpenCode (skills dir + loop plugin)",
    cmd: "opencode",
    dir: OPENCODE_SKILLS_DIR,
    extras: OPENCODE_EXTRAS,
    detect: () =>
      hasCmd("opencode") ||
      fs.existsSync(path.join(os.homedir(), ".config", "opencode")),
  }),
  skillsDirTarget({
    id: "kiro",
    name: "Kiro",
    label: "Kiro CLI (skills dir + V3 Stop hook)",
    cmd: "kiro-cli",
    dir: KIRO_SKILLS_DIR,
    extras: KIRO_EXTRAS,
    detect: () => hasCmd("kiro-cli") || fs.existsSync(KIRO_DIR()),
  }),
];

function targetById(id) {
  return TARGETS.find((t) => t.id === id);
}

// ---------------------------------------------------------------------------
// Source resolution
// ---------------------------------------------------------------------------

function resolveSource(repoRoot, opts) {
  if (opts.source) return opts.source;
  // A persistent checkout has a .git dir → install from the local path so
  // contributors test their working tree. An ephemeral npx clone (github:…)
  // has no .git → fall back to the canonical GitHub repo for CLI targets.
  if (fs.existsSync(path.join(repoRoot, ".git"))) return repoRoot;
  return CANONICAL_SOURCE;
}

// ---------------------------------------------------------------------------
// Install manifest
// ---------------------------------------------------------------------------

// One entry per target, written after every real install and dropped on uninstall.
// Copy-based targets carry no version of their own, so this is the only record of what
// went where.
const SPECLITE_HOME = () => process.env.SPECLITE_HOME || path.join(os.homedir(), ".speclite");
const MANIFEST_FILE = () => path.join(SPECLITE_HOME(), "installs.json");

function readManifest() {
  const m = readJson(MANIFEST_FILE());
  return { schema: 1, installs: m.installs || {} };
}

function writeManifest(manifest, ctx) {
  if (ctx.dry) return; // a preview never touches the record
  writeJson(MANIFEST_FILE(), manifest, ctx);
}

function sourceVersion(repoRoot) {
  return readJson(path.join(repoRoot, "package.json")).version || null;
}

function sourceSha(repoRoot) {
  if (!fs.existsSync(path.join(repoRoot, ".git"))) return null;
  const r = spawnSync("git", ["-C", repoRoot, "rev-parse", "HEAD"], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

function recordInstall(t, ctx) {
  const manifest = readManifest();
  manifest.installs[t.id] = {
    target: t.id,
    version: sourceVersion(ctx.repoRoot),
    sha: sourceSha(ctx.repoRoot),
    source: ctx.source,
    installedAt: new Date().toISOString(),
  };
  writeManifest(manifest, ctx);
}

function forgetInstall(t, ctx) {
  const manifest = readManifest();
  if (!(t.id in manifest.installs)) return;
  delete manifest.installs[t.id];
  writeManifest(manifest, ctx);
}

// Numeric semver compare on major.minor.patch (pre-release tags ignored).
function compareVersions(a, b) {
  const pa = String(a).split("-")[0].split(".").map(Number);
  const pb = String(b).split("-")[0].split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d;
  }
  return 0;
}

// ---------------------------------------------------------------------------
// Subcommands: version / doctor / update
// ---------------------------------------------------------------------------

function cmdVersion(ctx) {
  log(`speclite ${sourceVersion(ctx.repoRoot) || "unknown"} (installer at ${ctx.repoRoot})`);
  const sha = sourceSha(ctx.repoRoot);
  if (sha) log(`source sha ${sha.slice(0, 12)}`);
  const installs = Object.values(readManifest().installs);
  log("");
  if (!installs.length) {
    log(`No installs recorded in ${MANIFEST_FILE()}.`);
    return 0;
  }
  log(`Installed (${MANIFEST_FILE()}):`);
  for (const e of installs) {
    const short = e.sha ? e.sha.slice(0, 12) : "no sha";
    log(`  ${e.target.padEnd(8)} ${e.version || "?"}  ${short}  ${e.installedAt}  ${e.source}`);
  }
  return 0;
}

function versionDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort(compareVersions);
}

function speclitePrefixed(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((n) => n.startsWith("speclite-"))
    .map((n) => path.join(dir, n));
}

// Each check returns findings: { msg, fix?(ctx) }. A finding without fix() is reported
// only — doctor never deletes what a user may have set up on purpose (dev symlinks,
// project-level copies); it says how to resolve it instead.
const DOCTOR_CHECKS = [
  function hostCaches(ctx) {
    const findings = [];
    const want = sourceVersion(ctx.repoRoot);
    const hosts = [
      ["Claude Code", "claude", CLAUDE_CACHE_DIR()],
      ["Codex", "codex", CODEX_CACHE_DIR()],
    ];
    for (const [host, id, dir] of hosts) {
      const versions = versionDirs(dir);
      if (!versions.length) continue;
      const newest = versions[versions.length - 1];
      for (const v of versions.slice(0, -1)) {
        const stale = path.join(dir, v);
        findings.push({
          msg: `${host}: old cached version ${v} beside ${newest} — ${stale}`,
          fix: (c) => rmDir(stale, c) && log(`  removed ${stale}`),
        });
      }
      if (want && compareVersions(newest, want) < 0) {
        findings.push({
          msg: `${host}: installed ${newest} is older than source ${want} — reinstall with \`--only ${id}\``,
        });
      }
    }
    return findings;
  },
  function devShadows() {
    return speclitePrefixed(path.join(os.homedir(), ".claude", "skills")).map((p) => ({
      msg: `user-level skill shadows the Claude plugin — ${p} (remove it unless you are developing speclite)`,
    }));
  },
  function legacyCodexSkills(ctx) {
    const dir = CODEX_LEGACY_SKILLS_DIR();
    const present = skillNames(ctx.repoRoot).filter((n) => fs.existsSync(path.join(dir, n)));
    if (!present.length) return [];
    return [
      {
        msg: `Codex: ${present.length} pre-plugin skill copies in ${dir} (skills load twice)`,
        fix: (c) => pruneLegacyCodexSkills(c),
      },
    ];
  },
  function vscodeFallbackDuplicate(ctx) {
    if (!fs.existsSync(COPILOT_PLUGIN_DIR())) return [];
    const settings = vscodePresent() ? readJson(vscodeSettingsPath()) : {};
    const locations = settings["chat.pluginLocations"] || {};
    const registered = VSCODE_FALLBACK_PARENT in locations;
    if (!fs.existsSync(VSCODE_FALLBACK_DIR) && !registered) return [];
    return [
      {
        msg: `VS Code: fallback copy ${VSCODE_FALLBACK_DIR} alongside the Copilot install (skills load twice)`,
        fix: (c) => {
          if (rmDir(VSCODE_FALLBACK_DIR, c)) log(`  removed ${VSCODE_FALLBACK_DIR}`);
          if (registered) {
            delete locations[VSCODE_FALLBACK_PARENT];
            settings["chat.pluginLocations"] = locations;
            writeJson(vscodeSettingsPath(), settings, c);
            log("  removed speclite from VS Code chat.pluginLocations");
          }
        },
      },
    ];
  },
  function projectCopies() {
    return speclitePrefixed(path.join(process.cwd(), ".claude", "skills")).map((p) => ({
      msg: `project-level skill copy shadows the plugin — ${p}`,
    }));
  },
  function manifestEntries(ctx) {
    const findings = [];
    const want = sourceVersion(ctx.repoRoot);
    const sha = sourceSha(ctx.repoRoot);
    for (const e of Object.values(readManifest().installs)) {
      const t = targetById(e.target);
      const where = t && t.installedPath ? t.installedPath() : null;
      if (where && !fs.existsSync(where)) {
        findings.push({
          msg: `${e.target}: recorded install is gone (${where})`,
          fix: (c) => {
            forgetInstall({ id: e.target }, c);
            log(`  dropped ${e.target} from ${MANIFEST_FILE()}`);
          },
        });
        continue;
      }
      if (want && e.version && compareVersions(e.version, want) < 0) {
        findings.push({ msg: `${e.target}: installed ${e.version}, source is ${want} — run \`update\`` });
      } else if (sha && e.sha && e.sha !== sha) {
        findings.push({
          msg: `${e.target}: installed from ${e.sha.slice(0, 12)}, source is ${sha.slice(0, 12)} — run \`update\``,
        });
      }
    }
    return findings;
  },
];

function cmdDoctor(ctx) {
  if (ctx.dry) log("[dry-run] no files will be written\n");
  const findings = DOCTOR_CHECKS.flatMap((check) => check(ctx));
  if (!findings.length) {
    log("doctor: no stale or conflicting speclite copies found.");
    return 0;
  }
  let open = 0;
  for (const f of findings) {
    const tag = f.fix ? (ctx.opts.fix ? "fix " : "fixable") : "manual";
    log(`[${tag.padEnd(7)}] ${f.msg}`);
    if (f.fix && ctx.opts.fix) {
      f.fix(ctx);
    } else {
      open++;
    }
  }
  log("");
  if (!open) {
    log(ctx.dry ? "doctor: all findings fixable (dry-run, nothing changed)." : "doctor: fixed.");
    return 0;
  }
  const fixable = findings.filter((f) => f.fix).length;
  log(`doctor: ${open} problem(s) open.` + (fixable && !ctx.opts.fix ? " Re-run with --fix to prune the fixable ones." : ""));
  return 1;
}

function cmdUpdate(ctx) {
  const ids = Object.keys(readManifest().installs);
  if (!ids.length) {
    log(`No installs recorded in ${MANIFEST_FILE()} — install with --only <id> or --all first.`);
    return 0;
  }
  if (ctx.dry) log("[dry-run] no files will be written\n");
  log(`Source: ${ctx.source}\n`);
  for (const id of ids) {
    const t = targetById(id);
    if (!t) {
      warn(`skipping unknown target in manifest: ${id}`);
      continue;
    }
    log(`Updating ${t.id} — ${t.label}`);
    t.install(ctx);
    recordInstall(t, ctx);
    log("");
  }
  log(ctx.dry ? "Done (dry-run)." : "Done.");
  return 0;
}

const COMMANDS = { version: cmdVersion, doctor: cmdDoctor, update: cmdUpdate };

// ---------------------------------------------------------------------------
// Args + main
// ---------------------------------------------------------------------------

const HELP = `speclite installer

Usage: node bin/install.js [command] [flags]

Commands (omit to install / uninstall per the flags):
  version         Print the CLI version and what each target has installed
  doctor          Report stale or conflicting speclite copies (exit 1 if any)
  update          Reinstall every target recorded in the install manifest

Flags:
  --only <id>     Install only this target (repeatable):
                  claude | copilot | cursor | codex | opencode | kiro
  --all           Install all detected targets
  --source <src>  owner/repo | local path | git URL (auto-detected when omitted)
  --dry-run       Print actions without writing anything
  --uninstall     Remove the install for the selected target(s)
  --list          Print the target table and exit
  --fix           doctor: prune the fixable findings
  -h, --help      Show this help

Installs are recorded in ~/.speclite/installs.json (override dir with SPECLITE_HOME).

Examples:
  node bin/install.js --only copilot
  node bin/install.js --only copilot --dry-run
  node bin/install.js --all
  npx @elnaterator/speclite@latest --only copilot
  npx @elnaterator/speclite@latest doctor --fix
  npx @elnaterator/speclite@latest update
`;

function parseArgs(argv) {
  const opts = {
    cmd: null,
    only: [],
    all: false,
    source: null,
    dry: false,
    fix: false,
    uninstall: false,
    list: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "--only":
        opts.only.push(argv[++i]);
        break;
      case "--all":
        opts.all = true;
        break;
      case "--source":
        opts.source = argv[++i];
        break;
      case "--dry-run":
        opts.dry = true;
        break;
      case "--uninstall":
        opts.uninstall = true;
        break;
      case "--list":
        opts.list = true;
        break;
      case "-h":
      case "--help":
        opts.help = true;
        break;
      case "--fix":
        opts.fix = true;
        break;
      case "--":
        break; // accept and ignore POSIX separator (npx passes it through)
      default:
        if (!opts.cmd && Object.prototype.hasOwnProperty.call(COMMANDS, a)) {
          opts.cmd = a;
          break;
        }
        fail(`unknown flag: ${a}\n\n${HELP}`);
    }
  }
  return opts;
}

function printList() {
  log("Available targets:");
  for (const t of TARGETS) {
    const detected = t.detect() ? "detected" : "not detected";
    log(`  ${t.id.padEnd(8)} ${t.label}  [${detected}]`);
  }
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.help) {
    log(HELP);
    return;
  }
  if (opts.list) {
    printList();
    return;
  }

  const repoRoot = detectRepoRoot();
  const source = resolveSource(repoRoot, opts);
  const ctx = { repoRoot, source, dry: opts.dry, opts };

  if (opts.cmd) {
    process.exitCode = COMMANDS[opts.cmd](ctx);
    return;
  }

  // Resolve selected targets.
  let selected;
  if (opts.only.length) {
    selected = opts.only.map((id) => {
      const t = targetById(id);
      if (!t) fail(`unknown target: ${id} (expected ${TARGETS.map((x) => x.id).join(" | ")})`);
      return t;
    });
  } else if (opts.all) {
    selected = TARGETS.filter((t) => t.detect());
    if (!selected.length) fail("no targets detected; nothing to do");
  } else {
    log(HELP);
    return;
  }

  const verb = opts.uninstall ? "Uninstalling" : "Installing";
  if (opts.dry) log("[dry-run] no files will be written\n");
  if (!opts.uninstall) log(`Source: ${source}`);
  log(`Repo:   ${repoRoot}\n`);

  for (const t of selected) {
    log(`${verb} ${t.id} — ${t.label}`);
    if (opts.uninstall) {
      t.uninstall(ctx);
      forgetInstall(t, ctx);
    } else {
      t.install(ctx);
      recordInstall(t, ctx);
    }
    log("");
  }

  log(opts.dry ? "Done (dry-run)." : "Done.");
}

main();
