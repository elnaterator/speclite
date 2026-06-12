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
 *   node bin/install.js [flags]
 *     --only <id>     claude | copilot | cursor (repeatable)
 *     --all           install all detected targets
 *     --source <src>  owner/repo | local path | git URL (auto-detected when omitted)
 *     --dry-run       print actions, write nothing
 *     --uninstall     remove the install for the selected target(s)
 *     --list          print the target table and exit
 *     -h, --help      usage
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
  runSpawn("claude", ["plugin", "marketplace", "update", MARKETPLACE], ctx);
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
    const listed = ctx.dry
      ? {}
      : spawnSync("copilot", ["plugin", "marketplace", "list"], { encoding: "utf8" });
    const registered = listed.stdout && listed.stdout.includes(MARKETPLACE);
    if (!registered) {
      runSpawn("copilot", ["plugin", "marketplace", "add", ctx.source], ctx);
    }
    runSpawn("copilot", ["plugin", "uninstall", `${PLUGIN_NAME}@${MARKETPLACE}`], ctx, {
      ignoreFailure: true,
    });
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
    fail(
      "neither the `copilot` CLI nor VS Code was found — install the Copilot CLI " +
        "(github.com/github/copilot-cli) or VS Code with Copilot, then re-run"
    );
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

const TARGETS = [
  {
    id: "claude",
    label: "Claude Code (claude CLI + local marketplace)",
    detect: () => hasCmd("claude"),
    install: installClaude,
    uninstall: uninstallClaude,
  },
  {
    id: "copilot",
    label: "GitHub Copilot CLI + VS Code (shared install location)",
    detect: () => hasCmd("copilot") || vscodePresent(),
    install: installCopilot,
    uninstall: uninstallCopilot,
  },
  {
    id: "cursor",
    label: "Cursor IDE or `agent` CLI (local plugin copy)",
    detect: () => hasCmd("agent") || fs.existsSync(path.join(os.homedir(), ".cursor")),
    install: installCursor,
    uninstall: uninstallCursor,
  },
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
// Args + main
// ---------------------------------------------------------------------------

const HELP = `speclite installer

Usage: node bin/install.js [flags]

Flags:
  --only <id>     Install only this target (repeatable): claude | copilot | cursor
  --all           Install all detected targets
  --source <src>  owner/repo | local path | git URL (auto-detected when omitted)
  --dry-run       Print actions without writing anything
  --uninstall     Remove the install for the selected target(s)
  --list          Print the target table and exit
  -h, --help      Show this help

Examples:
  node bin/install.js --only copilot
  node bin/install.js --only copilot --dry-run
  node bin/install.js --all
  npx -y github:elnaterator/speclite -- --only copilot
`;

function parseArgs(argv) {
  const opts = { only: [], all: false, source: null, dry: false, uninstall: false, list: false, help: false };
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
      case "--":
        break; // accept and ignore POSIX separator (npx passes it through)
      default:
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

  // Resolve selected targets.
  let selected;
  if (opts.only.length) {
    selected = opts.only.map((id) => {
      const t = targetById(id);
      if (!t) fail(`unknown target: ${id} (expected claude | copilot | cursor)`);
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
    } else {
      t.install(ctx);
    }
    log("");
  }

  log(opts.dry ? "Done (dry-run)." : "Done.");
}

main();
