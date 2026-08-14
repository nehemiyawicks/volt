# Electron API compatibility matrix

This page is the project's KPI. Coverage here is what makes a migration succeed or fail. Update the row on every PR that touches an API. Do not overstate: a missing button in a dialog is `partial`, not `works`.

Status legend: **works**, **partial**, **stub** (present but no-op), **missing**.

## Main process

| API | Status | Notes |
|---|---|---|
| `app.whenReady()` | works | |
| `app.on('window-all-closed')` | works | |
| `app.on('activate')` | missing | v0.2 |
| `app.quit()` | works | |
| `app.getName()` | works | reads `VOLT_APP_NAME` env or falls back |
| `app.getVersion()` | works | reads `VOLT_APP_VERSION` env or falls back |
| `app.getPath()` | partial | `home`, `temp`, `downloads`, `userData` only |
| `BrowserWindow` constructor | partial | `title`, `width`, `height`, `resizable` |
| `BrowserWindow.loadURL()` | works | |
| `BrowserWindow.loadFile()` | works | resolves to `file://` URL |
| `BrowserWindow.close()` | works | |
| `webContents.openDevTools()` | stub | v0.2 |
| `webContents.send()` | stub | v0.2 (needs main-to-renderer channel) |
| `ipcMain.handle()` | works | invocations from renderer via `window.volt.invoke` |
| `ipcMain.handleOnce()` | works | |
| `ipcMain.removeHandler()` | works | |
| `dialog.showMessageBox()` | partial | native picker; buttons not respected yet |
| `dialog.showOpenDialog()` | works | files, folders, multi-select, filters |
| `dialog.showSaveDialog()` | works | filters, default path |
| `Menu` | missing | v0.2 |
| `Tray` | missing | v0.2 |
| `Notification` | missing | v0.2 |
| `shell.openExternal()` | missing | v0.2 |
| `session` | missing | v0.5 |
| `protocol` | missing | v0.5 |
| `contextBridge` | missing | needs preload runtime; v0.2 |

## Renderer process

Volt does not run Node in the renderer. Renderers get `window.volt.invoke(channel, ...args)` for IPC. Existing renderer code that imports `ipcRenderer` from `electron` will not work until v0.2 lands preload-script support with a `contextBridge` shim.

Migration path for a renderer today:

```diff
- const { ipcRenderer } = require('electron');
- const result = await ipcRenderer.invoke('ping');
+ const result = await window.volt.invoke('ping');
```

If your app depends on something not on this list, open an issue with the exact API and a snippet of how you use it.
