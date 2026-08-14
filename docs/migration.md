# Migrating an Electron app to Volt

Around ten minutes for a small app. Larger apps are gated by which APIs you use; see [`compat.md`](compat.md).

## Step 1: install

```bash
npm install @volt/electron-compat @volt/cli
```

## Step 2: add a manifest

Create `volt.manifest.json` next to `package.json`:

```json
{
  "name": "my-app",
  "entry": "src/main.ts",
  "runtime": "auto"
}
```

`entry` is your main-process entrypoint (same file Electron ran). `runtime` picks the JS runtime: `bun`, `node`, or `auto` (Bun preferred, falls back to Node with `--experimental-strip-types` when the entry is `.ts`).

## Step 3: (TypeScript only) alias `electron` for the type checker

`volt dev` handles the runtime alias by symlinking `node_modules/electron` to `@volt/electron-compat`, so imports resolve when the app runs. For type checking, tell TypeScript the same thing in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "electron": ["node_modules/@volt/electron-compat"]
    }
  }
}
```

JavaScript projects can skip this.

## Step 4: run

```bash
npx volt dev
```

Your existing `main.js` or `main.ts` should open a window and hit `app.whenReady()`.

## What works from unmodified Electron code

- `app.whenReady`, `app.on('window-all-closed')`, `app.quit`
- `new BrowserWindow({...})` with the common options
- `win.loadURL`, `loadFile`, `close`, `show`, `hide`, `focus`, `minimize`, `maximize`, `setTitle`, `setBounds`
- `webContents.send`
- `ipcMain.handle`, `handleOnce`, `removeHandler`
- `dialog.showMessageBox`, `showOpenDialog`, `showSaveDialog`
- `shell.openExternal`
- `new Notification({...}).show()`
- `webPreferences.preload` scripts using `contextBridge.exposeInMainWorld` and `ipcRenderer.invoke` / `send` / `on`

## What breaks

- `require('fs')`, `require('path')`, `require('node:*')` in preload: no Node runtime in the renderer. Do the work in main and expose it via `ipcRenderer.invoke`.
- Native modules built against Electron's Node ABI: recompile with `npm rebuild` for Bun or Node.
- `nodeIntegration: true` in the renderer: Volt renderers are isolated. Migrate to a preload script.
- Any API in the missing column of the compat matrix.

## What to file

An issue for every missing API, every rendering difference you can reproduce, every `webPreferences` option you depend on, every native module that fails to load. Copy the exact call and a minimal repro. See `CONTRIBUTING.md`.
