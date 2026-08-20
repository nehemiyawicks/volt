// Simulates the destructure pattern VS Code uses at every top-level module.
// If any of these is undefined we get a TypeError before whenReady.

const electron = require("electron");

const {
  app, BrowserWindow, BrowserView, TouchBar,
  Menu, MenuItem, Tray, Notification,
  dialog, shell, clipboard, globalShortcut,
  ipcMain, ipcRenderer,
  session, protocol, net,
  powerMonitor, powerSaveBlocker, systemPreferences, nativeTheme, nativeImage,
  screen, contentTracing, crashReporter,
  autoUpdater, desktopCapturer,
  MessageChannelMain, MessagePortMain, utilityProcess,
  contextBridge, webFrame, webContents, WebContentsView,
} = electron;

const checks = [];
function have(name, ref) {
  const ok = ref !== undefined && ref !== null;
  checks.push({ name, ok, type: typeof ref });
}

have("app", app);
have("app.whenReady", app.whenReady);
have("app.on", app.on);
have("app.commandLine", app.commandLine);
have("app.commandLine.appendSwitch", app.commandLine.appendSwitch);
have("app.disableHardwareAcceleration", app.disableHardwareAcceleration);
have("app.getPath", app.getPath);
have("app.setPath", app.setPath);
have("app.getFileIcon", app.getFileIcon);
have("app.setJumpList", app.setJumpList);
have("app.setUserTasks", app.setUserTasks);
have("app.setActivationPolicy", app.setActivationPolicy);
have("app.startAccessingSecurityScopedResource", app.startAccessingSecurityScopedResource);
have("app.requestSingleInstanceLock", app.requestSingleInstanceLock);
have("app.setAsDefaultProtocolClient", app.setAsDefaultProtocolClient);
have("app.on('second-instance')", true);
have("app.relaunch", app.relaunch);
have("app.dock", app.dock);
have("app.dock.setBadge", app.dock.setBadge);
have("app.getPreferredSystemLanguages", app.getPreferredSystemLanguages);
have("app.getSystemLocale", app.getSystemLocale);
have("app.getLoginItemSettings", app.getLoginItemSettings);

have("BrowserWindow", BrowserWindow);
have("BrowserWindow.fromId", BrowserWindow.fromId);
have("BrowserWindow.fromWebContents", BrowserWindow.fromWebContents);
have("BrowserWindow.getAllWindows", BrowserWindow.getAllWindows);
have("BrowserWindow.getFocusedWindow", BrowserWindow.getFocusedWindow);

have("BrowserView", BrowserView);
have("TouchBar", TouchBar);
have("TouchBar.TouchBarButton", TouchBar.TouchBarButton);
have("TouchBar.TouchBarLabel", TouchBar.TouchBarLabel);

have("Menu", Menu);
have("Menu.buildFromTemplate", Menu.buildFromTemplate);
have("Menu.setApplicationMenu", Menu.setApplicationMenu);
have("MenuItem", MenuItem);

have("Tray", Tray);
have("Notification", Notification);
have("Notification.isSupported", Notification.isSupported);

have("dialog", dialog);
have("dialog.showMessageBox", dialog.showMessageBox);
have("dialog.showMessageBoxSync", dialog.showMessageBoxSync);
have("dialog.showErrorBox", dialog.showErrorBox);
have("dialog.showOpenDialog", dialog.showOpenDialog);
have("dialog.showSaveDialog", dialog.showSaveDialog);

have("shell", shell);
have("shell.openExternal", shell.openExternal);
have("shell.openPath", shell.openPath);
have("shell.showItemInFolder", shell.showItemInFolder);
have("shell.trashItem", shell.trashItem);
have("shell.beep", shell.beep);

have("clipboard", clipboard);
have("clipboard.readText", clipboard.readText);
have("clipboard.writeText", clipboard.writeText);

have("globalShortcut", globalShortcut);
have("globalShortcut.register", globalShortcut.register);

have("ipcMain", ipcMain);
have("ipcMain.on", ipcMain.on);
have("ipcMain.handle", ipcMain.handle);
have("ipcMain.removeAllListeners", ipcMain.removeAllListeners);
have("ipcRenderer", ipcRenderer);

have("session", session);
have("session.defaultSession", session.defaultSession);
have("session.fromPartition", session.fromPartition);
have("session.defaultSession.cookies", session.defaultSession.cookies);
have("session.defaultSession.webRequest", session.defaultSession.webRequest);
have("session.defaultSession.webRequest.onBeforeRequest", session.defaultSession.webRequest.onBeforeRequest);
have("session.defaultSession.protocol", session.defaultSession.protocol);
have("session.defaultSession.protocol.registerFileProtocol", session.defaultSession.protocol.registerFileProtocol);
have("session.defaultSession.setPermissionRequestHandler", session.defaultSession.setPermissionRequestHandler);
have("session.defaultSession.setSpellCheckerLanguages", session.defaultSession.setSpellCheckerLanguages);
have("session.defaultSession.setProxy", session.defaultSession.setProxy);
have("session.defaultSession.setPreloads", session.defaultSession.setPreloads);
have("session.defaultSession.serviceWorkers", session.defaultSession.serviceWorkers);
have("session.defaultSession.extensions", session.defaultSession.extensions);

have("protocol", protocol);
have("protocol.registerSchemesAsPrivileged", protocol.registerSchemesAsPrivileged);
have("protocol.registerFileProtocol", protocol.registerFileProtocol);

have("net", net);
have("net.request", net.request);

have("powerMonitor", powerMonitor);
have("powerMonitor.getSystemIdleState", powerMonitor.getSystemIdleState);
have("powerMonitor.isOnBatteryPower", powerMonitor.isOnBatteryPower);

have("powerSaveBlocker", powerSaveBlocker);
have("powerSaveBlocker.start", powerSaveBlocker.start);

have("systemPreferences", systemPreferences);
have("systemPreferences.getAccentColor", systemPreferences.getAccentColor);
have("systemPreferences.getEffectiveAppearance", systemPreferences.getEffectiveAppearance);
have("systemPreferences.getMediaAccessStatus", systemPreferences.getMediaAccessStatus);
have("systemPreferences.canPromptTouchID", systemPreferences.canPromptTouchID);

have("nativeTheme", nativeTheme);
have("nativeImage", nativeImage);
have("nativeImage.createFromPath", nativeImage.createFromPath);
have("nativeImage.createEmpty", nativeImage.createEmpty);

have("screen", screen);
have("screen.getPrimaryDisplay", screen.getPrimaryDisplay);
have("screen.getAllDisplays", screen.getAllDisplays);

have("contentTracing", contentTracing);
have("contentTracing.startRecording", contentTracing.startRecording);
have("crashReporter", crashReporter);
have("crashReporter.start", crashReporter.start);
have("autoUpdater", autoUpdater);
have("autoUpdater.setFeedURL", autoUpdater.setFeedURL);
have("autoUpdater.checkForUpdates", autoUpdater.checkForUpdates);
have("desktopCapturer", desktopCapturer);
have("desktopCapturer.getSources", desktopCapturer.getSources);

have("MessageChannelMain", MessageChannelMain);
have("MessagePortMain", MessagePortMain);
have("utilityProcess", utilityProcess);
have("utilityProcess.fork", utilityProcess.fork);

have("contextBridge", contextBridge ?? {});
have("webFrame", webFrame ?? {});
have("webContents", webContents ?? {});
have("WebContentsView", WebContentsView ?? BrowserView);

const failing = checks.filter((c) => !c.ok);
const passing = checks.length - failing.length;
console.log(`[vscode-boot] ${passing}/${checks.length} imports and top-level accesses did not TypeError`);
if (failing.length > 0) {
  console.log(`[vscode-boot] MISSING:`);
  for (const c of failing) console.log(`  - ${c.name}`);
  process.exit(1);
}

app.whenReady().then(() => {
  console.log("[vscode-boot] app.whenReady resolved; would open workbench window here");
  const w = new BrowserWindow({
    width: 900,
    height: 640,
    title: "vscode-style-boot",
    webPreferences: { contextIsolation: true, sandbox: false, nodeIntegration: false, webviewTag: true },
  });
  w.loadURL("data:text/html," + encodeURIComponent("<h1>vscode-style-boot OK</h1><p>Every dereferenced Electron API returned a real value at import time.</p>"));

  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: "app", submenu: [{ role: "about" }, { role: "quit" }] },
  ]));

  app.commandLine.appendSwitch("disable-color-correct-rendering");
  app.commandLine.appendSwitch("js-flags", "--harmony");
  app.disableHardwareAcceleration();

  const { port1, port2 } = new MessageChannelMain();
  port2.on("message", ({ data }) => console.log("[vscode-boot] MessagePort round-trip:", data));
  port2.start();
  port1.postMessage({ hello: "world" });

  session.defaultSession.webRequest.onBeforeRequest({}, () => {});
  session.defaultSession.protocol.registerFileProtocol("vscode-file", () => {});
  session.defaultSession.setPermissionRequestHandler(() => {});

  const psId = powerSaveBlocker.start("prevent-app-suspension");
  console.log("[vscode-boot] powerSaveBlocker id:", psId);

  autoUpdater.once("update-not-available", () => console.log("[vscode-boot] autoUpdater emitted"));
  autoUpdater.checkForUpdates();
});

app.on("window-all-closed", () => app.quit());
