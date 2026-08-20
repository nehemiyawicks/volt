import { EventEmitter } from "node:events";

export class MessagePortMain extends EventEmitter {
  private other?: MessagePortMain;
  private started = false;
  private queue: Array<{ data: unknown; ports?: MessagePortMain[] }> = [];

  _pair(other: MessagePortMain) { this.other = other; }

  postMessage(data: unknown, ports?: MessagePortMain[]): void {
    if (!this.other) return;
    if (this.other.started) {
      this.other.emit("message", { data, ports: ports ?? [] });
    } else {
      this.other.queue.push({ data, ports });
    }
  }

  start(): void {
    this.started = true;
    for (const { data, ports } of this.queue) this.emit("message", { data, ports: ports ?? [] });
    this.queue = [];
  }

  close(): void {
    this.started = false;
    this.other = undefined;
  }
}

export class MessageChannelMain {
  readonly port1 = new MessagePortMain();
  readonly port2 = new MessagePortMain();
  constructor() {
    (this.port1 as unknown as { _pair: (o: MessagePortMain) => void })._pair(this.port2);
    (this.port2 as unknown as { _pair: (o: MessagePortMain) => void })._pair(this.port1);
  }
}
