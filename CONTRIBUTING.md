# Contributing to Volt

Volt is early. The best contributions are things that push the compat layer forward with real, verifiable evidence.

## Ground rules

- Keep code lean. No tutorial comments; if the name doesn't say what the function does, rename it.
- Copy Electron's API signatures verbatim. Don't invent shapes.
- Every PR should include a repro or test. "Trust me" doesn't merge.
- One API per PR. Small, reviewable diffs.
- We ship JS and TS as equal citizens. If you add an example, add both.

## Good first PRs

1. Pick a "missing" or "stub" row from [`docs/compat.md`](docs/compat.md).
2. Read the Electron docs for that API. Copy the signature.
3. Add the JS side to `packages/electron-compat/src/`.
4. If it needs native work, add a new command to `crates/volt-core/src/protocol.rs` and handle it in `main.rs`.
5. Update the compat matrix row from **missing** or **stub** to **partial** or **works**.
6. Add a smoke test in `examples/quick-start`.

## Repo layout

See the root [`README.md`](README.md) and [`PLAN.md`](PLAN.md).

## Filing issues

Open an issue for:

- A specific Electron API that's missing or broken (include the exact call you make)
- A rendering difference between Electron and Volt (include a minimal repro)
- A `webPreferences` option your app depends on
- A native module that fails to load
