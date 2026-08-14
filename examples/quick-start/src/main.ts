import { app, BrowserWindow, dialog, ipcMain } from "electron";

ipcMain.handle("ping", () => "pong");
ipcMain.handle("pickFile", async () => {
  const r = await dialog.showOpenDialog({ properties: ["openFile"] });
  return r.canceled ? null : r.filePaths[0];
});

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 900,
    height: 640,
    title: "Volt quick-start",
  });

  await win.loadURL("data:text/html," + encodeURIComponent(`
    <!doctype html>
    <html>
      <body style="font-family:system-ui;padding:2rem">
        <h1>Volt quick-start</h1>
        <p>IPC round-trip: <button id="ping">Ping</button> <span id="pong"></span></p>
        <p>Native dialog: <button id="pick">Pick a file</button> <code id="picked"></code></p>
        <script>
          document.getElementById('ping').onclick = async () => {
            document.getElementById('pong').textContent = await window.volt.invoke('ping');
          };
          document.getElementById('pick').onclick = async () => {
            const path = await window.volt.invoke('pickFile');
            document.getElementById('picked').textContent = path ?? '(cancelled)';
          };
        </script>
      </body>
    </html>
  `));
});

app.on("window-all-closed", () => app.quit());
