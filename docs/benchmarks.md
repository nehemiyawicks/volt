# Benchmarks

Ownership: whoever updates the compat matrix updates the numbers here.

## Method

- One process per app under `Activity Monitor` -> Memory -> Real Memory
- Fresh boot; nothing else running except Finder and the terminal
- Same page: `data:text/html,<h1>hello</h1>`
- Same window size: 900x640
- Wait 10 seconds after window appears before reading

The reproduction script lives at `docs/benchmarks/measure.sh` (add when M1 is finalized).

## Results (fill in per release)

| Framework | Version | Idle RAM (real memory) | Installer size |
|---|---|---|---|
| Electron | 32.x | | |
| Electrobun | latest | | |
| Volt | 0.1.0 | | |

## How to submit new numbers

Open a PR that updates the table plus:

- A screenshot of Activity Monitor for each row
- The exact page HTML used (must be identical across rows)
- The commit hash of Volt used

Any number without a screenshot in the same PR gets reverted. This project's whole pitch is "less RAM"; unsourced numbers are worse than none.
