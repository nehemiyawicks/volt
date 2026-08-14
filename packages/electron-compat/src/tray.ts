import { EventEmitter } from "node:events";
import { host } from "./host.js";
import { Menu, type MenuItemConstructorOptions } from "./menu.js";

let nextId = 0;
const registry = new Map<string, Tray>();
let handlerInstalled = false;

function ensureHandler() {
  if (handlerInstalled) return;
  handlerInstalled = true;
  host().on("tray.click", (msg: { id: string }) => {
    registry.get(msg.id)?.emit("click");
  });
}

function menuToWire(menu: Menu | MenuItemConstructorOptions[]): unknown[] {
  const m = menu instanceof Menu ? menu : Menu.buildFromTemplate(menu);
  return m.items.map((i) => (i as unknown as { toWire: () => unknown }).toWire());
}

export class Tray extends EventEmitter {
  readonly id: string;
  private destroyed = false;

  constructor(iconPath?: string) {
    super();
    this.id = `tray_${++nextId}`;
    ensureHandler();
    registry.set(this.id, this);
    void host().request("tray.create", {
      id: this.id,
      icon_path: iconPath ?? null,
      tooltip: null,
      menu: [],
    });
  }

  async setToolTip(text: string): Promise<void> {
    if (this.destroyed) return;
    await host().request("tray.setToolTip", { id: this.id, tooltip: text });
  }

  async setContextMenu(menu: Menu | MenuItemConstructorOptions[]): Promise<void> {
    if (this.destroyed) return;
    await host().request("tray.setContextMenu", { id: this.id, menu: menuToWire(menu) });
  }

  async destroy(): Promise<void> {
    if (this.destroyed) return;
    this.destroyed = true;
    registry.delete(this.id);
    await host().request("tray.destroy", { id: this.id });
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }
}
