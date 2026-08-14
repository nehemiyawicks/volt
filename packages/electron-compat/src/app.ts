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
  }

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
