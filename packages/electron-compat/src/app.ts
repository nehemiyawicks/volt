import { EventEmitter } from "node:events";
import { host } from "./host.js";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { execPath, argv } from "node:process";

export type PathName =
  | "home" | "appData" | "userData" | "sessionData" | "temp" | "exe"
  | "module" | "desktop" | "documents" | "downloads" | "music"
  | "pictures" | "videos" | "recent" | "logs" | "crashDumps";

class App extends EventEmitter {
  constructor() {
    super();
    const h = host();
    h.on("app.allWindowsClosed", () => this.emit("window-all-closed"));
    h.on("ready", () => this.emit("ready"));
    h.on("app.activate", (has_visible_windows: boolean) => {
      this.emit("activate", { hasVisibleWindows: has_visible_windows }, has_visible_windows);
    });
  }

  emitWebContentsCreated(wc: unknown): void {
    this.emit("web-contents-created", { preventDefault() {}, defaultPrevented: false }, wc);
  }
  emitBrowserWindowCreated(win: unknown): void {
    this.emit("browser-window-created", { preventDefault() {}, defaultPrevented: false }, win);
  }
  emitCertificateError(...args: unknown[]): void { this.emit("certificate-error", ...args); }

  whenReady(): Promise<void> {
    return host().whenReady();
  }

  quit(): void {
    this.emit("before-quit");
    this.emit("will-quit");
    host().send("app.quit");
    process.exit(0);
  }

  exit(code = 0): void {
    this.emit("before-quit");
    this.emit("will-quit");
    host().send("app.quit");
    process.exit(code);
  }

  relaunch(options: { args?: string[]; execPath?: string } = {}): void {
    const { spawn } = require("node:child_process");
    const execPath = options.execPath ?? process.execPath;
    const args = options.args ?? process.argv.slice(1);
    spawn(execPath, args, {
      detached: true,
      stdio: "ignore",
      env: process.env,
    }).unref();
  }

  isReady(): boolean {
    return true;
  }

  isPackaged = process.env.VOLT_HOST === "1" && !!process.env.VOLT_MANIFEST_BUNDLED;

  setBadgeCount(_count: number): boolean { return false; }
  getBadgeCount(): number { return 0; }
  setAppUserModelId(_id: string): void {}
  setAsDefaultProtocolClient(_protocol: string): boolean { return false; }
  removeAsDefaultProtocolClient(_protocol: string): boolean { return false; }
  isDefaultProtocolClient(_protocol: string): boolean { return false; }
  requestSingleInstanceLock(_data?: unknown): boolean { return true; }
  hasSingleInstanceLock(): boolean { return true; }
  releaseSingleInstanceLock(): void {}

  commandLine = {
    appendSwitch(_switch: string, _value?: string): void {},
    appendArgument(_argument: string): void {},
    hasSwitch(_switch: string): boolean { return false; },
    getSwitchValue(_switch: string): string { return ""; },
    removeSwitch(_switch: string): void {},
  };

  disableHardwareAcceleration(): void {}
  disableDomainBlockingFor3DAPIs(): void {}
  getGPUFeatureStatus(): Record<string, string> { return {}; }
  getGPUInfo(_infoType: "basic" | "complete"): Promise<unknown> { return Promise.resolve({}); }
  focus(_opts?: { steal?: boolean }): void {}
  hide(): void {}
  show(): void {}
  dock = {
    setBadge(_text: string): void {},
    getBadge(): string { return ""; },
    hide(): void {},
    show(): Promise<void> { return Promise.resolve(); },
    isVisible(): boolean { return true; },
    setMenu(_menu: unknown): void {},
    setIcon(_image: unknown): void {},
    bounce(_type?: "critical" | "informational"): number { return 0; },
    cancelBounce(_id: number): void {},
    downloadFinished(_filePath: string): void {},
  };
  addRecentDocument(_path: string): void {}
  clearRecentDocuments(): void {}
  setAccessibilitySupportEnabled(_enabled: boolean): void {}
  isAccessibilitySupportEnabled(): boolean { return false; }
  showAboutPanel(): void {}
  setAboutPanelOptions(_options: unknown): void {}
  configureHostResolver(_options: unknown): void {}
  setSecureKeyboardEntryEnabled(_enabled: boolean): void {}
  isSecureKeyboardEntryEnabled(): boolean { return false; }
  moveToApplicationsFolder(): boolean { return true; }
  isInApplicationsFolder(): boolean { return false; }

  getName(): string {
    return process.env.VOLT_APP_NAME ?? "Volt App";
  }

  setName(name: string): void {
    process.env.VOLT_APP_NAME = name;
  }

  getVersion(): string {
    return process.env.VOLT_APP_VERSION ?? "0.0.0";
  }

  getLocale(): string {
    return process.env.LANG?.split(".")[0]?.replace("_", "-") ?? "en-US";
  }

  getAppPath(): string {
    return process.cwd();
  }

  getPath(name: PathName): string {
    const home = homedir();
    const appName = this.getName();
    switch (name) {
      case "home": return home;
      case "temp": return tmpdir();
      case "exe": return execPath;
      case "module": return argv[1] ?? execPath;
      case "desktop": return join(home, "Desktop");
      case "documents": return join(home, "Documents");
      case "downloads": return join(home, "Downloads");
      case "music": return join(home, "Music");
      case "pictures": return join(home, "Pictures");
      case "videos": return join(home, "Movies");
      case "recent": return join(home, "Library", "Recent Documents");
      case "appData": return this.macAppData();
      case "userData": return join(this.macAppData(), appName);
      case "sessionData": return join(this.macAppData(), appName);
      case "logs": return join(home, "Library", "Logs", appName);
      case "crashDumps": return join(home, "Library", "Application Support", "CrashReporter", appName);
    }
  }

  private macAppData(): string {
    return join(homedir(), "Library", "Application Support");
  }
}

export const app = new App();
