# quick-start

Requires Bun (the TS entry is `src/main.ts`). Install: `curl -fsSL https://bun.sh/install | bash`.

```bash
cd examples/quick-start
npx volt dev
```

What it demonstrates:

- `webPreferences.preload` running an unmodified Electron-style preload
- `contextBridge.exposeInMainWorld` from that preload
- `ipcMain.handle` + `window.electronAPI.*` round-trip (ping, pickFile, openGithub, notify)
- `dialog.showOpenDialog` (native picker)
- `shell.openExternal` (opens the volt repo in your browser)
- `Notification` (native macOS banner)
- `webContents.send` firing a 1 Hz tick that the renderer displays via `ipcRenderer.on`
