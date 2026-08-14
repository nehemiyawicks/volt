import { EventEmitter } from "node:events";

type Handler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown | Promise<unknown>;

export interface IpcMainInvokeEvent {
  sender: { id: number };
}

class IpcMain extends EventEmitter {
  private handlers = new Map<string, Handler>();

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

  async _invoke(channel: string, sender: { id: number }, args: unknown[]): Promise<unknown> {
    const h = this.handlers.get(channel);
    if (!h) throw new Error(`No handler for '${channel}'`);
    return await h({ sender }, ...args);
  }
}

class IpcRenderer extends EventEmitter {
  send(_channel: string, ..._args: unknown[]): void {}
  invoke(_channel: string, ..._args: unknown[]): Promise<unknown> {
    return Promise.reject(new Error("ipcRenderer.invoke is renderer-only"));
  }
}

export const ipcMain = new IpcMain();
export const ipcRenderer = new IpcRenderer();
