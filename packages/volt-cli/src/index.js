#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0

import { fileURLToPath } from "node:url";
import { dirname, resolve, join, relative } from "node:path";
import { readdirSync, statSync, mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync, symlinkSync, lstatSync, unlinkSync, rmSync } from "node:fs";
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
    if (st.isSymbolicLink()) {
      unlinkSync(link);
    } else if (st.isDirectory() || st.isFile()) {
      rmSync(link, { recursive: true, force: true });
    }
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
  const cwd = process.cwd();
  const manifestPath = resolve(cwd, "volt.manifest.json");
  if (!existsSync(manifestPath)) throw new Error("no volt.manifest.json in this directory");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const pkg = existsSync(resolve(cwd, "package.json"))
    ? JSON.parse(readFileSync(resolve(cwd, "package.json"), "utf8"))
    : {};

  const appName = manifest.name || pkg.name || "Volt App";
  const version = pkg.version || "0.0.0";
  const bundleId = manifest.bundleId || `dev.volt.${appName.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
  const distDir = resolve(cwd, "dist");
  const appDir = join(distDir, `${appName}.app`);
  const contents = join(appDir, "Contents");
  const macosDir = join(contents, "MacOS");
  const resourcesDir = join(contents, "Resources");

  if (existsSync(appDir)) rmrfDir(appDir);
  mkdirSync(macosDir, { recursive: true });
  mkdirSync(resourcesDir, { recursive: true });

  const core = findCore();
  copyFileSync(core, join(macosDir, appName));
  spawnSync("chmod", ["+x", join(macosDir, appName)]);

  copyFileSync(manifestPath, join(resourcesDir, "volt.manifest.json"));

  const entryAbs = resolve(cwd, manifest.entry);
  const entryRel = relative(cwd, entryAbs);
  copyIntoResources(cwd, resourcesDir, entryRel);

  const nm = resolve(cwd, "node_modules");
  if (existsSync(nm)) copyDir(nm, join(resourcesDir, "node_modules"));

  writeFileSync(
    join(contents, "Info.plist"),
    infoPlist({ appName, version, bundleId }),
  );

  console.log(`Built ${appDir}`);
  console.log(`  open ${appDir}     # to launch`);
}

function copyIntoResources(root, resources, relPath) {
  const src = resolve(root, relPath);
  const dst = join(resources, relPath);
  const st = statSync(src);
  if (st.isDirectory()) {
    copyDir(src, dst);
  } else {
    mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(src, dst);
  }
  const srcDir = dirname(src);
  if (srcDir !== root) {
    for (const sibling of readdirSync(srcDir)) {
      const sibSrc = join(srcDir, sibling);
      if (sibSrc === src) continue;
      if (statSync(sibSrc).isFile()) {
        const rel = relative(root, sibSrc);
        const sibDst = join(resources, rel);
        mkdirSync(dirname(sibDst), { recursive: true });
        copyFileSync(sibSrc, sibDst);
      }
    }
  }
}

function rmrfDir(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = lstatSync(p);
    if (st.isDirectory() && !st.isSymbolicLink()) rmrfDir(p);
    else unlinkSync(p);
  }
  try { require("node:fs").rmdirSync(dir); } catch {}
}

function infoPlist({ appName, version, bundleId }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key><string>${appName}</string>
  <key>CFBundleDisplayName</key><string>${appName}</string>
  <key>CFBundleIdentifier</key><string>${bundleId}</string>
  <key>CFBundleVersion</key><string>${version}</string>
  <key>CFBundleShortVersionString</key><string>${version}</string>
  <key>CFBundleExecutable</key><string>${appName}</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSMinimumSystemVersion</key><string>11.0</string>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
`;
}

function findCore() {
  if (process.env.VOLT_CORE_BIN && existsSync(process.env.VOLT_CORE_BIN)) {
    return process.env.VOLT_CORE_BIN;
  }
  const roots = [process.cwd(), __dirname];
  for (const root of roots) {
    let dir = root;
    for (let i = 0; i < 12; i++) {
      for (const flavour of ["release", "debug"]) {
        const p = resolve(dir, "target", flavour, "volt-core");
        if (existsSync(p)) return p;
      }
      const bin = resolve(dir, "node_modules", ".bin", "volt-core");
      if (existsSync(bin)) return bin;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  const which = spawnSync("which", ["volt-core"], { encoding: "utf8" });
  if (which.status === 0) return which.stdout.trim();
  throw new Error(
    "volt-core binary not found. Options:\n" +
    "  1. cargo build -p volt-core at the volt repo root\n" +
    "  2. set VOLT_CORE_BIN=/absolute/path/to/volt-core\n" +
    "  3. install a prebuilt binary into node_modules/.bin/volt-core",
  );
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
