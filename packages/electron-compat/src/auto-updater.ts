import { EventEmitter } from "node:events";

class AutoUpdater extends EventEmitter {
  setFeedURL(_options: string | { url: string }): void {}
  getFeedURL(): string { return ""; }

  checkForUpdates(): void {
    queueMicrotask(() => this.emit("checking-for-update"));
    queueMicrotask(() => this.emit("update-not-available"));
  }

  quitAndInstall(): void {}
}

export const autoUpdater = new AutoUpdater();
