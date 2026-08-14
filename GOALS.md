# Volt: Goals

Numbered so we can point at "goal 3" in commits and issues. Every goal has a **done-when** condition. If we can't say when we're done, it's not a goal, it's a vibe.

## M0. Foundations (scaffold)

**G0.1** Monorepo builds end-to-end.
**Done when:** `cargo build` succeeds in `crates/volt-core`, `npm install && npm run build` succeeds at the workspace root.

**G0.2** Public strategy is legible.
**Done when:** `PLAN.md`, `GOALS.md`, `README.md` are checked in and a stranger can read them in under 10 minutes and know what this is.

**G0.3** First commit lives on GitHub.
**Done when:** repo pushed under the user's account, README renders, LICENSE is Apache-2.0.

## M1. MVP (v0.1, macOS-only)

**G1.1** A window opens.
**Done when:** `volt dev` in the quick-start example opens a native macOS window rendering an HTML page from the app's `dist/` dir.

**G1.2** IPC round-trips work.
**Done when:** clicking a button in the renderer sends a message via `ipcRenderer.invoke('ping')`, `ipcMain.handle` returns `'pong'`, and the renderer displays it.

**G1.3** A native dialog opens.
**Done when:** clicking a button calls `dialog.showOpenDialog(...)` and returns a real file path the user picked.

**G1.4** An unmodified Electron quick-start runs.
**Done when:** we clone `electron/electron-quick-start`, run `volt dev` in it (with only the one tsconfig alias or package.json swap documented in the migration guide), and it shows the same window.

**G1.5** RAM benchmark published.
**Done when:** `docs/benchmarks.md` shows Activity Monitor screenshots of the quick-start running under Electron vs Volt, with reproducible steps. Target: Volt uses <60 MB, Electron uses >150 MB.

**G1.6** JS and TS templates both work.
**Done when:** `volt init foo --js` and `volt init foo --ts` both produce a project that runs `volt dev` successfully.

## M2. Multi-platform (v0.2)

**G2.1** Windows build runs the quick-start.
**G2.2** Linux build runs the quick-start.
**G2.3** `Menu`, `Tray`, `Notification`, `shell.openExternal` implemented and demonstrated in the example.
**G2.4** CI builds all three platforms on push.

## M3. Migration tooling (v0.3)

**G3.1** `volt migrate` scans a `package.json` for Electron dependencies and rewrites `require('electron')` / `import from 'electron'` to the compat layer.
**G3.2** `volt migrate --dry-run` produces a compatibility report: which APIs the app uses, which Volt supports, which it doesn't.
**G3.3** Migration guide covers 5+ common Electron patterns with before/after code in both JS and TS.

## M4. Compat matrix (v0.5)

**G4.1** 80% of Electron's public API surface has at least a stub or working impl.
**G4.2** Compat matrix page shows API-by-API status with links to source.
**G4.3** 3+ real open-source Electron apps run under Volt with published migration writeups.

## M5. Universal migration

The goal is that **any Electron app** boots on volt with the documented two-step shim. VS Code, Hyper, Simplenote, Standard Notes, Logseq, etc. are stress tests, not per-app targets. Every one that breaks exposes a missing rung in the compat matrix; the fix lands in the compat layer proper, never as an app-specific hack.

**G5.1** A representative easy app boots.
**Done when:** `electron/electron-quick-start` runs unmodified via the two-step shim.

**G5.2** A medium-complexity app boots.
**Done when:** an app with custom title bar + real IPC surface + persistence (e.g. Simplenote) boots and its primary flows work.

**G5.3** The compat matrix is honest about what it can't do.
**Done when:** every failure surfaced by trying apps from [`docs/hardest-apps.md`](docs/hardest-apps.md) is either fixed in the compat layer or listed in the matrix as missing with a linked issue.

**G5.4** The hardest Electron apps run.
**Done when:** apps that stress every part of Electron (native modules, custom protocols, deep-link handling, spawn-heavy processes) boot far enough to prove the compat layer is exhausted, not the app.

The ladder in [`docs/hardest-apps.md`](docs/hardest-apps.md) exists to force coverage breadth; every rung passing is coverage evidence, not a per-app score.

## M-infinity. Deferred (post-traction)

Shared-runtime daemon (stripped Chromium installed once per system, apps shrink to ~5 MB). Do not start this before M4 is done. It's the biggest architectural bet in the whole plan and only pays off after real adoption.
