import { host } from "./host.js";

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Display {
  id: string | null;
  label: string;
  scaleFactor: number;
  size: { width: number; height: number };
  bounds: Rectangle;
  workArea: Rectangle;
  workAreaSize: { width: number; height: number };
}

export const screen = {
  async getPrimaryDisplay(): Promise<Display> {
    return (await host().request("screen.getPrimaryDisplay")) as Display;
  },
  async getAllDisplays(): Promise<Display[]> {
    return (await host().request("screen.getAllDisplays")) as Display[];
  },
};
