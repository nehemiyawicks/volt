import { EventEmitter } from "node:events";
import { host } from "./host.js";

export interface WebPreferences {
  preload?: string;
  contextIsolation?: boolean;
  nodeIntegration?: boolean;
}

export interface BrowserWindowOptions {
  title?: string;
  width?: number;
  height?: number;
  resizable?: boolean;
  webPreferences?: WebPreferences;
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
        (this.webContents as any)._setId(r.id);
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

  _windowIdPromise(): Promise<number> {
    return this.idPromise;
  }
}

export class WebContents extends EventEmitter {
  private windowId: number | null = null;

  constructor(private win: BrowserWindow) {
    super();
  }

  _setId(id: number) {
    this.windowId = id;
  }

  openDevTools(): void {}

  send(channel: string, ...args: unknown[]): void {
    const post = (id: number) => host().send("webContents.send", { window_id: id, channel, args });
    if (this.windowId !== null) {
      post(this.windowId);
      return;
    }
    void this.win._windowIdPromise().then(post);
  }
}
