const { app, BrowserWindow } = require("electron");

app.whenReady().then(async () => {
  const win = new BrowserWindow({ width: 900, height: 640, title: "volt on chromium" });
  await win.loadURL("data:text/html," + encodeURIComponent(`
    <!doctype html>
    <html>
      <head><title>Volt on Chromium</title></head>
      <body style="font-family:system-ui;padding:2rem">
        <h1>Volt on Chromium (CDP backend)</h1>
        <p>If you can read this, the CDP host successfully spawned a Chromium tab and loaded a page.</p>
        <p>User agent: <code id="ua"></code></p>
        <script>document.getElementById("ua").textContent = navigator.userAgent;</script>
      </body>
    </html>
  `));

  console.error("[quick-start-chromium] window created");
});

app.on("window-all-closed", () => app.quit());
