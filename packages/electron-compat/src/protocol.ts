export interface ProtocolRequest {
  url: string;
  method: string;
  referrer: string;
  headers: Record<string, string>;
  uploadData?: unknown;
}

type Handler = (request: ProtocolRequest, callback: (response: unknown) => void) => void;

class Protocol {
  private handlers = new Map<string, Handler>();

  registerFileProtocol(scheme: string, handler: Handler): void {
    this.handlers.set(scheme, handler);
  }
  registerBufferProtocol(scheme: string, handler: Handler): void {
    this.handlers.set(scheme, handler);
  }
  registerHttpProtocol(scheme: string, handler: Handler): void {
    this.handlers.set(scheme, handler);
  }
  registerStreamProtocol(scheme: string, handler: Handler): void {
    this.handlers.set(scheme, handler);
  }
  registerStringProtocol(scheme: string, handler: Handler): void {
    this.handlers.set(scheme, handler);
  }
  registerSchemesAsPrivileged(_schemes: unknown[]): void {}
  unregisterProtocol(scheme: string): void {
    this.handlers.delete(scheme);
  }
  isProtocolRegistered(scheme: string): boolean {
    return this.handlers.has(scheme);
  }
  isProtocolHandled(scheme: string): Promise<boolean> {
    return Promise.resolve(this.handlers.has(scheme));
  }
  handle(scheme: string, handler: Handler): void {
    this.handlers.set(scheme, handler);
  }
  unhandle(scheme: string): void {
    this.handlers.delete(scheme);
  }
}

export const protocol = new Protocol();
