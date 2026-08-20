import { test } from "node:test";
import assert from "node:assert/strict";

process.stdin.resume = () => process.stdin;

const { ipcMain } = await import("../dist/index.js");

test("ipcMain inherits EventEmitter (on/emit/removeListener)", () => {
  let called = 0;
  const cb = () => called++;
  ipcMain.on("evt", cb);
  ipcMain.emit("evt", {}, "arg");
  assert.equal(called, 1);
  ipcMain.removeListener("evt", cb);
  ipcMain.emit("evt", {}, "arg");
  assert.equal(called, 1);
});

test("ipcMain.handle stores handlers", () => {
  ipcMain.handle("channel", async () => "ok");
  ipcMain.removeHandler("channel");
});
