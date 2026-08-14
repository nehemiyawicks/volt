import { app, BrowserWindow, clipboard, dialog, globalShortcut, ipcMain, Menu, Notification, shell, Tray } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

ipcMain.handle("ping", () => "pong");
ipcMain.handle("pickFile", async () => {
  const r = await dialog.showOpenDialog({ properties: ["openFile"] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle("openGithub", async () => {
  await shell.openExternal("https://github.com/nehemiyawicks/volt");
  return true;
});
ipcMain.handle("notify", async () => {
  await new Notification({ title: "Volt", body: "Hello from the main process." }).show();
  return true;
});
ipcMain.handle("copyToClipboard", async (_e, text: string) => {
  await clipboard.writeText(text);
  return true;
});
ipcMain.handle("readClipboard", async () => clipboard.readText());

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 900,
    height: 640,
    title: "Volt quick-start",
    webPreferences: {
      preload: resolve(__dirname, "preload.js"),
      contextIsolation: true,
    },
  });

  await Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: "quick-start",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "File",
      submenu: [
        {
          label: "Say hi",
          accelerator: "CmdOrCtrl+J",
          click: () => new Notification({ title: "Volt", body: "menu click works" }).show(),
        },
        { type: "separator" },
        { role: "close" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Toggle DevTools",
          accelerator: "CmdOrCtrl+Alt+I",
          click: () => win.webContents.toggleDevTools(),
        },
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: () => win.webContents.reload(),
        },
      ],
    },
  ]));

  await win.loadURL("data:text/html," + encodeURIComponent(`
    <!doctype html>
    <html>
      <body style="font-family:system-ui;padding:2rem;line-height:1.6">
        <h1>Volt quick-start</h1>
        <p>Try the <b>File</b> menu &rarr; <b>Say hi</b> (Cmd+J). Then the rest below.</p>
        <p><button id="ping">Ping</button> <span id="pong"></span></p>
        <p><button id="pick">Pick a file</button> <code id="picked"></code></p>
        <p><button id="gh">Open GitHub</button></p>
        <p><button id="notify">Fire notification</button></p>
        <p><button id="copy">Copy 'hello volt' to clipboard</button></p>
        <p><button id="read">Read clipboard</button> <code id="clip"></code></p>
        <p>Global shortcut: press <b>Cmd+Shift+V</b> anywhere (even in another app)</p>
        <p>From main: <code id="tick"></code></p>
        <script>
          document.getElementById('ping').onclick = async () => {
            document.getElementById('pong').textContent = await window.electronAPI.ping();
          };
          document.getElementById('pick').onclick = async () => {
            const path = await window.electronAPI.pickFile();
            document.getElementById('picked').textContent = path ?? '(cancelled)';
          };
          document.getElementById('gh').onclick = () => window.electronAPI.openGithub();
          document.getElementById('notify').onclick = () => window.electronAPI.notify();
          document.getElementById('copy').onclick = () => window.electronAPI.copyToClipboard('hello volt');
          document.getElementById('read').onclick = async () => {
            document.getElementById('clip').textContent = await window.electronAPI.readClipboard();
          };
          window.electronAPI.onTick((n) => {
            document.getElementById('tick').textContent = 'tick ' + n;
          });
        </script>
      </body>
    </html>
  `));

  let n = 0;
  let ticker: ReturnType<typeof setInterval> | null = setInterval(
    () => win.webContents.send("tick", ++n),
    1000,
  );
  win.on("blur", () => {
    if (ticker) { clearInterval(ticker); ticker = null; }
  });
  win.on("focus", () => {
    if (!ticker) ticker = setInterval(() => win.webContents.send("tick", ++n), 1000);
  });
});

app.on("window-all-closed", () => app.quit());

app.whenReady().then(async () => {
  await globalShortcut.register("CmdOrCtrl+Shift+V", () => {
    new Notification({ title: "Volt", body: "Global shortcut fired." }).show();
  });

  const tray = new Tray();
  await tray.setToolTip("Volt quick-start");
  await tray.setContextMenu([
    { label: "Show notification", click: () => new Notification({ title: "Tray", body: "Clicked from tray." }).show() },
    { type: "separator" },
    { role: "quit" },
  ]);
  tray.on("click", () => new Notification({ title: "Tray", body: "Tray icon clicked." }).show());
});
