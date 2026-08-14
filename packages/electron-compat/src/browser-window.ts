import { EventEmitter } from "node:events";
import { host } from "./host.js";

export interface BrowserWindowOptions {
  title?: string;
  width?: number;
  height?: number;
  resizable?: boolean;
  webPreferences?: {
    preload?: string;
    contextIsolation?: boolean;
    nodeIntegration?: boolean;
  };
}

export class BrowserWindow extends EventEmitter {
  readonly id: number = 0;
  readonly webContents: WebContents;
  private idPromise: Promise<number>;

  constructor(options: BrowserWindowOptions = {}) {
    super();
    this.webContents = new WebContents(this);
    this.idPromise = host()
      .request<{ id: number }>("window.create", { options })
      .then((r) => {
        (this as any).id = r.id;
        host().on("window.closed", (closedId: number) => {
          if (closedId === r.id) this.emit("closed");
        });
        return r.id;
      });
  }

  async loadURL(url: string): Promise<void> {
    const id = await this.idPromise;
    await host().request("window.loadUrl", { window_id: id, url });
  }

  async loadFile(filePath: string): Promise<void> {
    const path = await import("node:path");
    const abs = path.resolve(filePath);
    await this.loadURL("file://" + abs);
  }

  async close(): Promise<void> {
    const id = await this.idPromise;
    await host().request("window.close", { window_id: id });
  }
}

export class WebContents extends EventEmitter {
  constructor(private win: BrowserWindow) {
    super();
  }
  openDevTools(): void {}
  send(_channel: string, ..._args: unknown[]): void {}
}
