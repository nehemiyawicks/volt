const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  Notification,
  dialog,
  ipcMain,
  shell,
  clipboard,
  globalShortcut,
  screen,
  nativeTheme,
  nativeImage,
  session,
  powerMonitor,
  systemPreferences,
  autoUpdater,
  crashReporter,
  net,
} = require("electron");
const path = require("node:path");

const assertions = [];
function check(name, fn) {
  try {
    const result = fn();
    if (result && typeof result.then === "function") {
      return result.then(() => assertions.push({ name, ok: true }))
        .catch((err) => assertions.push({ name, ok: false, err: String(err) }));
    }
    assertions.push({ name, ok: true });
  } catch (err) {
    assertions.push({ name, ok: false, err: String(err) });
  }
}

check("app.getName", () => app.getName());
check("app.getVersion", () => app.getVersion());
check("app.getLocale", () => app.getLocale());
check("app.getPath('home')", () => app.getPath("home"));
check("app.getPath('userData')", () => app.getPath("userData"));
check("app.getPath('downloads')", () => app.getPath("downloads"));
check("app.getPath('logs')", () => app.getPath("logs"));
check("app.isPackaged", () => typeof app.isPackaged === "boolean");
check("app.commandLine.hasSwitch", () => app.commandLine.hasSwitch("x"));
check("app.dock.setBadge", () => { app.dock.setBadge("!"); });
check("clipboard.writeText+readText", async () => {
  await clipboard.writeText("stress");
  const r = await clipboard.readText();
  if (r !== "stress") throw new Error("clipboard round trip: " + r);
});
check("nativeImage.createFromPath", () => nativeImage.createFromPath("/nope.png"));
check("nativeTheme.shouldUseDarkColors", () => typeof nativeTheme.shouldUseDarkColors === "boolean");
check("powerMonitor.isOnBatteryPower", () => powerMonitor.isOnBatteryPower() === false);
check("systemPreferences.getAccentColor", () => systemPreferences.getAccentColor());
check("crashReporter.start no-throw", () => crashReporter.start({ submitURL: "http://x" }));
check("autoUpdater fires events", () => new Promise((resolve) => {
  autoUpdater.once("update-not-available", () => resolve());
  autoUpdater.checkForUpdates();
}));
check("session.defaultSession no-throw", () => session.defaultSession.clearCache());
check("net.request GET", () => new Promise((resolve, reject) => {
  const req = net.request({ url: "https://api.github.com/zen", method: "GET" });
  const chunks = [];
  req.on("response", (res) => {
    res.on("data", (c) => chunks.push(c));
    res.on("end", () => {
      const body = Buffer.concat(chunks).toString();
      if (body.length > 0) resolve();
      else reject(new Error("empty body"));
    });
  });
  req.on("error", reject);
  req.end();
}));

let win, tray;

ipcMain.handle("run-checks", () => {
  return assertions.map((a) => `${a.ok ? "OK " : "!! "} ${a.name}${a.err ? " -> " + a.err : ""}`);
});
ipcMain.handle("pick-file", async () => {
  const r = await dialog.showOpenDialog({ properties: ["openFile"] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle("show-error", () => dialog.showErrorBox("Stress test", "This is a fake error."));

app.whenReady().then(async () => {
  check("screen.getPrimaryDisplay", () => screen.getPrimaryDisplay());
  check("screen.getAllDisplays", () => screen.getAllDisplays());

  await Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "stress-test", submenu: [{ role: "about" }, { role: "quit" }] },
    { label: "File", submenu: [
      { label: "Pick file", accelerator: "CmdOrCtrl+O", click: () => win?.webContents.send("focus-picker") },
    ]},
    { label: "Edit", submenu: [
      { role: "undo" }, { role: "redo" }, { type: "separator" },
      { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" },
    ]},
    { label: "View", submenu: [
      { label: "Toggle DevTools", accelerator: "CmdOrCtrl+Alt+I", click: () => win?.webContents.toggleDevTools() },
      { label: "Reload", accelerator: "CmdOrCtrl+R", click: () => win?.webContents.reload() },
    ]},
  ]));

  win = new BrowserWindow({
    width: 720,
    height: 640,
    title: "Volt stress test",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  win.once("ready-to-show", () => win.show());
  win.on("focus", () => console.log("[stress] focus"));
  win.on("blur", () => console.log("[stress] blur"));

  await win.loadFile(path.join(__dirname, "index.html"));

  tray = new Tray();
  await tray.setToolTip("Volt stress test");
  await tray.setContextMenu([
    { label: "Show", click: () => win.show() },
    { type: "separator" },
    { role: "quit" },
  ]);

  await globalShortcut.register("CmdOrCtrl+Alt+Shift+V", () => {
    new Notification({ title: "Volt stress", body: "Global shortcut works." }).show();
  });

  Promise.allSettled(assertions.filter(a => a && a.then)).then(() => {
    const passing = assertions.filter(a => a.ok).length;
    const failing = assertions.filter(a => !a.ok).length;
    console.log(`[stress] ${passing} passed, ${failing} failed (of ${assertions.length})`);
    for (const a of assertions.filter(a => !a.ok)) console.log(`  !! ${a.name}: ${a.err}`);
  });
});

app.on("window-all-closed", () => app.quit());
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) app.whenReady().then(() => {}); });
