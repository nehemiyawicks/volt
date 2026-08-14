# Hardest Apps

Volt's target is any Electron app. This page tracks real apps that get tested against every release. It exists to force the compat matrix to broaden; a break here always turns into a fix in `@volt/electron-compat` or `volt-core`, never an app-specific shim.

## The ladder

Difficulty roughly ascending. A break on rung N is a hard blocker until the underlying API lands.

| # | App | Why it's on the list | Status |
|---|---|---|---|
| 1 | `electron/electron-quick-start` | Baseline. Nothing exotic. | **boots** (commit 60751ca+; verified 2026-08-14) |
| 2 | `sindresorhus/electron-quick-start-typescript` | TS entry, same shape. | pending |
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
