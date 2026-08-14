# Volt: Implementation Plan

Volt is an Electron-alternative desktop framework. The core bet: **the compat layer is the killer feature.** Every existing alternative (Tauri, Wails, Electrobun, Neutralino) forces a backend rewrite; that's why Electron still owns the market. Volt targets 80% of Electron's API surface so existing JavaScript and TypeScript Electron apps can migrate with an install and one alias.

## The Bet

Electron dominates because switching costs are enormous. Volt eats those switching costs, then wins on RAM (30 to 50 MB vs 150 to 350 MB) and installer size (<15 MB vs 100+ MB).

The technical bet: we don't need to rebuild what Tauri already got right (`wry`, `tao`). We layer on top and put all our effort into the differentiator, the Electron API surface, exposed to both JS and TS with equal ergonomics.

## Architecture

```
+---------------------------------------------------------+
|  App code (JavaScript or TypeScript, unchanged)         |
|  import { app, BrowserWindow, ipcMain } from 'electron' |
+--------------------------+------------------------------+
                           |
+--------------------------+------------------------------+
|  @volt/electron-compat  (JS runtime + .d.ts types)      |
|  - Mimics Electron's public API 1:1                     |
|  - Sends JSON commands over stdio                       |
+--------------------------+------------------------------+
                           |  stdio (JSON, newline-delimited)
+--------------------------+------------------------------+
|  volt-core  (Rust host binary)                          |
|  - wry (WebView)  +  tao (windowing)                    |
|  - Command dispatcher                                   |
|  - Native dialog, menu, tray, notification bindings     |
+--------------------------+------------------------------+
                           |
                    +------+------+
                    | System OS   |
                    | WebKit/WV2  |
                    +-------------+
```

JS runtime is Bun preferred, Node fallback. Bun gives 3 to 4x faster startup and native TS; Node keeps the door open for people who haven't installed Bun.

## Repository Layout

```
DE-ELECTRON/
  crates/
    volt-core/               Rust host binary (wry + tao)
  packages/
    electron-compat/         Drop-in replacement for require('electron')
    volt-cli/                volt init | dev | build
  examples/
    quick-start/             Minimal working app
  docs/                      Migration guide, API status
  PLAN.md                    (this file)
  GOALS.md                   Milestones with done-when criteria
  README.md                  Public-facing pitch
  LICENSE                    Apache-2.0
  Cargo.toml                 Rust workspace
  package.json               npm workspace
```

## What Ships in v0.1 (MVP)

**Platform:** macOS only. WebKit is simplest, and once the core is stable, `wry` gets us Windows and Linux nearly free.

**Electron APIs (compat layer):**

- `app`: `whenReady()`, `on('window-all-closed')`, `on('activate')`, `quit()`, `getPath()`, `getName()`, `getVersion()`
- `BrowserWindow`: constructor with common options, `loadURL()`, `loadFile()`, `on()`, `close()`, `webContents.openDevTools()`, `webContents.send()`
- `ipcMain`: `on()`, `handle()`, `removeListener()`
- `ipcRenderer`: `send()`, `on()`, `invoke()` (exposed to renderer via preload)
- `dialog`: `showOpenDialog()`, `showSaveDialog()`, `showMessageBox()`

**CLI:**

- `volt init [name]`: scaffold a project (prompts JS or TS)
- `volt dev`: run the app with hot reload of the renderer
- `volt build`: bundle the app into a `.app` (macOS)

**Not in v0.1** (explicit non-goals):

- `Menu`, `Tray`, `Notification`, `shell`, `session`, `webContents.executeJavaScript`, `protocol`: v0.2
- Windows and Linux: v0.2
- `volt migrate` CLI: v0.3
- Shared runtime daemon: v1.0+

## Phasing

| Version | What lands | Rough timing |
|---|---|---|
| v0.1 | macOS, core compat, quick-start runs unmodified | 4 to 6 weeks |
| v0.2 | Windows + Linux; Menu/Tray/Notification/shell | +6 weeks |
| v0.3 | `volt migrate` CLI, compatibility report | +4 weeks |
| v0.5 | 80% Electron API surface, benchmarks published | +12 weeks |
| v1.0 | Shared-runtime daemon (only if traction justifies) | deferred |

## Design Principles

1. **Compat before features.** Every new capability starts with "what's the exact Electron API for this?", even if Electron's shape is awkward.
2. **JS and TS are equal citizens.** Every example, doc page, and scaffold must work in both.
3. **Reuse the giants.** `wry` and `tao` are excellent. Don't rebuild them. Ship value on top.
4. **Boring stdio IPC.** No shared memory, no FFI, no clever tricks in v0.1. Newline-delimited JSON over stdio. Optimize when we have benchmarks.
5. **Every release must run a real Electron app.** No API is "done" until an existing Electron app uses it unmodified.

## What Would Kill This Project

- Chromium and WebKit rendering divergence breaks too many Electron apps. Mitigation: document caveats, provide `webPreferences` shims where possible.
- The compat layer becomes a bottomless pit and 80% coverage isn't enough. Mitigation: publish an honest compat matrix, focus on APIs used by top 100 Electron apps.
- Nobody actually cares about RAM anymore. Mitigation: pivot to "faster startup" and "smaller installers" as the pitch.
- Bun fragments or Node adds native Chromium bindings. Mitigation: the runtime is pluggable; the compat layer is the moat.
