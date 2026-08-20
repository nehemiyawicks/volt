import { EventEmitter } from "node:events";

class SystemPreferences extends EventEmitter {
  isDarkMode(): boolean { return false; }
  getAccentColor(): string { return "0078d4ff"; }
  getColor(_name: string): string { return "#000000"; }
  getSystemColor(_color: string): string { return "#000000"; }
  getEffectiveAppearance(): "unknown" | "light" | "dark" { return "light"; }

  isSwipeTrackingFromScrollEventsEnabled(): boolean { return false; }
  postNotification(_event: string, _userInfo: unknown): void {}
  postLocalNotification(_event: string, _userInfo: unknown): void {}
  postWorkspaceNotification(_event: string, _userInfo: unknown): void {}
  subscribeNotification(_event: string, _cb: unknown): number { return 0; }
  unsubscribeNotification(_id: number): void {}
  registerDefaults(_defaults: Record<string, unknown>): void {}

  getUserDefault(_key: string, _type: string): unknown { return null; }
  setUserDefault(_key: string, _type: string, _value: unknown): void {}
  removeUserDefault(_key: string): void {}

  isTrustedAccessibilityClient(_prompt: boolean): boolean { return false; }
  getMediaAccessStatus(_mediaType: string): "not-determined" | "granted" | "denied" | "restricted" | "unknown" {
    return "not-determined";
  }
  askForMediaAccess(_mediaType: string): Promise<boolean> { return Promise.resolve(false); }

  canPromptTouchID(): boolean { return false; }
  promptTouchID(_reason: string): Promise<void> { return Promise.resolve(); }

  isAeroGlassEnabled(): boolean { return false; }
  isProcessTrusted(_shouldPrompt: boolean): boolean { return false; }
}

export const systemPreferences = new SystemPreferences();
