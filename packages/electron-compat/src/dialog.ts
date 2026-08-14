import { host } from "./host.js";
import type { BrowserWindow } from "./browser-window.js";

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface MessageBoxOptions {
  message: string;
  title?: string;
  buttons?: string[];
  type?: "none" | "info" | "error" | "question" | "warning";
  defaultId?: number;
  cancelId?: number;
  detail?: string;
}

export interface MessageBoxReturnValue {
  response: number;
  checkboxChecked: boolean;
}

export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: FileFilter[];
  properties?: Array<
    | "openFile"
    | "openDirectory"
    | "multiSelections"
    | "showHiddenFiles"
    | "createDirectory"
    | "promptToCreate"
    | "noResolveAliases"
    | "treatPackageAsDirectory"
    | "dontAddToRecent"
  >;
}

export interface OpenDialogReturnValue {
  canceled: boolean;
  filePaths: string[];
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  buttonLabel?: string;
  filters?: FileFilter[];
}

export interface SaveDialogReturnValue {
  canceled: boolean;
  filePath?: string;
}

function unwrap<A, B>(a: A | B, b: B | undefined): B {
  return (b ?? (a as unknown as B)) as B;
}

export const dialog = {
  async showMessageBox(
    windowOrOptions: BrowserWindow | MessageBoxOptions,
    maybeOptions?: MessageBoxOptions,
  ): Promise<MessageBoxReturnValue> {
    const options = unwrap(windowOrOptions, maybeOptions);
    return (await host().request("dialog.showMessageBox", { options })) as MessageBoxReturnValue;
  },

  async showOpenDialog(
    windowOrOptions: BrowserWindow | OpenDialogOptions,
    maybeOptions?: OpenDialogOptions,
  ): Promise<OpenDialogReturnValue> {
    const options = unwrap(windowOrOptions, maybeOptions);
    return (await host().request("dialog.showOpenDialog", { options })) as OpenDialogReturnValue;
  },

  async showSaveDialog(
    windowOrOptions: BrowserWindow | SaveDialogOptions,
    maybeOptions?: SaveDialogOptions,
  ): Promise<SaveDialogReturnValue> {
    const options = unwrap(windowOrOptions, maybeOptions);
    return (await host().request("dialog.showSaveDialog", { options })) as SaveDialogReturnValue;
  },
};
