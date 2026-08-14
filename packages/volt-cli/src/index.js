#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative } from "node:path";
import { readdirSync, statSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync, symlinkSync, lstatSync, unlinkSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES = resolve(__dirname, "..", "templates");

const [, , cmd, ...rest] = process.argv;

const commands = { init, dev, build, help };
(commands[cmd] ?? help)(rest).catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

async function help() {
  console.log(`volt <command>

  init [name]       scaffold a new app (--js or --ts, defaults to ts)
  dev               run the app in dev mode
  build             build a release binary
  help              show this
`);
}

async function init(args) {
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const positional = args.filter((a) => !a.startsWith("--"));
  const name = positional[0] ?? "my-volt-app";
  const lang = flags.has("--js") ? "js" : "ts";
  const target = resolve(process.cwd(), name);

  if (existsSync(target)) throw new Error(`${target} already exists`);
  const src = join(TEMPLATES, lang);
  copyDir(src, target);

  const pkgPath = join(target, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  pkg.name = name;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  console.log(`Created ${name} (${lang})`);
  console.log(`  cd ${name}`);
  console.log(`  npm install`);
  console.log(`  npx volt dev`);
}

async function dev() {
  const cwd = process.cwd();
  const manifestPath = resolve(cwd, "volt.manifest.json");
  if (!existsSync(manifestPath)) throw new Error("no volt.manifest.json in this directory");
  ensureElectronAlias(cwd);
  const core = findCore();
  const child = spawn(core, [], {
    stdio: "inherit",
    env: { ...process.env, VOLT_MANIFEST: manifestPath },
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

function ensureElectronAlias(cwd) {
  const target = findCompatDir(cwd);
  if (!target) return;
  const nm = resolve(cwd, "node_modules");
  if (!existsSync(nm)) mkdirSync(nm, { recursive: true });
  const link = join(nm, "electron");
  try {
    const st = lstatSync(link);
    if (st.isSymbolicLink() || st.isDirectory() || st.isFile()) unlinkSync(link);
  } catch {}
  const rel = relative(nm, target);
  symlinkSync(rel, link, "dir");
}

function findCompatDir(cwd) {
  let dir = cwd;
  for (let i = 0; i < 8; i++) {
    const candidate = resolve(dir, "node_modules", "@volt", "electron-compat");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

async function build() {
  console.log("build: not implemented in v0.1; use `npx volt dev` for now");
}

function findCore() {
  const local = resolve(process.cwd(), "..", "..", "target", "release", "volt-core");
  if (existsSync(local)) return local;
  const debug = resolve(process.cwd(), "..", "..", "target", "debug", "volt-core");
  if (existsSync(debug)) return debug;
  const which = spawnSync("which", ["volt-core"], { encoding: "utf8" });
  if (which.status === 0) return which.stdout.trim();
  throw new Error("volt-core binary not found; run `cargo build -p volt-core` at the repo root");
}

function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const name of readdirSync(src)) {
    const s = join(src, name);
    const d = join(dst, name);
    if (statSync(s).isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}
