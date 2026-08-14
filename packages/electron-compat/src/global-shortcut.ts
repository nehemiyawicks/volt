import { host } from "./host.js";

const handlers = new Map<string, () => void>();
let handlerInstalled = false;

function ensureHandler() {
  if (handlerInstalled) return;
  handlerInstalled = true;
  host().on("globalShortcut.click", (msg: { id: string }) => {
    handlers.get(msg.id)?.();
  });
}

export const globalShortcut = {
  async register(accelerator: string, cb: () => void): Promise<boolean> {
    ensureHandler();
    handlers.set(accelerator, cb);
    const r = (await host().request("globalShortcut.register", {
      id: accelerator,
      accelerator,
    })) as { ok: boolean; error?: string };
    if (!r.ok) {
      handlers.delete(accelerator);
      if (r.error) process.stderr.write(`[globalShortcut] ${r.error}\n`);
    }
    return r.ok;
  },

  isRegistered(accelerator: string): boolean {
    return handlers.has(accelerator);
  },

  async unregister(accelerator: string): Promise<void> {
    handlers.delete(accelerator);
    await host().request("globalShortcut.unregister", { id: accelerator });
  },

  async unregisterAll(): Promise<void> {
    handlers.clear();
    await host().request("globalShortcut.unregisterAll");
  },
};
