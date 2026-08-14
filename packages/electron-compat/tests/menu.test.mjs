import { test } from "node:test";
import assert from "node:assert/strict";

process.stdin.resume = () => process.stdin;

const { Menu } = await import("../dist/index.js");

test("Menu.buildFromTemplate builds a simple template", () => {
  const menu = Menu.buildFromTemplate([
    { label: "File", submenu: [{ role: "quit" }] },
  ]);
  assert.equal(menu.items.length, 1);
  assert.equal(menu.items[0].label, "File");
  assert.ok(menu.items[0].submenu);
  assert.equal(menu.items[0].submenu.items[0].role, "quit");
});

test("Menu.buildFromTemplate throws on accelerator collision with a role", () => {
  assert.throws(
    () =>
      Menu.buildFromTemplate([
        { role: "quit" },
        { label: "Fake quit", accelerator: "CmdOrCtrl+Q", click: () => {} },
      ]),
    /Menu accelerator collision.*'CmdOrCtrl\+Q'/,
  );
});

test("Menu.buildFromTemplate does not throw for distinct accelerators", () => {
  Menu.buildFromTemplate([
    { role: "quit" },
    { label: "Say hi", accelerator: "CmdOrCtrl+J", click: () => {} },
  ]);
});

test("collision detector normalises Cmd vs Control vs CmdOrCtrl", () => {
  assert.throws(
    () =>
      Menu.buildFromTemplate([
        { role: "quit" },
        { label: "Also quit", accelerator: "Control+Q", click: () => {} },
      ]),
    /Menu accelerator collision/,
  );
});
