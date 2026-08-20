# VS Code on volt: status

The goal is to run VS Code (`microsoft/vscode`) unmodified on volt. This page is the honest tracker.

## What "run" actually means

Two distinct things:

1. **The main process boots.** `electron .` equivalent: our host spawns the JS runtime, the JS runtime runs VS Code's `out/main.js`, every `require('electron')` destructure returns real values, `app.whenReady()` resolves, `BrowserWindow` construction succeeds.
2. **The renderer renders VS Code correctly.** The window loads `workbench.html`, Monaco editor mounts, extension host attaches, terminal opens.

Volt's current architecture (`wry` + WebKit + Bun/Node subprocess) can plausibly get item 1 working with enough compat surface. **Item 2 has hard architectural blockers.**

## Hard architectural blockers (WebKit ≠ Chromium)

VS Code depends on Chromium-specific features that WebKit does not have and cannot get:

| Feature | Why VS Code needs it | Why WebKit can't provide |
|---|---|---|
| `<webview>` guest tag | Extension UIs (Copilot Chat, GitHub PRs, notebook renderers) | Chromium-only guest-content system |
| `BrowserView` | Editor split panes in some layouts | Chromium overlay APIs; deprecated in Electron but still used |
| V8 snapshot | 200ms startup difference; VS Code ships pre-cooked V8 snapshots | JSC has no equivalent |
| Blink layout quirks | VS Code's CSS was authored against Blink; WebKit renders subpixels, flexbox, grid, and text metrics slightly differently | Fundamental engine difference |
| `contextIsolation` in a true isolated world | Extension host renders trusted+untrusted content in the same page | WebKit has no isolated-world concept for user JS |
| Chromium's `session` cache/cookie/storage backends | Persistent auth, workspace state, IndexedDB with quotas | WebKit's website data store has a different shape |
| `WebFrameMain` with process isolation | Extension host cross-process messaging | WKWebView isolates by process differently |
| Chromium DevTools protocol (CDP) | Debug adapters, "Inspect" for webviews | WebKit inspector is a different protocol |
| Chrome extension API surface | vsix loading uses it in places | WebKit has none of this |

**Conclusion:** volt in its current form can get VS Code's main process to run, but cannot render the workbench UI correctly. The renderer engine mismatch is not fixable via compat-layer stubs.

## Path forward for actually running VS Code

Two options, both v2.0-scale:

1. **Bundle CEF or Chromium directly.** Replace `wry` with a Rust binding to CEF (Chromium Embedded Framework) or spawn a Chromium subprocess we control. This is a several-month effort but restores every Chromium feature. Effectively becomes Electron with a Rust host process instead of Chromium's browser process.
2. **Contribute upstream to wry to support the guest APIs VS Code needs via WebKit's `WKWebView` navigation delegates.** Partial coverage only; several features simply have no WebKit equivalent.

Neither path is on the current roadmap.

## What we're doing anyway

The v0.1 compat layer is being pushed as broad as possible so that:

- `require('electron')` at any top-level file in VS Code returns real bindings (no init TypeError)
- The bootstrap sequence in `src/vs/code/electron-main/main.ts` (fetched via workflow: only imports `{ app, dialog }` and calls `app.exit` / `dialog.showMessageBoxSync`) runs to completion
- `BrowserWindow` constructs (with all the `webPreferences` VS Code sets), `loadFile('workbench.html')` runs, the renderer script starts executing
- The first error is a Chromium-specific one, not a missing volt API

We are treating VS Code as a stress test to force compat coverage broader than any other target on the ladder. Every API added for VS Code compat also helps every other real Electron app. That's the value even without item 2 landing.

## Concrete next volt work driven by VS Code

Landed:

- `TouchBar` + all sub-classes (constructor stubs)
- `BrowserView`
- `MessageChannelMain` / `MessagePortMain` (real paired ports)
- `utilityProcess.fork` (wraps `child_process.fork`)
- `powerSaveBlocker` / `contentTracing`
- Expanded `session`: `webRequest`, `protocol`, `serviceWorkers`, `extensions`, `setSpellCheckerLanguages`, `setProxy`, `getStoragePath`, permission/device/bluetooth handlers, `fetch`
- Expanded `shell`: `openPath`, `showItemInFolder`, `trashItem`, `beep`
- Expanded `app`: `setPath`, `setActivationPolicy`, user activity family, `setJumpList`, `getFileIcon`, security-scoped resources, `getPreferredSystemLanguages`, `getSystemLocale`, login-item settings, emoji panel, `runningUnderARM64Translation`, `enableSandbox`, `getApplicationInfoForProtocol`

Missing (either hard or deferred):

- Real `contextIsolation` isolated world (hard block per above)
- `WebFrameMain` (hard block per above)
- Real cross-process extension host (would need Bun/Node subprocess spawning with IPC channels — doable but scoped as v0.3)
- `<webview>` tag support (hard block)
- Real `session.webRequest` header interception (needs `WKURLSchemeHandler` per partition; medium-scope Rust work)
- `session.setPermissionRequestHandler` actually invoked by native code (medium-scope Rust)
- Real single-instance lock with `second-instance` event handoff (medium-scope; unix domain socket in `XDG_RUNTIME_DIR`)
- CDP-compatible DevTools protocol (hard)
- V8 snapshot loading (WebKit incompatibility)

## How to try it yourself

```bash
git clone --depth 1 https://github.com/microsoft/vscode.git
cd vscode
npm install
npm run compile
mkdir -p node_modules/@volt
ln -s /path/to/volt/packages/electron-compat node_modules/@volt/electron-compat
rm -rf node_modules/electron
ln -s @volt/electron-compat node_modules/electron
cat > volt.manifest.json <<EOF
{ "name": "code", "entry": "out/main.js", "runtime": "node" }
EOF
npx volt dev
```

Expected outcome today: main process runs, window opens, renderer script starts, hits a Chromium-specific feature and shows an error page. File the exact error against volt (which native module or DOM API blew up) and it goes on the fix list.
