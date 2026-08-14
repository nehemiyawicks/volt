import { EventEmitter } from "node:events";
import { host } from "./host.js";

class NativeTheme extends EventEmitter {
  private _shouldUseDarkColors = false;
  private polled = false;

  get shouldUseDarkColors(): boolean {
    if (!this.polled) {
      this.polled = true;
      void host().request<boolean>("nativeTheme.shouldUseDarkColors").then((v) => {
        const changed = v !== this._shouldUseDarkColors;
        this._shouldUseDarkColors = v;
        if (changed) this.emit("updated");
      });
    }
    return this._shouldUseDarkColors;
  }

  get shouldUseHighContrastColors(): boolean { return false; }
  get shouldUseInvertedColorScheme(): boolean { return false; }
  get themeSource(): "system" | "light" | "dark" { return "system"; }
  set themeSource(_v: "system" | "light" | "dark") {}
}

export const nativeTheme = new NativeTheme();
