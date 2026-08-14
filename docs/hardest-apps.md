# Hardest Apps

Volt's target is any Electron app. This page tracks real apps that get tested against every release. It exists to force the compat matrix to broaden; a break here always turns into a fix in `@volt/electron-compat` or `volt-core`, never an app-specific shim.

## The ladder

Difficulty roughly ascending. A break on rung N is a hard blocker until the underlying API lands.

| # | App | Why it's on the list | Status |
|---|---|---|---|
| 1 | `electron/electron-quick-start` | Baseline. Nothing exotic. | **boots** (commit 60751ca+; verified 2026-08-14) |
| 2 | `electron/electron-quick-start-typescript` | TS entry, same shape. | **boots** (commit 65f6abb+; verified 2026-08-14) |
| 3 | `hyper` (Vercel terminal) | Custom title bar + PTY. First native-module hurdle. | pending |
| 4 | `simplenote-electron` | Real IPC surface, persistence, spellcheck. | pending |
| 5 | `standardnotes-app` | Encryption, protocol handlers, packaged React app. | pending |
| 6 | `logseq` | Local file access, plugin sandbox. | pending |
| 7 | `microsoft/vscode` | Multi-process, native modules (node-pty, keytar), custom protocols, frameless custom title bar, spellcheck, deep IPC surface, Menu, Touch Bar. The hardest thing in the wild. | pending |

Any Electron app not on this list is fair game to add. Priority is variety of APIs stressed, not popularity.

## Rung 1 report

`electron/electron-quick-start` boots against volt via the documented two-step shim (`volt.manifest.json` + `npm install @volt/electron-compat @volt/cli`). Uncovered on first run:

- `node_modules/electron` from the real Electron devDep is a directory, not a symlink; the CLI's alias step used `unlinkSync` which fails on directories. Fix: `rmSync(..., { recursive: true })` before writing the symlink.
- CLI's `findCore` only walked up from `cwd`; when the app lives outside the volt monorepo, that never finds `target/`. Fix: also walk up from the CLI script's own location and honour `VOLT_CORE_BIN`.
- The default preload didn't expose `process.versions`, which broke EQS's preload that reads chrome/node/electron versions. Fix: added a `process` shim to `preload.js` with `versions`, `platform`, `arch`, `env`, `argv`, `nextTick`.

All three fixes are in the compat layer, none app-specific.

## Rung 2 report

`electron-quick-start-typescript` follows the same recipe (build to `dist/`, point manifest at `dist/main.js`) and boots. Uncovered one more bug:

- EQS-TS calls `mainWindow.webContents.openDevTools()` unconditionally. In electron-compat this was fire-and-forget (`host().send`), but the Rust protocol declared `webContents.openDevTools` with a required `reply_id`. The command decoded as malformed and Rust logged `bad message: missing field 'reply_id'`; the app kept running because the failure was silent. Fix: JS uses `host().request` for these too, matching the ack contract.

Fix is in the compat layer, not app-specific.

## Rung 1 bundled with `volt build`

`electron-quick-start` builds cleanly with `npx volt dev build` in the app dir:

- Produces `dist/eqs.app` (~26 MB debug, will shrink with `cargo build --release`)
- Bundle layout: `Contents/{Info.plist,MacOS/eqs,Resources/{main.js,preload.js,index.html,styles.css,renderer.js,volt.manifest.json,node_modules/*}}`
- `open dist/eqs.app` launches it standalone; the bundled `volt-core` binary auto-detects it's inside `*.app/Contents/MacOS/` and loads `Resources/volt.manifest.json`
- Distributable: zip the `.app`, hand it to someone else, they double-click and it runs (no volt install required on their machine)

Uncovered during the bundle test:

- `copyDir` used `statSync` which follows symlinks and threw on broken ones (npm creates a broken `node_modules/.bin/electron` symlink when the real `electron` postinstall is skipped). Switched to `lstatSync`; broken symlinks are now skipped, valid symlinks are dereferenced.
- The sibling-copy logic only kicked in when the entry lived in a subdirectory. When `main.js` was at the project root, sibling files like `index.html` and `preload.js` were silently dropped. Replaced with a top-level walk that copies everything except `node_modules`, `dist`, `build`, `out`, `target`, `.git`, and dotfiles.

## How an entry gets added

- Fork the app
- Apply the two-step volt shim from [`migration.md`](migration.md)
- Try to boot with `npx volt dev`
- Whatever breaks, file it as an issue against volt with a link to the failing line
- Update this table with `pass`, `boots-with-quirks`, or `fails` + link to the issue
- Once fixed in volt, re-run and update

Every rung passing is real coverage evidence. Numbers without a run don't count.

## Reporting a run

Include in the linked issue or PR:

- Volt commit hash used
- App commit / release version used
- Bun or Node version
- The exact error / screenshot
- The Electron API the app was calling when it broke

"It worked for me" without those details does not close issues.
