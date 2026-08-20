import { EventEmitter } from "node:events";

export interface BrowserViewOptions {
  webPreferences?: unknown;
}

export class BrowserView extends EventEmitter {
  readonly webContents = new EventEmitter() as unknown as {
    loadURL(url: string): Promise<void>;
    loadFile(path: string): Promise<void>;
    on(event: string, cb: (...args: unknown[]) => void): void;
    send(channel: string, ...args: unknown[]): void;
    executeJavaScript(code: string): Promise<unknown>;
    openDevTools(): void;
  };

  constructor(_options: BrowserViewOptions = {}) {
    super();
    (this.webContents as unknown as { loadURL: (u: string) => Promise<void> }).loadURL = async () => {};
    (this.webContents as unknown as { loadFile: (p: string) => Promise<void> }).loadFile = async () => {};
    (this.webContents as unknown as { send: (...a: unknown[]) => void }).send = () => {};
    (this.webContents as unknown as { executeJavaScript: (c: string) => Promise<unknown> }).executeJavaScript = async () => null;
    (this.webContents as unknown as { openDevTools: () => void }).openDevTools = () => {};
  }

  setBounds(_bounds: { x: number; y: number; width: number; height: number }): void {}
  getBounds() { return { x: 0, y: 0, width: 0, height: 0 }; }
  setAutoResize(_options: unknown): void {}
  setBackgroundColor(_color: string): void {}
}
