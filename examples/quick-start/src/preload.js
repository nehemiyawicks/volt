const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  ping: () => ipcRenderer.invoke("ping"),
  pickFile: () => ipcRenderer.invoke("pickFile"),
  openGithub: () => ipcRenderer.invoke("openGithub"),
  notify: () => ipcRenderer.invoke("notify"),
  copyToClipboard: (text) => ipcRenderer.invoke("copyToClipboard", text),
  readClipboard: () => ipcRenderer.invoke("readClipboard"),
  onTick: (cb) => ipcRenderer.on("tick", (_e, n) => cb(n)),
});
