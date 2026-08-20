export const crashReporter = {
  start(_options: { submitURL?: string; productName?: string; uploadToServer?: boolean }): void {},
  getLastCrashReport(): unknown { return null; },
  getUploadedReports(): unknown[] { return []; },
  getUploadToServer(): boolean { return false; },
  setUploadToServer(_upload: boolean): void {},
  addExtraParameter(_key: string, _value: string): void {},
  removeExtraParameter(_key: string): void {},
  getParameters(): Record<string, string> { return {}; },
};
