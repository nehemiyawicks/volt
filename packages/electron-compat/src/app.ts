import { EventEmitter } from "node:events";
import { host } from "./host.js";

class App extends EventEmitter {
  constructor() {
    super();
    const h = host();
    h.on("app.allWindowsClosed", () => this.emit("window-all-closed"));
  }

  whenReady(): Promise<void> {
    return host().whenReady();
  }

  quit(): void {
    host().send("app.quit");
    process.exit(0);
  }

  getName(): string {
    return process.env.VOLT_APP_NAME ?? "Volt App";
  }

  getVersion(): string {
    return process.env.VOLT_APP_VERSION ?? "0.0.0";
  }

  getPath(name: "home" | "userData" | "temp" | "downloads"): string {
    const os = require("node:os");
    const path = require("node:path");
    switch (name) {
      case "home":
        return os.homedir();
      case "temp":
        return os.tmpdir();
      case "downloads":
        return path.join(os.homedir(), "Downloads");
      case "userData":
        return path.join(os.homedir(), "Library", "Application Support", this.getName());
    }
  }
}

export const app = new App();
