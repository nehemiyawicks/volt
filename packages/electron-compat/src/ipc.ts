import { EventEmitter } from "node:events";
import { host } from "./host.js";

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown | Promise<unknown>;

export interface IpcMainInvokeEvent {
  sender: { id: number };
}

class IpcMain extends EventEmitter {
  private handlers = new Map<string, Handler>();

  constructor() {
    super();
    host().on("ipc.invoke", (msg: { window_id: number; invoke_id: string; channel: string; args: unknown[] }) => {
      void this.route(msg);
    });
  }

  private async route(msg: { window_id: number; invoke_id: string; channel: string; args: unknown[] }) {
    const h = this.handlers.get(msg.channel);
    if (!msg.invoke_id) {
      const event = { sender: { id: msg.window_id, send: (_ch: string, ..._a: unknown[]) => {} }, senderId: msg.window_id };
      this.emit(msg.channel, event, ...msg.args);
      if (h) {
        try {
          await h(event as unknown as IpcMainInvokeEvent, ...msg.args);
        } catch (err) {
          process.stderr.write(`[ipcMain] handler for '${msg.channel}' threw: ${err}\n`);
        }
      }
      return;
    }
    if (!h) {
      host().send("ipc.result", {
        window_id: msg.window_id,
        invoke_id: msg.invoke_id,
        value: null,
        error: `No handler for '${msg.channel}'`,
      });
      return;
    }
    try {
      const value = await h({ sender: { id: msg.window_id } }, ...msg.args);
      host().send("ipc.result", {
        window_id: msg.window_id,
        invoke_id: msg.invoke_id,
        value: value ?? null,
        error: null,
      });
    } catch (err) {
      host().send("ipc.result", {
        window_id: msg.window_id,
        invoke_id: msg.invoke_id,
        value: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  handle(channel: string, listener: Handler): void {
    this.handlers.set(channel, listener);
  }

  handleOnce(channel: string, listener: Handler): void {
    const wrapped: Handler = (ev, ...args) => {
      this.handlers.delete(channel);
      return listener(ev, ...args);
    };
    this.handlers.set(channel, wrapped);
  }

  removeHandler(channel: string): void {
    this.handlers.delete(channel);
  }
}

class IpcRenderer extends EventEmitter {
  send(_channel: string, ..._args: unknown[]): void {}
  invoke(_channel: string, ..._args: unknown[]): Promise<unknown> {
    return Promise.reject(new Error("ipcRenderer is renderer-only; use window.volt.invoke in the renderer"));
  }
}

export const ipcMain = new IpcMain();
export const ipcRenderer = new IpcRenderer();
