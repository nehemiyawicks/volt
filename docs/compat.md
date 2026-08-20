# Electron API compatibility matrix

This page is the project's KPI. Coverage here is what makes a migration succeed or fail. Update the row on every PR that touches an API. Do not overstate: a missing button in a dialog is `partial`, not `works`.

Status legend: **works**, **partial**, **stub** (present but no-op), **missing**.

## Main process

| API | Status | Notes |
|---|---|---|
| `app.whenReady()` | works | |
| `app.on('window-all-closed')` | works | |
| `app.on('activate')` | works | fires on macOS Dock click via tao Event::Reopen; receives `{ hasVisibleWindows }` |
| `app.quit()` | works | |
| `app.getName()` | works | reads `VOLT_APP_NAME` env or falls back |
| `app.getVersion()` | works | reads `VOLT_APP_VERSION` env or falls back |
| `app.getPath()` | works | `home`, `appData`, `userData`, `sessionData`, `temp`, `exe`, `module`, `desktop`, `documents`, `downloads`, `music`, `pictures`, `videos`, `recent`, `logs`, `crashDumps` |
| `app.getAppPath()` | works | returns `process.cwd()` |
| `app.getLocale()` | partial | parsed from `$LANG`; no CFLocale integration yet |
| `app.setName()` | works | sets `VOLT_APP_NAME` for subsequent `getName`/`getPath` calls |
| `app.exit()` | works | |
| `app.isReady()` | works | (always true after whenReady resolves) |
| `app.isPackaged` | partial | true when running from a `.app` bundle |
| `app.setBadgeCount` / `getBadgeCount` | stub | no-op today; macOS dock badge is v0.2 |
| `app.setAppUserModelId` | stub | no-op |
| `app.setAsDefaultProtocolClient` / friends | stub | protocol-handler registration is v0.3 |
| `app.requestSingleInstanceLock` | stub | always returns true (no cross-process guard yet) |
| `session.defaultSession` | stub | class exists with cookies, webRequest, clearCache etc. as no-ops so `session.defaultSession.clearCache()` doesn't crash the app; real backend v0.3+ |
| `powerMonitor.*` | stub | getSystemIdleState/isOnBatteryPower/etc. return neutral defaults; events don't fire |
| `systemPreferences.*` | stub | getAccentColor/getEffectiveAppearance/isDarkMode return neutral defaults; enough that apps don't crash reading them |
| `autoUpdater.checkForUpdates()` | stub | fires `checking-for-update` then `update-not-available`; no real update backend |
| `protocol.registerFileProtocol` and friends | stub | handlers stored but not wired to wry's custom-protocol backend yet |
| `desktopCapturer.getSources` | stub | returns empty array |
| `BrowserWindow` constructor | works | `title`, `width`, `height`, `x`, `y`, `resizable`, `minimizable`, `maximizable`, `alwaysOnTop`, `frame`, `transparent`, `show`, `webPreferences` |
| `BrowserWindow.loadURL()` | works | |
| `BrowserWindow.loadFile()` | works | resolves to `file://` URL |
| `BrowserWindow.close()` | works | |
| `BrowserWindow.show/hide/focus` | works | |
| `BrowserWindow.minimize/maximize/unmaximize/restore` | works | |
| `BrowserWindow.setTitle` | works | |
| `BrowserWindow.setBounds/getBounds` | works | logical coordinates |
| `BrowserWindow.setAlwaysOnTop` | works | |
| `BrowserWindow.on('closed')` | works | |
| `BrowserWindow.on('focus')` / `on('blur')` | works | fires on native focus change |
| `BrowserWindow.on('ready-to-show')` | works | fires once when the first page finishes loading |
| `webContents.on('did-start-loading')` | works | wry PageLoadEvent::Started |
| `webContents.on('did-finish-load')` | works | wry PageLoadEvent::Finished |
| `BrowserWindow.getAllWindows()` | works | JS-side registry of live windows |
| `BrowserWindow.fromId(id)` | works | |
| `BrowserWindow.getFocusedWindow()` | works | tracked via focus/blur events |
| `webContents.executeJavaScript(code)` | works | returns the evaluated value; complex objects serialised as JSON |
| `webContents.reload()` | works | delegates to `location.reload()` |
| `webContents.openDevTools()` | works | native WebKit inspector |
| `webContents.closeDevTools()` | works | |
| `webContents.toggleDevTools()` | works | |
| `webContents.send()` | works | fires `window.volt.on(channel, cb)` in the renderer |
| `ipcMain.handle()` | works | invocations from renderer via `window.volt.invoke` |
| `ipcMain.handleOnce()` | works | |
| `ipcMain.removeHandler()` | works | |
| `dialog.showMessageBox()` | works | up to 3 custom buttons; returns the clicked index; supports `type: info/warning/error` |
| `dialog.showErrorBox(title, content)` | works | one-shot error dialog with OK button |
| `dialog.showMessageBoxSync()` | partial | async under the hood (returns the response index directly) |
| `dialog.showOpenDialog()` | works | files, folders, multi-select, filters |
| `dialog.showSaveDialog()` | works | filters, default path |
| `shell.openExternal()` | works | uses `open` (macOS), `start` (Windows), `xdg-open` (Linux) |
| `Notification` | works | title, body, subtitle (macOS); no click events yet |
| `Notification.isSupported()` | works | always true in v0.1 |
| `Menu.buildFromTemplate` | works | roles, submenus, accelerators (CmdOrCtrl+N syntax), click handlers |
| `Menu.setApplicationMenu` | works | macOS app menu; per-window on Windows/Linux |
| `MenuItem` | partial | id, label, role, accelerator, enabled, submenu, click; no checkbox/radio state yet |
| `MenuItem` accelerator collision detection | works | `Menu.buildFromTemplate` throws a JS error if a custom accelerator clashes with a role's system shortcut (prevents the macOS NSException crash) |
| `clipboard.readText` / `writeText` | works | via `arboard` |
| `globalShortcut.register` / `unregister` / `unregisterAll` / `isRegistered` | works | via `global-hotkey`; same accelerator syntax as Electron |
| `app.on('before-quit')` / `on('will-quit')` | partial | fires on `app.quit()` and `app.exit()`; not cancelable via `event.preventDefault()` yet |
| `Tray` constructor | works | falls back to a plain grey 16x16 default when no icon path is given |
| `Tray.setToolTip` | works | |
| `Tray.setContextMenu` | works | reuses the `Menu` template shape |
| `Tray.destroy` / `isDestroyed` | works | |
| `Tray` `click` event | works | fires on left click |
| `screen.getPrimaryDisplay()` | works | via tao MonitorHandle |
| `screen.getAllDisplays()` | works | |
| `nativeTheme.shouldUseDarkColors` | partial | polled from macOS `defaults read -g AppleInterfaceStyle`; no live change events yet |
| `nativeImage` | stub | `createFromPath`, `createEmpty`, `createFromBuffer`, `createFromDataURL` return objects that pass through the path string. `toPNG`/`toJPEG`/`getSize` return zeros. Enough to let apps that pass paths through unchanged (Tray icons, Notifications) work; not enough for image manipulation. |
| `webContents.getURL()` | works | via `executeJavaScript('location.href')` |
| `webContents.getTitle()` | stub | returns empty string |
| `webContents.setWindowOpenHandler` | partial | in v0.1 all `target=_blank` and `window.open` requests unconditionally open in the OS default browser via `shell.openExternal`; the handler is stored but not consulted (matches what most apps configure it to do anyway) |
| `session` | missing | v0.5 |
| `protocol` | missing | v0.5 |
| `contextBridge.exposeInMainWorld` | works | via `webPreferences.preload`; runs in main world (no isolated world yet) |
| `contextBridge.exposeInIsolatedWorld` | partial | falls through to `exposeInMainWorld` (no isolated world in v0.1) |
| `webPreferences.preload` | works | file is read and injected as an initialization script after the volt shim |
| `require('electron')` in preload | works | returns `ipcRenderer`, `contextBridge`, `webFrame`; other members throw |
| `process` in preload | partial | `versions.{electron,chrome,node,v8,volt}`, `platform`, `arch`, `env`, `argv`, `nextTick`; other Node process members not exposed |

## Renderer process

Volt does not run Node in the renderer, but it does run your `webPreferences.preload` file with a shim `require('electron')` that exposes `ipcRenderer` and `contextBridge`. This means the standard Electron pattern works unmodified:

```js
// preload.js — unchanged from Electron
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  ping: () => ipcRenderer.invoke('ping'),
});
```

What breaks:
- `require('fs')`, `require('path')`, `require('node:*')` in preload: no Node runtime in the renderer. Do Node work in the main process and expose it through `ipcRenderer.invoke`.
- `process`, `Buffer`, `global` in preload: same reason.
- Isolated worlds (`contextIsolation: true`): the shim runs in the main world in v0.1. Secrets held in preload closures are still isolated by JS scope, but `window`-level values are shared. Fix scheduled for v0.2.

Renderers that avoid preload entirely can still call `window.volt.invoke(channel, ...args)` directly.

If your app depends on something not on this list, open an issue with the exact API and a snippet of how you use it.
