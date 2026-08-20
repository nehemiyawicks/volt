import { EventEmitter } from "node:events";
import { host } from "./host.js";
import { app } from "./app.js";

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

  private _isMaximized = false;
  private _isMinimized = false;
  private _isVisible = true;
  private _isFullScreen = false;

  constructor(options: BrowserWindowOptions = {}) {
    super();
    this.webContents = new WebContents(this);
    this.idPromise = host()
      .request<{ id: number }>("window.create", { options })
      .then((r) => {
        (this as any).id = r.id;
        (this.webContents as any)._setId(r.id);
        BrowserWindow.registry.set(r.id, this);
        (app as unknown as { emitWebContentsCreated: (wc: unknown) => void }).emitWebContentsCreated(this.webContents);
        (app as unknown as { emitBrowserWindowCreated: (w: unknown) => void }).emitBrowserWindowCreated(this);
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
        h.on("window.stateChanged", (msg: { id: number; state: string; value: boolean }) => {
          if (msg.id !== r.id) return;
          switch (msg.state) {
            case "maximized": this._isMaximized = msg.value; this.emit(msg.value ? "maximize" : "unmaximize"); break;
            case "minimized": this._isMinimized = msg.value; this.emit(msg.value ? "minimize" : "restore"); break;
            case "visible": this._isVisible = msg.value; this.emit(msg.value ? "show" : "hide"); break;
            case "fullscreen": this._isFullScreen = msg.value; this.emit(msg.value ? "enter-full-screen" : "leave-full-screen"); break;
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

  static fromWebContents(wc: WebContents): BrowserWindow | null {
    for (const w of BrowserWindow.registry.values()) {
      if (w.webContents === wc) return w;
    }
    return null;
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
    const fs = await import("node:fs/promises");
    const abs = path.resolve(filePath);
    const dir = path.dirname(abs);
    let html = await fs.readFile(abs, "utf8");
    const baseHref = `<base href="file://${dir}/">`;
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>${baseHref}`);
    } else if (/<html[^>]*>/i.test(html)) {
      html = html.replace(/<html([^>]*)>/i, `<html$1><head>${baseHref}</head>`);
    } else {
      html = `<!doctype html><html><head>${baseHref}</head><body>${html}</body></html>`;
    }
    await host().request("window.loadHtml", { window_id: await this.idPromise, html });
  }

  async loadHTML(html: string): Promise<void> {
    await host().request("window.loadHtml", { window_id: await this.idPromise, html });
  }

  async close(): Promise<void> {
    await host().request("window.close", { window_id: await this.idPromise });
  }

  async show(): Promise<void> {
    await host().request("window.show", { window_id: await this.idPromise });
    this._isVisible = true;
    this.emit("show");
  }

  async hide(): Promise<void> {
    await host().request("window.hide", { window_id: await this.idPromise });
    this._isVisible = false;
    this.emit("hide");
  }

  async focus(): Promise<void> {
    await host().request("window.focus", { window_id: await this.idPromise });
  }

  async minimize(): Promise<void> {
    await host().request("window.minimize", { window_id: await this.idPromise });
    this._isMinimized = true;
    this.emit("minimize");
  }

  async maximize(): Promise<void> {
    await host().request("window.maximize", { window_id: await this.idPromise });
    this._isMaximized = true;
    this.emit("maximize");
  }

  async unmaximize(): Promise<void> {
    await host().request("window.unmaximize", { window_id: await this.idPromise });
    this._isMaximized = false;
    this.emit("unmaximize");
  }

  async restore(): Promise<void> {
    await host().request("window.unmaximize", { window_id: await this.idPromise });
    this._isMinimized = false;
    this._isMaximized = false;
    this.emit("restore");
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

  async setSize(width: number, height: number, _animate?: boolean): Promise<void> {
    await this.setBounds({ width, height });
  }

  async setPosition(x: number, y: number, _animate?: boolean): Promise<void> {
    await this.setBounds({ x, y });
  }

  async getSize(): Promise<[number, number]> {
    const b = await this.getBounds();
    return [b.width, b.height];
  }

  async getPosition(): Promise<[number, number]> {
    const b = await this.getBounds();
    return [b.x, b.y];
  }

  async getContentBounds(): Promise<Rectangle> { return this.getBounds(); }
  async setContentBounds(b: Rectangle): Promise<void> { return this.setBounds(b); }
  async getContentSize(): Promise<[number, number]> { return this.getSize(); }
  async setContentSize(w: number, h: number): Promise<void> { return this.setSize(w, h); }

  setMinimumSize(_w: number, _h: number): void {}
  setMaximumSize(_w: number, _h: number): void {}
  getMinimumSize(): [number, number] { return [0, 0]; }
  getMaximumSize(): [number, number] { return [0, 0]; }

  setResizable(_r: boolean): void {}
  isResizable(): boolean { return true; }
  setMovable(_m: boolean): void {}
  isMovable(): boolean { return true; }
  setMinimizable(_m: boolean): void {}
  isMinimizable(): boolean { return true; }
  setMaximizable(_m: boolean): void {}
  isMaximizable(): boolean { return true; }
  setFullScreenable(_f: boolean): void {}
  isFullScreenable(): boolean { return true; }
  setClosable(_c: boolean): void {}
  isClosable(): boolean { return true; }

  isVisible(): boolean { return this._isVisible; }
  isMinimized(): boolean { return this._isMinimized; }
  isMaximized(): boolean { return this._isMaximized; }
  isFocused(): boolean { return BrowserWindow.focusedId === this.id; }
  isFullScreen(): boolean { return this._isFullScreen; }
  isSimpleFullScreen(): boolean { return this._isFullScreen; }
  async setFullScreen(flag: boolean): Promise<void> {
    try { await host().request("window.setFullScreen", { window_id: await this.idPromise, flag }); } catch {}
    this._isFullScreen = flag;
    this.emit(flag ? "enter-full-screen" : "leave-full-screen");
  }

  setBackgroundColor(_color: string): void {}
  setHasShadow(_s: boolean): void {}
  hasShadow(): boolean { return true; }
  setOpacity(_o: number): void {}
  getOpacity(): number { return 1; }
  setVisibleOnAllWorkspaces(_v: boolean): void {}
  isVisibleOnAllWorkspaces(): boolean { return false; }
  setIgnoreMouseEvents(_i: boolean): void {}
  setContentProtection(_e: boolean): void {}
  setFocusable(_f: boolean): void {}
  isFocusable(): boolean { return true; }

  setMenu(_menu: unknown): void {}
  removeMenu(): void {}
  setMenuBarVisibility(_v: boolean): void {}
  isMenuBarVisible(): boolean { return true; }
  setAutoHideMenuBar(_h: boolean): void {}
  isAutoHideMenuBar(): boolean { return false; }

  flashFrame(_flag: boolean): void {}
  setSkipTaskbar(_skip: boolean): void {}
  moveTop(): void {}
  moveAbove(_id: string): void {}
  center(): void {}

  setDocumentEdited(_e: boolean): void {}
  isDocumentEdited(): boolean { return false; }
  setRepresentedFilename(_p: string): void {}
  getRepresentedFilename(): string { return ""; }

  setTouchBar(_bar: unknown): void {}
  setBrowserView(_view: unknown): void {}
  getBrowserView(): null { return null; }
  addBrowserView(_view: unknown): void {}
  removeBrowserView(_view: unknown): void {}
  getBrowserViews(): unknown[] { return []; }

  _windowIdPromise(): Promise<number> {
    return this.idPromise;
  }
}

export class WebContents extends EventEmitter {
  private windowId: number | null = null;
  private static registry = new Map<number, WebContents>();

  constructor(private win: BrowserWindow) {
    super();
  }

  _setId(id: number) {
    this.windowId = id;
    WebContents.registry.set(id, this);
  }

  get id(): number { return this.windowId ?? 0; }

  static fromId(id: number): WebContents | null {
    return WebContents.registry.get(id) ?? null;
  }

  static getAllWebContents(): WebContents[] {
    return [...WebContents.registry.values()];
  }

  static getFocusedWebContents(): WebContents | null {
    const bw = BrowserWindow.getFocusedWindow();
    return bw ? bw.webContents : null;
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

  async getURL(): Promise<string> {
    const r = await this.executeJavaScript("location.href");
    return String(r ?? "");
  }

  getTitle(): string { return ""; }
  isLoading(): boolean { return false; }
  isLoadingMainFrame(): boolean { return false; }
  isWaitingForResponse(): boolean { return false; }
  isDestroyed(): boolean { return false; }
  isDevToolsOpened(): boolean { return false; }
  isDevToolsFocused(): boolean { return false; }
  stop(): void {}
  focus(): void {}
  blur(): void {}
  isFocused(): boolean { return false; }
  getType(): string { return "webview"; }
  getWebPreferences(): Record<string, unknown> { return {}; }
  getMainFrame(): unknown { return this; }

  setZoomFactor(_factor: number): void {}
  getZoomFactor(): number { return 1; }
  setZoomLevel(_level: number): void {}
  getZoomLevel(): number { return 0; }
  setVisualZoomLevelLimits(_min: number, _max: number): void {}
  setUserAgent(_ua: string): void {}
  getUserAgent(): string { return navigator?.userAgent ?? ""; }

  insertCSS(_css: string): Promise<string> { return Promise.resolve(""); }
  removeInsertedCSS(_key: string): Promise<void> { return Promise.resolve(); }
  insertText(_text: string): Promise<void> { return Promise.resolve(); }
  findInPage(_text: string, _opts?: unknown): number { return 0; }
  stopFindInPage(_action: string): void {}
  clearHistory(): void {}
  canGoBack(): boolean { return false; }
  canGoForward(): boolean { return false; }
  goBack(): void { void this.executeJavaScript("history.back()"); }
  goForward(): void { void this.executeJavaScript("history.forward()"); }
  loadURL(url: string, _opts?: unknown): Promise<void> { return this.win.loadURL(url); }
  downloadURL(_url: string): void {}
  print(_opts?: unknown, _cb?: unknown): void {}
  printToPDF(_opts?: unknown): Promise<Buffer> { return Promise.resolve(Buffer.alloc(0)); }

  session = {
    clearCache: async () => {},
    clearStorageData: async () => {},
    cookies: {
      get: async () => [],
      set: async () => {},
      remove: async () => {},
      flushStore: async () => {},
    },
    webRequest: {
      onBeforeRequest: () => {},
      onBeforeSendHeaders: () => {},
      onCompleted: () => {},
    },
    setUserAgent: () => {},
    getUserAgent: () => "",
  };

  async reload(): Promise<void> {
    await this.executeJavaScript("location.reload()");
  }

  setWindowOpenHandler(_handler: (details: { url: string }) => { action: "allow" | "deny" }): void {
    // v0.1: all target=_blank / window.open requests are routed to the OS
    // browser via a Rust-side default. The handler is stored but not
    // consulted until we can round-trip a decision back through wry.
  }
}
