import { app, BrowserWindow, dialog, ipcMain } from "electron";

ipcMain.handle("ping", () => "pong");

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
        <p>Renderer view. See <code>examples/quick-start/src/main.ts</code>.</p>
        <button id="alert">Show native message box</button>
        <script>
          document.getElementById('alert').onclick = () => {
            fetch('volt:alert').catch(() => {});
          };
        </script>
      </body>
    </html>
  `));

  await dialog.showMessageBox({
    message: "Volt is running.",
    title: "Volt quick-start",
    buttons: ["Nice"],
  });
});

app.on("window-all-closed", () => app.quit());
