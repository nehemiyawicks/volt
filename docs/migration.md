# Migrating an Electron app to Volt

This guide takes about ten minutes for a small app. Larger apps are gated by which APIs you use (see [`compat.md`](compat.md)).

## Step 1: install

```bash
npm install @volt/electron-compat @volt/cli
```

## Step 2: alias `electron`

Both JS and TS work; pick one.

### JavaScript (via `package.json` imports)

```json
{
  "imports": {
    "electron": "@volt/electron-compat"
  }
}
```

### TypeScript (via `tsconfig.json` paths)

```json
{
  "compilerOptions": {
    "paths": {
      "electron": ["node_modules/@volt/electron-compat"]
    }
  }
}
```

## Step 3: add a manifest

Create `volt.manifest.json` next to `package.json`:

```json
{
  "name": "my-app",
  "entry": "src/main.ts",
  "runtime": "auto"
}
```

`entry` is your main-process entrypoint (same file Electron would run). `runtime` picks the JS runtime: `bun`, `node`, or `auto` (Bun preferred, falls back to Node).

## Step 4: run

```bash
npx volt dev
```

Your existing `main.js` or `main.ts` should open a window and hit `app.whenReady()`.

## What breaks

- Anything relying on `nodeIntegration: true` in the renderer. Volt renderers are always isolated. Use a preload script and `ipcRenderer.invoke` (v0.2 onward) instead.
- Native modules compiled against Electron's Node ABI. Bun and Node have different ABIs; recompile with `npm rebuild`.
- Anything in the "missing" column of the compat matrix.

## What to file

An issue for every missing API, every rendering difference you can reproduce, and every `webPreferences` option you actually depend on. See `CONTRIBUTING.md` for the template.
