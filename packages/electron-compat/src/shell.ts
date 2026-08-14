import { host } from "./host.js";

export const shell = {
  async openExternal(url: string): Promise<void> {
    await host().request("shell.openExternal", { url });
  },
};
