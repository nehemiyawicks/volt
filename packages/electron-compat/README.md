# @volt/electron-compat

Drop-in replacement for the `electron` package. Import the same names, keep your code.

```ts
import { app, BrowserWindow, ipcMain, dialog } from "@volt/electron-compat";
```

## Aliasing

Both JS and TS projects can alias `electron` so existing imports work unchanged.

**TypeScript**, in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "electron": ["node_modules/@volt/electron-compat"]
    }
  }
}
```

**JavaScript**, in `package.json`:

```json
{
  "imports": {
    "electron": "@volt/electron-compat"
  }
}
```

## Compat status

See [`docs/compat.md`](../../docs/compat.md) at the repo root for the API-by-API matrix.
