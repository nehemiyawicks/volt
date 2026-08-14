# Electron API compatibility matrix

Status legend: **works**, **partial**, **stub** (present but no-op), **missing**.

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
| `webContents.send()` | stub | v0.2 (IPC preload bridge) |
| `ipcMain.handle()` | works | |
| `ipcMain.handleOnce()` | works | |
| `ipcMain.removeHandler()` | works | |
| `ipcRenderer.invoke()` | missing | needs preload bridge (v0.2) |
| `ipcRenderer.send()` | missing | needs preload bridge (v0.2) |
| `dialog.showMessageBox()` | partial | macOS AppleScript backend; buttons return 0 |
| `dialog.showOpenDialog()` | stub | v0.2 |
| `dialog.showSaveDialog()` | stub | v0.2 |
| `Menu` | missing | v0.2 |
| `Tray` | missing | v0.2 |
| `Notification` | missing | v0.2 |
| `shell.openExternal()` | missing | v0.2 |
| `session` | missing | v0.5 |
| `protocol` | missing | v0.5 |

If your app depends on something not on this list, open an issue with the exact API and how you use it.
