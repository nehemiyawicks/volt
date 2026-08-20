import { EventEmitter } from "node:events";
import { request as httpsRequest } from "node:https";
import { request as httpRequest, type IncomingMessage, type ClientRequest } from "node:http";

export interface ClientRequestOptions {
  method?: string;
  url?: string;
  session?: unknown;
  useSessionCookies?: boolean;
  headers?: Record<string, string>;
  redirect?: "follow" | "manual" | "error";
}

class VoltClientRequest extends EventEmitter {
  private req?: ClientRequest;
  private body: Buffer[] = [];
  private options: URL & { method: string; headers: Record<string, string> };

  constructor(opts: string | ClientRequestOptions) {
    super();
    const options = typeof opts === "string" ? { url: opts } : opts;
    const url = new URL(options.url ?? "http://localhost/");
    this.options = Object.assign(url, {
      method: (options.method ?? "GET").toUpperCase(),
      headers: options.headers ?? {},
    });
  }

  setHeader(name: string, value: string): void {
    this.options.headers[name] = value;
  }
  getHeader(name: string): string | undefined {
    return this.options.headers[name];
  }
  removeHeader(name: string): void {
    delete this.options.headers[name];
  }

  write(chunk: string | Buffer): void {
    this.body.push(Buffer.from(chunk));
  }

  end(chunk?: string | Buffer): void {
    if (chunk) this.body.push(Buffer.from(chunk));
    const requestFn = this.options.protocol === "https:" ? httpsRequest : httpRequest;
    this.req = requestFn(
      {
        hostname: this.options.hostname,
        port: this.options.port || (this.options.protocol === "https:" ? 443 : 80),
        path: this.options.pathname + this.options.search,
        method: this.options.method,
        headers: this.options.headers,
      },
      (res: IncomingMessage) => {
        const wrappedResponse = Object.assign(new EventEmitter(), {
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          httpVersion: res.httpVersion,
        });
        res.on("data", (chunk) => wrappedResponse.emit("data", chunk));
        res.on("end", () => wrappedResponse.emit("end"));
        res.on("error", (err) => wrappedResponse.emit("error", err));
        this.emit("response", wrappedResponse);
      }
    );
    this.req.on("error", (err) => this.emit("error", err));
    for (const chunk of this.body) this.req.write(chunk);
    this.req.end();
  }

  abort(): void {
    this.req?.destroy();
  }
}

export const net = {
  request(opts: string | ClientRequestOptions): VoltClientRequest {
    return new VoltClientRequest(opts);
  },
  isOnline(): boolean { return true; },
  fetch: globalThis.fetch,
  online: true,
};
