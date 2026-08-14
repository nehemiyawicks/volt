# Volt

A lightweight, drop-in Electron alternative. Run your existing JavaScript or TypeScript Electron app on roughly a fifth of the RAM, in a tenth of the installer size, with an `npm install` and one alias.

> **Status:** Pre-alpha. v0.1 targets macOS. See [`GOALS.md`](GOALS.md) for milestones and [`PLAN.md`](PLAN.md) for the strategy.

## Why

Electron ships a full Chromium and Node.js runtime with every app. 150 to 350 MB of RAM per app just to sit idle. Tauri, Wails, and Electrobun solve the RAM problem but require rewriting your backend in Rust, Go, or a modified Bun entrypoint. Electron still wins because the switching cost keeps it entrenched.

Volt's bet: **the compat layer is the killer feature.** You keep your `main.ts`, your IPC handlers, your `BrowserWindow` code. You lose 150 MB.

| | Electron | Tauri | Electrobun | Volt |
|---|---|---|---|---|
| Idle RAM (single window) | 150 to 350 MB | 30 to 50 MB | ~35 MB | ~40 MB |
| Installer size | 100+ MB | <10 MB | ~12 MB | <15 MB |
| Backend language | JS / TS | Rust | Bun (partial rewrite) | JS / TS |
| Runs an unmodified Electron `main.ts` | yes (native) | no | no | **yes** |
| Uses `import { app, BrowserWindow } from 'electron'` unchanged | yes | no | no | **yes** |

## What ships today

`v0.1` is under active construction. This repo currently contains:

- A monorepo scaffold (Rust host + npm workspace)
- Strategy docs: [`PLAN.md`](PLAN.md), [`GOALS.md`](GOALS.md)
- `@volt/electron-compat` with typed `app`, `BrowserWindow`, `ipcMain`, `ipcRenderer`, `dialog`
- A Rust host binary (`volt-core`) that opens a native window via [`wry`](https://github.com/tauri-apps/wry) and [`tao`](https://github.com/tauri-apps/tao)
- A `volt` CLI (`init | dev | build`) with JS and TS templates
- A quick-start example

## Migration in three steps

Both JavaScript and TypeScript projects follow the same shape.

**1. Install**

```bash
npm install @volt/electron-compat @volt/cli
```

**2. Alias `electron`**

For JS, in `package.json`:

```json
{
  "imports": {
    "electron": "@volt/electron-compat"
  }
}
```

For TS, in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "electron": ["node_modules/@volt/electron-compat"]
    }
  }
}
```

**3. Run**

```bash
npx volt dev
```

Your existing `main.js` or `main.ts` runs unchanged: `app.whenReady()`, `new BrowserWindow(...)`, `ipcMain.handle(...)`.

## Repository layout

```
crates/volt-core/          Rust host binary (wry + tao)
packages/electron-compat/  Drop-in replacement for require('electron')
packages/volt-cli/         volt init | dev | build
examples/quick-start/      Minimal working app
docs/                      Migration guide, API compat matrix
PLAN.md                    Strategy and architecture
GOALS.md                   Milestones with done-when criteria
```

## Building from source

Requires Rust 1.75+, Node 20+, and either Bun 1.1+ (preferred) or Node 20+ at runtime.

```bash
cargo build --release -p volt-core
npm install
cd examples/quick-start && npx volt dev
```

## Contributing

Volt is early. The most valuable contributions right now:

- Migrating a real Electron app and filing an issue for every API that's missing or broken
- Implementing missing APIs against the [Electron docs](https://www.electronjs.org/docs/latest); copy the signature verbatim
- Extending the compat matrix in [`docs/compat.md`](docs/compat.md)
- Windows and Linux ports (v0.2)

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for ground rules.

## License

[Apache-2.0](LICENSE). See [`NOTICE`](NOTICE) for third-party attributions.
