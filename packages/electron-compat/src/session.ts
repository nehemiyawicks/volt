import { EventEmitter } from "node:events";

class Session extends EventEmitter {
  cookies = Object.assign(new EventEmitter(), {
    async get(_filter: { url?: string; name?: string }): Promise<unknown[]> { return []; },
    async set(_details: unknown): Promise<void> {},
    async remove(_url: string, _name: string): Promise<void> {},
    async flushStore(): Promise<void> {},
  });

  webRequest = {
    onBeforeRequest(_filter: unknown, _listener?: unknown): void {},
    onBeforeSendHeaders(_filter: unknown, _listener?: unknown): void {},
    onSendHeaders(_filter: unknown, _listener?: unknown): void {},
    onHeadersReceived(_filter: unknown, _listener?: unknown): void {},
    onResponseStarted(_filter: unknown, _listener?: unknown): void {},
    onBeforeRedirect(_filter: unknown, _listener?: unknown): void {},
    onCompleted(_filter: unknown, _listener?: unknown): void {},
    onErrorOccurred(_filter: unknown, _listener?: unknown): void {},
  };

  protocol = {
    registerFileProtocol(_scheme: string, _handler: unknown): void {},
    registerBufferProtocol(_scheme: string, _handler: unknown): void {},
    registerHttpProtocol(_scheme: string, _handler: unknown): void {},
    registerStreamProtocol(_scheme: string, _handler: unknown): void {},
    registerStringProtocol(_scheme: string, _handler: unknown): void {},
    registerSchemesAsPrivileged(_schemes: unknown[]): void {},
    unregisterProtocol(_scheme: string): void {},
    isProtocolRegistered(_scheme: string): boolean { return false; },
    isProtocolHandled(_scheme: string): Promise<boolean> { return Promise.resolve(false); },
    handle(_scheme: string, _handler: unknown): void {},
    unhandle(_scheme: string): void {},
  };

  serviceWorkers = {
    getAllRunning(): Record<number, unknown> { return {}; },
    startWorkerForScope(_scope: string): Promise<void> { return Promise.resolve(); },
  };

  extensions = {
    loadExtension(_extensionPath: string, _options?: unknown): Promise<unknown> { return Promise.resolve({}); },
    removeExtension(_extensionId: string): void {},
    getExtension(_extensionId: string): unknown { return null; },
    getAllExtensions(): unknown[] { return []; },
  };

  storagePath: string | null = null;

  async clearCache(): Promise<void> {}
  async clearStorageData(_options?: unknown): Promise<void> {}
  async clearHostResolverCache(): Promise<void> {}
  async clearAuthCache(): Promise<void> {}
  async clearData(_options?: unknown): Promise<void> {}
  async closeAllConnections(): Promise<void> {}
  async getCacheSize(): Promise<number> { return 0; }
  setPermissionRequestHandler(_handler: unknown): void {}
  setPermissionCheckHandler(_handler: unknown): void {}
  setDevicePermissionHandler(_handler: unknown): void {}
  setBluetoothPairingHandler(_handler: unknown): void {}
  setDisplayMediaRequestHandler(_handler: unknown): void {}
  setUserAgent(_ua: string, _acceptLanguages?: string): void {}
  getUserAgent(): string { return ""; }
  isPersistent(): boolean { return true; }
  setSpellCheckerEnabled(_enabled: boolean): void {}
  isSpellCheckerEnabled(): boolean { return false; }
  setSpellCheckerLanguages(_langs: string[]): void {}
  getSpellCheckerLanguages(): string[] { return []; }
  listWordsInSpellCheckerDictionary(): Promise<string[]> { return Promise.resolve([]); }
  addWordToSpellCheckerDictionary(_word: string): boolean { return true; }
  removeWordFromSpellCheckerDictionary(_word: string): boolean { return true; }
  setPreloads(_preloads: string[]): void {}
  getPreloads(): string[] { return []; }
  setProxy(_config: unknown): Promise<void> { return Promise.resolve(); }
  resolveProxy(_url: string): Promise<string> { return Promise.resolve("DIRECT"); }
  forceReloadProxyConfig(): Promise<void> { return Promise.resolve(); }
  createInterruptedDownload(_options: unknown): void {}
  downloadURL(_url: string): void {}
  enableNetworkEmulation(_options: unknown): void {}
  disableNetworkEmulation(): void {}
  setSSLConfig(_config: unknown): void {}
  setCertificateVerifyProc(_proc: unknown): void {}
  allowNTLMCredentialsForDomains(_domains: string): void {}
  getBlobData(_identifier: string): Promise<Buffer> { return Promise.resolve(Buffer.alloc(0)); }
  fetch(input: string | URL, init?: unknown): Promise<Response> {
    const url = typeof input === "string" ? input : input.toString();
    return globalThis.fetch(url, init as RequestInit | undefined);
  }
  getStoragePath(): string | null { return this.storagePath; }
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
