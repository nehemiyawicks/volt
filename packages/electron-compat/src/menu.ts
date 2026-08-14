import { host } from "./host.js";

export type MenuItemRole =
  | "quit" | "close" | "minimize" | "hide" | "hideOthers" | "unhide"
  | "about" | "services" | "cut" | "copy" | "paste" | "selectAll"
  | "undo" | "redo" | "togglefullscreen";

export type MenuItemType = "normal" | "separator" | "submenu" | "checkbox" | "radio";

export interface MenuItemConstructorOptions {
  id?: string;
  label?: string;
  type?: MenuItemType;
  role?: MenuItemRole | string;
  accelerator?: string;
  enabled?: boolean;
  submenu?: MenuItemConstructorOptions[] | Menu;
  click?: (menuItem: MenuItem) => void;
}

let nextId = 0;
const clickHandlers = new Map<string, (mi: MenuItem) => void>();
const idToItem = new Map<string, MenuItem>();
let handlerInstalled = false;

function ensureHandler() {
  if (handlerInstalled) return;
  handlerInstalled = true;
  host().on("menu.click", (msg: { id: string }) => {
    const cb = clickHandlers.get(msg.id);
    const mi = idToItem.get(msg.id);
    if (cb && mi) cb(mi);
  });
}

export class MenuItem {
  readonly id: string;
  label: string;
  type: MenuItemType;
  role?: string;
  accelerator?: string;
  enabled: boolean;
  submenu?: Menu;
  click?: (mi: MenuItem) => void;

  constructor(options: MenuItemConstructorOptions) {
    this.id = options.id ?? `mi_${++nextId}`;
    this.label = options.label ?? "";
    this.type = options.type ?? (options.submenu ? "submenu" : "normal");
    this.role = options.role as string | undefined;
    this.accelerator = options.accelerator;
    this.enabled = options.enabled ?? true;
    this.click = options.click;
    if (options.submenu) {
      this.submenu = options.submenu instanceof Menu
        ? options.submenu
        : Menu.buildFromTemplate(options.submenu);
    }
    if (this.click) {
      clickHandlers.set(this.id, this.click);
      idToItem.set(this.id, this);
    }
  }

  toWire(): unknown {
    return {
      id: this.id,
      label: this.label,
      type: this.type,
      role: this.role,
      accelerator: this.accelerator,
      enabled: this.enabled,
      submenu: this.submenu ? this.submenu.items.map((i) => i.toWire()) : [],
    };
  }
}

export class Menu {
  readonly items: MenuItem[] = [];

  append(item: MenuItem): void {
    this.items.push(item);
  }

  static buildFromTemplate(template: MenuItemConstructorOptions[]): Menu {
    const menu = new Menu();
    for (const opts of template) menu.append(new MenuItem(opts));
    return menu;
  }

  static async setApplicationMenu(menu: Menu | null): Promise<void> {
    ensureHandler();
    const template = menu ? menu.items.map((i) => i.toWire()) : [];
    await host().request("menu.setApplicationMenu", { template });
  }

  static getApplicationMenu(): Menu | null {
    return null;
  }
}
