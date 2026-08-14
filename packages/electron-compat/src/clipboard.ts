import { host } from "./host.js";

export const clipboard = {
  async readText(): Promise<string> {
    return (await host().request("clipboard.readText")) as string;
  },
  async writeText(text: string): Promise<void> {
    await host().request("clipboard.writeText", { text });
  },
};
