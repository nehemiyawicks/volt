import { EventEmitter } from "node:events";

type Reply = { resolve: (v: unknown) => void; reject: (e: unknown) => void };

class Host extends EventEmitter {
  private pending = new Map<string, Reply>();
  private seq = 0;
  private ready = false;
  private readyWaiters: Array<() => void> = [];

  constructor() {
    super();
    process.stdin.setEncoding("utf8");
    let buf = "";
    process.stdin.on("data", (chunk) => {
      buf += chunk;
      let idx: number;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 1);
        if (line) this.dispatch(line);
      }
    });
  }

  private dispatch(line: string) {
    let msg: any;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    switch (msg.event) {
      case "ready":
        this.ready = true;
        for (const cb of this.readyWaiters) cb();
        this.readyWaiters = [];
        this.emit("ready");
        return;
      case "reply": {
        const p = this.pending.get(msg.reply_id);
        if (!p) return;
        this.pending.delete(msg.reply_id);
        p.resolve(msg.value);
        return;
      }
      case "window.closed":
        this.emit("window.closed", msg.id);
        return;
      case "window.focus":
        this.emit("window.focus", msg.id);
        return;
      case "window.blur":
        this.emit("window.blur", msg.id);
        return;
      case "app.allWindowsClosed":
        this.emit("app.allWindowsClosed");
        return;
      case "ipc.invoke":
        this.emit("ipc.invoke", msg);
        return;
      case "app.activate":
        this.emit("app.activate", msg.has_visible_windows);
        return;
      case "webContents.didStartLoading":
        this.emit("webContents.didStartLoading", msg.window_id);
        return;
      case "webContents.didFinishLoad":
        this.emit("webContents.didFinishLoad", msg.window_id);
        return;
      case "menu.click":
        this.emit("menu.click", msg);
        return;
      case "globalShortcut.click":
        this.emit("globalShortcut.click", msg);
        return;
      case "tray.click":
        this.emit("tray.click", msg);
        return;
    }
  }

  whenReady(): Promise<void> {
    if (this.ready) return Promise.resolve();
    return new Promise((r) => this.readyWaiters.push(r));
  }

  send(cmd: string, payload: Record<string, unknown> = {}): void {
    process.stdout.write(JSON.stringify({ cmd, ...payload }) + "\n");
  }

  request<T = unknown>(cmd: string, payload: Record<string, unknown> = {}): Promise<T> {
    const reply_id = `r${++this.seq}`;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(reply_id, { resolve: resolve as (v: unknown) => void, reject });
      this.send(cmd, { ...payload, reply_id });
    });
  }
}

let instance: Host | null = null;
export function host(): Host {
  if (!instance) instance = new Host();
  return instance;
}
