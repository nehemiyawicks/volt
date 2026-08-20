const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("stress", {
  runChecks: () => ipcRenderer.invoke("run-checks"),
  pickFile: () => ipcRenderer.invoke("pick-file"),
  showError: () => ipcRenderer.invoke("show-error"),
  onFocusPicker: (cb) => ipcRenderer.on("focus-picker", () => cb()),
  versions: process.versions,
  platform: process.platform,
});
