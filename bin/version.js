#!/usr/bin/env node
"use strict";

/*
 * speclite version tool — package.json is the single version source.
 *
 * Pure Node stdlib, zero runtime deps. Stamps the canonical version into every
 * plugin manifest and checks they have not drifted (CI runs --check).
 *
 * Usage:
 *   node bin/version.js              print the canonical version
 *   node bin/version.js --check      exit 1 if any manifest differs from package.json
 *   node bin/version.js --set x.y.z  write x.y.z to package.json + every manifest
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SOURCE = "package.json";
const MANIFESTS = [
  ".claude-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
  ".codex-plugin/plugin.json",
];
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

function read(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
}

function write(rel, obj) {
  fs.writeFileSync(path.join(ROOT, rel), JSON.stringify(obj, null, 2) + "\n");
}

function check() {
  const want = read(SOURCE).version;
  let ok = true;
  for (const rel of MANIFESTS) {
    const got = read(rel).version;
    if (got !== want) {
      console.error(`drift: ${rel} is ${got}, ${SOURCE} is ${want}`);
      ok = false;
    }
  }
  if (!ok) {
    console.error("fix with: make bump V=" + want);
    return 1;
  }
  console.log(`version ${want} — all ${MANIFESTS.length} manifests match ${SOURCE}`);
  return 0;
}

function set(version) {
  if (!SEMVER.test(version || "")) {
    console.error(`not a semver version: ${version || "(missing)"}`);
    return 1;
  }
  for (const rel of [SOURCE, ...MANIFESTS]) {
    const obj = read(rel);
    obj.version = version;
    write(rel, obj);
    console.log(`${rel} -> ${version}`);
  }
  return 0;
}

function main(argv) {
  const [flag, arg] = argv;
  if (!flag) {
    console.log(read(SOURCE).version);
    return 0;
  }
  if (flag === "--check") return check();
  if (flag === "--set") return set(arg);
  console.error("usage: node bin/version.js [--check | --set x.y.z]");
  return 2;
}

process.exit(main(process.argv.slice(2)));
