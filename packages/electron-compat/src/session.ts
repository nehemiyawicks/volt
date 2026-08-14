import { EventEmitter } from "node:events";

class Session extends EventEmitter {
  cookies = {
    async get(_filter: { url?: string; name?: string }): Promise<unknown[]> { return []; },
    async set(_details: unknown): Promise<void> {},
    async remove(_url: string, _name: string): Promise<void> {},
    async flushStore(): Promise<void> {},
  };

  webRequest = {
    onBeforeRequest(_filter: unknown, _listener: unknown): void {},
    onBeforeSendHeaders(_filter: unknown, _listener: unknown): void {},
    onHeadersReceived(_filter: unknown, _listener: unknown): void {},
    onCompleted(_filter: unknown, _listener: unknown): void {},
  };

  async clearCache(): Promise<void> {}
  async clearStorageData(_options?: unknown): Promise<void> {}
  async clearHostResolverCache(): Promise<void> {}
  async clearAuthCache(): Promise<void> {}
  async getCacheSize(): Promise<number> { return 0; }
  setPermissionRequestHandler(_handler: unknown): void {}
  setUserAgent(_ua: string): void {}
  getUserAgent(): string { return ""; }
  isPersistent(): boolean { return true; }
}

const defaultSession = new Session();

export const session = {
  get defaultSession(): Session {
    return defaultSession;
  },
  fromPartition(_partition: string): Session {
    return defaultSession;
  },
};
