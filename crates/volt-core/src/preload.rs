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
})();
"#;
