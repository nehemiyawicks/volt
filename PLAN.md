# Volt: Implementation Plan

Volt is an Electron-alternative desktop framework. The core bet: **the compat layer is the killer feature.** Every existing alternative (Tauri, Wails, Electrobun, Neutralino) forces a backend rewrite; that's why Electron still owns the market. Volt targets 80% of Electron's API surface so existing JavaScript and TypeScript Electron apps can migrate with an install and one alias.

## The Bet

Electron dominates because switching costs are enormous. Volt eats the switching cost, then wins on RAM and installer size.

The technical bet: don't rebuild what Tauri already got right (`wry`, `tao`). Layer on top and put every hour of effort into the differentiator: the Electron API surface, exposed to both JS and TS with matching ergonomics.

## Competitive Position

Electrobun is the closest neighbour: Bun + system WebView, lightweight, targets the same RAM/installer footprint. Electrobun does not ship an Electron compat layer, so migrating to it means rewriting `main.ts` against a new API. That's the entire wedge.

Every doc, every issue thread, every release note leads with compat, not RAM. RAM is table stakes against Electrobun; compat is why someone picks volt over Electrobun.

Compat matrix coverage is the KPI. A dev who migrates and hits a missing API does not come back, so [`docs/compat.md`](docs/compat.md) is a first-class deliverable and every PR that touches an API updates it.

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
| v0.9 | **Chromium backend** via CDP — VS Code renders | see next section |
| v1.0 | Shared-runtime daemon; VS Code runs on shared Chromium | after v0.9 |

## The Chromium pivot (v0.9)

**Reason:** VS Code's renderer depends on Chromium-only features (`<webview>` tag, V8 snapshot, `contextIsolation` isolated worlds, CDP, blink layout). WebKit cannot render VS Code correctly. To hit the "run VS Code" goal, the renderer backend must be Chromium.

**Non-negotiables preserved:**
1. Migration ergonomics stay the same. `npm install @volt/electron-compat @volt/cli` + one alias. Devs never touch the backend choice.
2. `require('electron')` returns the same shape.
3. `volt build` still produces a `.app` / `.exe` / `.AppImage`.
4. Efficiency (RAM + startup) must beat Electron for the same workload. Two levers: leaner main process (Bun vs Node), and shared runtime (v1.0) so N apps share one Chromium install.

**Approach: Chromium via CDP, not CEF.**

CEF Rust bindings are immature. Chrome DevTools Protocol (CDP) over WebSocket is a stable, well-documented interface into any Chromium build. `chromiumoxide` is a mature async CDP client crate. We spawn Chromium with `--remote-debugging-port`, connect via CDP, and create tabs as `BrowserWindow` instances.

**Runtime layout for a v0.9 volt app:**

```
+-------------------------------------------------------+
|  User code (unchanged): require('electron') ...       |
+---------------------------+---------------------------+
                            |
+---------------------------+---------------------------+
|  @volt/electron-compat  (unchanged; still stdio IPC)  |
+---------------------------+---------------------------+
                            | stdio (JSON, newline)
+---------------------------+---------------------------+
|  volt-core (Rust)                                     |
|  manifest.engine = "webkit"     manifest.engine = "chromium"
|  --------------------------     --------------------------
|  wry + tao (v0.1)               volt-cdp: spawns Chrome,
|                                  connects via CDP,
|                                  each BrowserWindow = a Target
+---------------------------+---------------------------+
                            |
+---------------------------+---------------------------+
|  Bun or Chrome for Testing / user's Chrome / bundled  |
+-------------------------------------------------------+
```

**Chromium binary source options (ranked):**
1. Bundled Chrome for Testing (Puppeteer's approach; ~200MB unzipped, downloaded on first run)
2. Detect local Chrome/Chromium/Edge and use it
3. `puppeteer` binary layout for consistency with Playwright

Users installing volt for the first time get Chrome downloaded to `~/.volt/chromium/<version>/`. Subsequent apps share it. This is the v1.0 "shared runtime" story: one Chromium on disk, one running process serving multiple volt apps.

**What CDP unlocks for VS Code:**
- Real `<webview>` (Chromium's guest content)
- Real V8 snapshot support (Chromium loads its own)
- `contextIsolation` in real isolated worlds
- CDP itself is what VS Code uses for its own debugger — full compatibility
- Blink layout — Monaco editor renders exactly as it does under Electron

**What CDP does NOT unlock:**
- Native modules built against Electron's Node ABI still need `npm rebuild` for Bun/Node
- Some Chromium features exposed as C++ APIs in Electron have no CDP equivalent (rare in practice for renderer code)

**Migration path stays identical:**
```json
// volt.manifest.json
{ "name": "code", "entry": "out/main.js", "runtime": "node", "engine": "chromium" }
```
That's it. The `engine` key defaults to `"webkit"` for existing users; setting `"chromium"` opts into the CDP backend. Everything else (`@volt/electron-compat`, `volt dev`, `volt build`) is unchanged.

**Timing:** v0.9 lands after v0.5 (compat matrix at 80%). CDP integration itself is 2-4 weeks of Rust; Chromium bootstrap/download is another 1-2. VS Code as the acceptance test.

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
