import { EventEmitter } from "node:events";
import { host } from "./host.js";

export interface WebPreferences {
  preload?: string;
  contextIsolation?: boolean;
  nodeIntegration?: boolean;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BrowserWindowOptions {
  title?: string;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  resizable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  alwaysOnTop?: boolean;
  frame?: boolean;
  transparent?: boolean;
  show?: boolean;
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
    await this.loadURL("file://" + path.resolve(filePath));
  }

  async close(): Promise<void> {
    await host().request("window.close", { window_id: await this.idPromise });
  }

  async show(): Promise<void> {
    await host().request("window.show", { window_id: await this.idPromise });
  }

  async hide(): Promise<void> {
    await host().request("window.hide", { window_id: await this.idPromise });
  }

  async focus(): Promise<void> {
    await host().request("window.focus", { window_id: await this.idPromise });
  }

  async minimize(): Promise<void> {
    await host().request("window.minimize", { window_id: await this.idPromise });
  }

  async maximize(): Promise<void> {
    await host().request("window.maximize", { window_id: await this.idPromise });
  }

  async unmaximize(): Promise<void> {
    await host().request("window.unmaximize", { window_id: await this.idPromise });
  }

  async restore(): Promise<void> {
    await host().request("window.unmaximize", { window_id: await this.idPromise });
  }

  async setTitle(title: string): Promise<void> {
    await host().request("window.setTitle", { window_id: await this.idPromise, title });
  }

  async setBounds(bounds: Partial<Rectangle>): Promise<void> {
    await host().request("window.setBounds", { window_id: await this.idPromise, bounds });
  }

  async getBounds(): Promise<Rectangle> {
    return (await host().request("window.getBounds", { window_id: await this.idPromise })) as Rectangle;
  }

  async setAlwaysOnTop(flag: boolean): Promise<void> {
    await host().request("window.setAlwaysOnTop", { window_id: await this.idPromise, flag });
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
    if (this.windowId !== null) post(this.windowId);
    else void this.win._windowIdPromise().then(post);
  }
}
