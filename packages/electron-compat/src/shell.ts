import { host } from "./host.js";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { dirname } from "node:path";

export const shell = {
  async openExternal(url: string, _options?: unknown): Promise<void> {
    await host().request("shell.openExternal", { url });
  },
  async openPath(path: string): Promise<string> {
    try {
      const opener = process.platform === "darwin" ? "open"
        : process.platform === "win32" ? "start" : "xdg-open";
      spawn(opener, [path], { detached: true, stdio: "ignore" }).unref();
      return "";
    } catch (err) {
      return String(err);
    }
  },
  showItemInFolder(fullPath: string): void {
    if (process.platform === "darwin") {
      spawn("open", ["-R", fullPath], { detached: true, stdio: "ignore" }).unref();
    } else if (process.platform === "win32") {
      spawn("explorer.exe", ["/select,", fullPath], { detached: true, stdio: "ignore" }).unref();
    } else {
      const dir = dirname(fullPath);
      spawn("xdg-open", [dir], { detached: true, stdio: "ignore" }).unref();
    }
  },
  async trashItem(path: string): Promise<void> {
    if (process.platform === "darwin") {
      const posixPath = path.replace(/"/g, '\\"');
      const script = `tell app "Finder" to delete POSIX file "${posixPath}"`;
      await new Promise<void>((resolve) => {
        const p = spawn("osascript", ["-e", script], { stdio: "ignore" });
        p.on("exit", () => resolve());
      });
    } else {
      await fs.rm(path, { recursive: true, force: true });
    }
  },
  beep(): void {
    process.stderr.write("");
  },
  readShortcutLink(_shortcutPath: string): unknown { return {}; },
  writeShortcutLink(_shortcutPath: string, _options: unknown): boolean { return false; },
};
