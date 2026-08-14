import { EventEmitter } from "node:events";
import { host } from "./host.js";

export interface NotificationConstructorOptions {
  title: string;
  body?: string;
  subtitle?: string;
  silent?: boolean;
}

export class Notification extends EventEmitter {
  constructor(private options: NotificationConstructorOptions) {
    super();
  }

  static isSupported(): boolean {
    return true;
  }

  show(): Promise<void> {
    return host().request("notification.show", { options: this.options }) as Promise<void>;
  }

  close(): void {}
}
