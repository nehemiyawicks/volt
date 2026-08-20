import { createServer, createConnection, type Server, type Socket } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unlinkSync, existsSync } from "node:fs";
import { EventEmitter } from "node:events";

type SecondInstanceCallback = (event: object, argv: string[], workingDirectory: string, additionalData?: unknown) => void;

const emitter = new EventEmitter();
let server: Server | null = null;
let hasLock = true;

function socketPath(): string {
  const appName = (process.env.VOLT_APP_NAME ?? "volt-app").replace(/[^a-zA-Z0-9_-]/g, "_");
  const uid = process.getuid ? process.getuid() : 0;
  return join(tmpdir(), `volt-${appName}-${uid}.sock`);
}

export function tryAcquireLock(additionalData?: unknown): boolean {
  const path = socketPath();
  const payload = { argv: process.argv, cwd: process.cwd(), additionalData };

  try {
    server = createServer((socket: Socket) => {
      let buf = "";
      socket.setEncoding("utf8");
      socket.on("data", (chunk) => {
        buf += chunk;
      });
      socket.on("end", () => {
        try {
          const msg = JSON.parse(buf);
          emitter.emit("second-instance", { preventDefault() {}, defaultPrevented: false }, msg.argv, msg.cwd, msg.additionalData);
        } catch (err) {
          process.stderr.write(`[volt/single-instance] bad second-instance payload: ${err}\n`);
        }
      });
    });
    server.on("error", () => {});
    try { if (existsSync(path)) unlinkSync(path); } catch {}
    server.listen(path);
    hasLock = true;
    process.on("exit", () => { try { server?.close(); unlinkSync(path); } catch {} });
    return true;
  } catch {
    return sendToPrimary(payload);
  }
}

function sendToPrimary(payload: unknown): boolean {
  const path = socketPath();
  if (!existsSync(path)) {
    hasLock = true;
    return true;
  }
  try {
    const client = createConnection(path, () => {
      client.write(JSON.stringify(payload));
      client.end();
    });
    client.on("error", () => {
      hasLock = true;
    });
    hasLock = false;
    return false;
  } catch {
    hasLock = true;
    return true;
  }
}

export function releaseLock(): void {
  if (server) {
    try { server.close(); } catch {}
    try { unlinkSync(socketPath()); } catch {}
    server = null;
  }
  hasLock = false;
}

export function hasSingleInstanceLock(): boolean {
  return hasLock;
}

export function onSecondInstance(cb: SecondInstanceCallback): void {
  emitter.on("second-instance", cb);
}

export function offSecondInstance(cb: SecondInstanceCallback): void {
  emitter.off("second-instance", cb);
}
