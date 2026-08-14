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
  private static registry = new Map<number, BrowserWindow>();
  private static focusedId: number | null = null;

  constructor(options: BrowserWindowOptions = {}) {
    super();
    this.webContents = new WebContents(this);
    this.idPromise = host()
      .request<{ id: number }>("window.create", { options })
      .then((r) => {
        (this as any).id = r.id;
        (this.webContents as any)._setId(r.id);
        BrowserWindow.registry.set(r.id, this);
        const h = host();
        h.on("window.closed", (closedId: number) => {
          if (closedId === r.id) {
            BrowserWindow.registry.delete(r.id);
            if (BrowserWindow.focusedId === r.id) BrowserWindow.focusedId = null;
            this.emit("closed");
          }
        });
        h.on("window.focus", (id: number) => {
          if (id === r.id) { BrowserWindow.focusedId = r.id; this.emit("focus"); }
        });
        h.on("window.blur", (id: number) => {
          if (id === r.id) {
            if (BrowserWindow.focusedId === r.id) BrowserWindow.focusedId = null;
            this.emit("blur");
          }
        });
        h.on("webContents.didStartLoading", (id: number) => {
          if (id === r.id) this.webContents.emit("did-start-loading");
        });
        h.on("webContents.didFinishLoad", (id: number) => {
          if (id === r.id) {
            this.webContents.emit("did-finish-load");
            if (!this.readyShown) {
              this.readyShown = true;
              this.emit("ready-to-show");
            }
          }
        });
        return r.id;
      });
  }

  private readyShown = false;

  static getAllWindows(): BrowserWindow[] {
    return [...BrowserWindow.registry.values()];
  }

  static fromId(id: number): BrowserWindow | null {
    return BrowserWindow.registry.get(id) ?? null;
  }

  static getFocusedWindow(): BrowserWindow | null {
    return BrowserWindow.focusedId !== null
      ? BrowserWindow.registry.get(BrowserWindow.focusedId) ?? null
      : null;
  }

  async loadURL(url: string): Promise<void> {
    const id = await this.idPromise;
    const dataHtml = "data:text/html,";
    if (url.startsWith(dataHtml)) {
      const html = decodeURIComponent(url.slice(dataHtml.length));
      await host().request("window.loadHtml", { window_id: id, html });
      return;
    }
    await host().request("window.loadUrl", { window_id: id, url });
  }

  async loadFile(filePath: string): Promise<void> {
    const path = await import("node:path");
    await host().request("window.loadUrl", {
      window_id: await this.idPromise,
      url: "file://" + path.resolve(filePath),
    });
  }

  async loadHTML(html: string): Promise<void> {
    await host().request("window.loadHtml", { window_id: await this.idPromise, html });
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

  openDevTools(): void {
    void this.win._windowIdPromise().then((id) => host().request("webContents.openDevTools", { window_id: id }));
  }

  closeDevTools(): void {
    void this.win._windowIdPromise().then((id) => host().request("webContents.closeDevTools", { window_id: id }));
  }

  toggleDevTools(): void {
    void this.win._windowIdPromise().then((id) => host().request("webContents.toggleDevTools", { window_id: id }));
  }

  send(channel: string, ...args: unknown[]): void {
    const post = (id: number) => host().send("webContents.send", { window_id: id, channel, args });
    if (this.windowId !== null) post(this.windowId);
    else void this.win._windowIdPromise().then(post);
  }

  async executeJavaScript(code: string): Promise<unknown> {
    const id = await this.win._windowIdPromise();
    const r = await host().request<{ value: unknown }>("webContents.executeJavaScript", {
      window_id: id,
      code,
    });
    return r.value;
  }

  async reload(): Promise<void> {
    await this.executeJavaScript("location.reload()");
  }
}
