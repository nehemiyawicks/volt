import { host } from "./host.js";
import type { BrowserWindow } from "./browser-window.js";

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

export interface OpenDialogReturnValue {
  canceled: boolean;
  filePaths: string[];
}

export interface SaveDialogReturnValue {
  canceled: boolean;
  filePath?: string;
}

export const dialog = {
  async showMessageBox(
    _window: BrowserWindow | MessageBoxOptions,
    options?: MessageBoxOptions,
  ): Promise<MessageBoxReturnValue> {
    const opts = options ?? (_window as MessageBoxOptions);
    return (await host().request("dialog.showMessageBox", { options: opts })) as MessageBoxReturnValue;
  },

  async showOpenDialog(): Promise<OpenDialogReturnValue> {
    return { canceled: true, filePaths: [] };
  },

  async showSaveDialog(): Promise<SaveDialogReturnValue> {
    return { canceled: true };
  },
};
