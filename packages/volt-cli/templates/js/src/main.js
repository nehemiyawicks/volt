import { app, BrowserWindow } from "electron";

app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 900, height: 640, title: "My Volt App" });
  win.loadURL("data:text/html," + encodeURIComponent(`
    <!doctype html>
    <html>
      <body style="font-family:system-ui;padding:2rem">
        <h1>Hello from Volt</h1>
        <p>Edit <code>src/main.js</code> to get started.</p>
      </body>
    </html>
  `));
});

app.on("window-all-closed", () => app.quit());
