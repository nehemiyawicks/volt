import { EventEmitter } from "node:events";
import { fork as nodeFork, type ChildProcess } from "node:child_process";

export interface UtilityProcessForkOptions {
  serviceName?: string;
  stdio?: unknown;
  env?: Record<string, string>;
  execArgv?: string[];
}

class VoltUtilityProcess extends EventEmitter {
  readonly pid: number;
  private child: ChildProcess;

  constructor(modulePath: string, args: string[] = [], options: UtilityProcessForkOptions = {}) {
    super();
    this.child = nodeFork(modulePath, args, {
      env: options.env ?? process.env,
      execArgv: options.execArgv,
      silent: false,
    });
    this.pid = this.child.pid ?? 0;
    this.child.on("exit", (code) => this.emit("exit", code));
    this.child.on("message", (msg) => this.emit("message", msg));
    this.child.on("spawn", () => this.emit("spawn"));
  }

  postMessage(msg: unknown): void { this.child.send(msg as never); }
  kill(): boolean { return this.child.kill(); }
}

export const utilityProcess = {
  fork(modulePath: string, args?: string[], options?: UtilityProcessForkOptions): VoltUtilityProcess {
    return new VoltUtilityProcess(modulePath, args, options);
  },
};
