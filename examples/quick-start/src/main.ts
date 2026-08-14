import { app, BrowserWindow, dialog, ipcMain, Notification, shell } from "electron";
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

  await win.loadURL("data:text/html," + encodeURIComponent(`
    <!doctype html>
    <html>
      <body style="font-family:system-ui;padding:2rem;line-height:1.6">
        <h1>Volt quick-start</h1>
        <p>Renderer talks to main via <code>window.electronAPI</code> exposed by
        an unmodified Electron preload script.</p>
        <p><button id="ping">Ping</button> <span id="pong"></span></p>
        <p><button id="pick">Pick a file</button> <code id="picked"></code></p>
        <p><button id="gh">Open GitHub</button></p>
        <p><button id="notify">Fire notification</button></p>
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
          window.electronAPI.onTick((n) => {
            document.getElementById('tick').textContent = 'tick ' + n;
          });
        </script>
      </body>
    </html>
  `));

  let n = 0;
  setInterval(() => win.webContents.send("tick", ++n), 1000);
});

app.on("window-all-closed", () => app.quit());
