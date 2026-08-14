// SPDX-License-Identifier: Apache-2.0

pub const PRELOAD_JS: &str = r#"
(() => {
  if (window.__volt_installed) return;
  window.__volt_installed = true;
  const pending = new Map();
  const listeners = new Map();
  let seq = 0;
  const post = (obj) => window.ipc.postMessage(JSON.stringify(obj));

  window.volt = {
    invoke(channel, ...args) {
      const invoke_id = 'i' + (++seq);
      return new Promise((resolve, reject) => {
        pending.set(invoke_id, { resolve, reject });
        post({ volt: 'invoke', invoke_id, channel, args });
      });
    },
    on(channel, cb) {
      let set = listeners.get(channel);
      if (!set) { set = new Set(); listeners.set(channel, set); }
      set.add(cb);
      return () => set.delete(cb);
    },
    off(channel, cb) {
      listeners.get(channel)?.delete(cb);
    },
    send(channel, ...args) {
      post({ volt: 'send', channel, args });
    },
  };

  window.__volt_deliver = (invoke_id, value, error) => {
    const p = pending.get(invoke_id);
    if (!p) return;
    pending.delete(invoke_id);
    if (error) p.reject(new Error(error));
    else p.resolve(value);
  };

  window.__volt_receive = (channel, args) => {
    const set = listeners.get(channel);
    if (!set) return;
    for (const cb of set) {
      try { cb({}, ...args); } catch (e) { console.error(e); }
    }
  };

  const electronShim = {
    ipcRenderer: {
      invoke: (ch, ...args) => window.volt.invoke(ch, ...args),
      send: (ch, ...args) => window.volt.send(ch, ...args),
      on: (ch, cb) => { window.volt.on(ch, cb); return electronShim.ipcRenderer; },
      once: (ch, cb) => {
        const off = window.volt.on(ch, (e, ...a) => { off(); cb(e, ...a); });
        return electronShim.ipcRenderer;
      },
      removeListener: (ch, cb) => { window.volt.off(ch, cb); return electronShim.ipcRenderer; },
      removeAllListeners: () => electronShim.ipcRenderer,
      sendSync: () => { throw new Error("ipcRenderer.sendSync is not supported in Volt"); },
      postMessage: () => { throw new Error("ipcRenderer.postMessage is not supported in Volt"); },
    },
    contextBridge: {
      exposeInMainWorld(name, api) {
        Object.defineProperty(window, name, { value: api, writable: false, configurable: false });
      },
      exposeInIsolatedWorld(_worldId, name, api) {
        Object.defineProperty(window, name, { value: api, writable: false, configurable: false });
      },
    },
    webFrame: {
      setZoomFactor: () => {},
      getZoomFactor: () => 1,
    },
  };

  const req = (name) => {
    if (name === 'electron') return electronShim;
    throw new Error("require('" + name + "') is not supported in Volt preloads");
  };
  window.require = req;
  try { globalThis.require = req; } catch {}
})();
"#;
