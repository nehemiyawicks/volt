// SPDX-License-Identifier: Apache-2.0

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::mpsc::{channel, Receiver, Sender};
use std::thread;

use anyhow::{anyhow, Context, Result};
use serde::Deserialize;
use tao::event::{Event, WindowEvent};
use tao::event_loop::{ControlFlow, EventLoopBuilder, EventLoopProxy, EventLoopWindowTarget};
use tao::window::{Window, WindowBuilder, WindowId};
use wry::{WebView, WebViewBuilder};

mod menu;
mod preload;
mod protocol;
use protocol::{Command as JsCommand, Event as JsEvent};

struct AppState {
    windows: HashMap<u64, WindowSlot>,
    next_window_id: u64,
    tx_to_js: Sender<JsEvent>,
    app_menu: Option<muda::Menu>,
    hotkeys: HashMap<String, global_hotkey::hotkey::HotKey>,
    hotkey_manager: Option<global_hotkey::GlobalHotKeyManager>,
}

struct WindowSlot {
    #[allow(dead_code)]
    window: Window,
    webview: WebView,
    tao_id: WindowId,
}

#[derive(Debug)]
enum HostEvent {
    Command(JsCommand),
    IpcFromRenderer { window_id: u64, raw: String },
    MenuClick(String),
    HotkeyPressed(u32),
    ChildExited,
}

#[derive(Debug, Deserialize)]
struct Manifest {
    entry: String,
    #[serde(default)]
    runtime: Option<String>,
    #[serde(default)]
    #[allow(dead_code)]
    name: Option<String>,
}

fn main() -> Result<()> {
    let manifest = load_manifest()?;
    let event_loop = EventLoopBuilder::<HostEvent>::with_user_event().build();
    let proxy = event_loop.create_proxy();

    let (tx_to_js, rx_to_js) = channel::<JsEvent>();
    let child = spawn_js_runtime(&manifest, proxy.clone())?;
    thread::spawn(move || pump_events_to_js(child.stdin, rx_to_js));

    let hotkey_manager = global_hotkey::GlobalHotKeyManager::new().ok();
    let mut state = AppState {
        windows: HashMap::new(),
        next_window_id: 1,
        tx_to_js,
        app_menu: None,
        hotkeys: HashMap::new(),
        hotkey_manager,
    };
    let _ = state.tx_to_js.send(JsEvent::Ready);

    let menu_proxy = proxy.clone();
    muda::MenuEvent::set_event_handler(Some(move |ev: muda::MenuEvent| {
        let id = ev.id().0.clone();
        if !id.is_empty() {
            let _ = menu_proxy.send_event(HostEvent::MenuClick(id));
        }
    }));

    let hotkey_proxy = proxy.clone();
    global_hotkey::GlobalHotKeyEvent::set_event_handler(Some(move |ev: global_hotkey::GlobalHotKeyEvent| {
        if ev.state == global_hotkey::HotKeyState::Pressed {
            let _ = hotkey_proxy.send_event(HostEvent::HotkeyPressed(ev.id));
        }
    }));

    event_loop.run(move |event, target, control_flow| {
        *control_flow = ControlFlow::Wait;
        match event {
            Event::UserEvent(HostEvent::Command(cmd)) => {
                if let Err(err) = handle_command(cmd, &mut state, target, &proxy) {
                    eprintln!("[volt-core] {err:#}");
                }
            }
            Event::UserEvent(HostEvent::IpcFromRenderer { window_id, raw }) => {
                if let Err(err) = handle_ipc_from_renderer(window_id, raw, &state) {
                    eprintln!("[volt-core] ipc: {err:#}");
                }
            }
            Event::UserEvent(HostEvent::MenuClick(id)) => {
                let _ = state.tx_to_js.send(JsEvent::MenuClick { id });
            }
            Event::UserEvent(HostEvent::HotkeyPressed(id)) => {
                if let Some((sid, _)) = state.hotkeys.iter().find(|(_, k)| k.id() == id) {
                    let _ = state.tx_to_js.send(JsEvent::GlobalShortcutClick { id: sid.clone() });
                }
            }
            Event::UserEvent(HostEvent::ChildExited) => *control_flow = ControlFlow::Exit,
            Event::WindowEvent { event, window_id, .. } => {
                let key = state
                    .windows
                    .iter()
                    .find(|(_, s)| s.tao_id == window_id)
                    .map(|(k, _)| *k);
                let Some(k) = key else { return };
                match event {
                    WindowEvent::CloseRequested => {
                        state.windows.remove(&k);
                        let _ = state.tx_to_js.send(JsEvent::WindowClosed { id: k });
                        if state.windows.is_empty() {
                            let _ = state.tx_to_js.send(JsEvent::AllWindowsClosed);
                        }
                    }
                    WindowEvent::Focused(true) => {
                        let _ = state.tx_to_js.send(JsEvent::WindowFocus { id: k });
                    }
                    WindowEvent::Focused(false) => {
                        let _ = state.tx_to_js.send(JsEvent::WindowBlur { id: k });
                    }
                    _ => {}
                }
            }
            _ => {}
        }
    })
}

fn load_manifest() -> Result<Manifest> {
    let path = std::env::var("VOLT_MANIFEST").unwrap_or_else(|_| "volt.manifest.json".into());
    let raw = std::fs::read_to_string(&path)
        .with_context(|| format!("read manifest at {path}"))?;
    Ok(serde_json::from_str(&raw)?)
}

struct ChildHandles {
    stdin: std::process::ChildStdin,
}

fn spawn_js_runtime(manifest: &Manifest, proxy: EventLoopProxy<HostEvent>) -> Result<ChildHandles> {
    let runtime = pick_runtime(manifest.runtime.as_deref())?;
    let entry_is_ts = std::path::Path::new(&manifest.entry)
        .extension()
        .map(|e| e == "ts" || e == "tsx" || e == "mts")
        .unwrap_or(false);
    let mut cmd = Command::new(&runtime);
    if runtime.ends_with("node") && entry_is_ts {
        cmd.arg("--experimental-strip-types")
            .arg("--disable-warning=ExperimentalWarning");
    }
    let mut child = cmd
        .arg(&manifest.entry)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .env("VOLT_HOST", "1")
        .spawn()
        .with_context(|| format!("spawn {runtime} {}", manifest.entry))?;

    let stdout = child.stdout.take().ok_or_else(|| anyhow!("no stdout"))?;
    let stdin = child.stdin.take().ok_or_else(|| anyhow!("no stdin"))?;

    thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            let Ok(line) = line else { break };
            if line.trim().is_empty() {
                continue;
            }
            match serde_json::from_str::<JsCommand>(&line) {
                Ok(cmd) => {
                    if proxy.send_event(HostEvent::Command(cmd)).is_err() {
                        break;
                    }
                }
                Err(err) => eprintln!("[volt-core] bad message: {err}: {line}"),
            }
        }
        let _ = proxy.send_event(HostEvent::ChildExited);
    });

    Ok(ChildHandles { stdin })
}

fn pick_runtime(preferred: Option<&str>) -> Result<String> {
    let candidates: Vec<&str> = match preferred {
        Some("bun") => vec!["bun"],
        Some("node") => vec!["node"],
        _ => vec!["bun", "node"],
    };
    for c in candidates {
        if which(c).is_some() {
            return Ok(c.into());
        }
    }
    Err(anyhow!("no JS runtime found; install Bun or Node 20+"))
}

fn which(name: &str) -> Option<PathBuf> {
    let path = std::env::var_os("PATH")?;
    std::env::split_paths(&path)
        .map(|d| d.join(name))
        .find(|p| p.is_file())
}

fn pump_events_to_js(mut stdin: std::process::ChildStdin, rx: Receiver<JsEvent>) {
    while let Ok(ev) = rx.recv() {
        let Ok(mut line) = serde_json::to_string(&ev) else { continue };
        line.push('\n');
        if stdin.write_all(line.as_bytes()).is_err() {
            break;
        }
        let _ = stdin.flush();
    }
}

fn handle_command(
    cmd: JsCommand,
    state: &mut AppState,
    target: &EventLoopWindowTarget<HostEvent>,
    proxy: &EventLoopProxy<HostEvent>,
) -> Result<()> {
    match cmd {
        JsCommand::CreateWindow { options, reply_id } => {
            let id = state.next_window_id;
            state.next_window_id += 1;

            let mut builder = WindowBuilder::new()
                .with_title(options.title.as_deref().unwrap_or("Volt"))
                .with_inner_size(tao::dpi::LogicalSize::new(
                    options.width.unwrap_or(800.0),
                    options.height.unwrap_or(600.0),
                ));
            if let (Some(x), Some(y)) = (options.x, options.y) {
                builder = builder.with_position(tao::dpi::LogicalPosition::new(x, y));
            }
            if let Some(false) = options.resizable {
                builder = builder.with_resizable(false);
            }
            if let Some(v) = options.minimizable {
                builder = builder.with_minimizable(v);
            }
            if let Some(v) = options.maximizable {
                builder = builder.with_maximizable(v);
            }
            if let Some(v) = options.always_on_top {
                builder = builder.with_always_on_top(v);
            }
            if let Some(false) = options.frame {
                builder = builder.with_decorations(false);
            }
            if let Some(true) = options.transparent {
                builder = builder.with_transparent(true);
            }
            if let Some(false) = options.show {
                builder = builder.with_visible(false);
            }
            let window = builder.build(target)?;
            let tao_id = window.id();

            let ipc_proxy = proxy.clone();
            let mut wv = WebViewBuilder::new(&window)
                .with_devtools(true)
                .with_initialization_script(preload::PRELOAD_JS)
                .with_ipc_handler(move |req| {
                    let body = req.body().to_string();
                    let _ = ipc_proxy.send_event(HostEvent::IpcFromRenderer {
                        window_id: id,
                        raw: body,
                    });
                });
            if let Some(wp) = options.web_preferences.as_ref() {
                if let Some(path) = wp.preload.as_deref() {
                    match std::fs::read_to_string(path) {
                        Ok(user) => wv = wv.with_initialization_script(&user),
                        Err(err) => eprintln!("[volt-core] preload {path} unreadable: {err}"),
                    }
                }
            }
            let wv = wv;
            let wv = match (options.url.as_deref(), options.html.as_deref()) {
                (Some(u), _) => wv.with_url(u),
                (_, Some(h)) => wv.with_html(h),
                _ => wv.with_html("<!doctype html><title>Volt</title>"),
            };
            let webview = wv.build()?;

            state.windows.insert(id, WindowSlot { window, webview, tao_id });
            state.tx_to_js.send(JsEvent::Reply {
                reply_id,
                value: serde_json::json!({ "id": id }),
            })?;
        }
        JsCommand::LoadUrl { window_id, url, reply_id } => {
            let slot = state.windows.get(&window_id).ok_or_else(|| anyhow!("no window {window_id}"))?;
            slot.webview.load_url(&url)?;
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::LoadHtml { window_id, html, reply_id } => {
            let slot = state.windows.get(&window_id).ok_or_else(|| anyhow!("no window {window_id}"))?;
            slot.webview.load_html(&html)?;
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::CloseWindow { window_id, reply_id } => {
            state.windows.remove(&window_id);
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::ShowWindow { window_id, reply_id } => {
            with_window(state, window_id, |w| w.set_visible(true))?;
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::HideWindow { window_id, reply_id } => {
            with_window(state, window_id, |w| w.set_visible(false))?;
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::FocusWindow { window_id, reply_id } => {
            with_window(state, window_id, |w| w.set_focus())?;
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::MinimizeWindow { window_id, reply_id } => {
            with_window(state, window_id, |w| w.set_minimized(true))?;
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::MaximizeWindow { window_id, reply_id } => {
            with_window(state, window_id, |w| w.set_maximized(true))?;
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::UnmaximizeWindow { window_id, reply_id } => {
            with_window(state, window_id, |w| w.set_maximized(false))?;
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::SetTitle { window_id, title, reply_id } => {
            with_window(state, window_id, |w| w.set_title(&title))?;
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::SetBounds { window_id, bounds, reply_id } => {
            let slot = state.windows.get(&window_id).ok_or_else(|| anyhow!("no window {window_id}"))?;
            if let (Some(x), Some(y)) = (bounds.x, bounds.y) {
                slot.window.set_outer_position(tao::dpi::LogicalPosition::new(x, y));
            }
            if let (Some(w), Some(h)) = (bounds.width, bounds.height) {
                slot.window.set_inner_size(tao::dpi::LogicalSize::new(w, h));
            }
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::GetBounds { window_id, reply_id } => {
            let slot = state.windows.get(&window_id).ok_or_else(|| anyhow!("no window {window_id}"))?;
            let pos = slot.window.outer_position().ok();
            let size = slot.window.inner_size();
            let scale = slot.window.scale_factor();
            let logical_size = size.to_logical::<f64>(scale);
            let (x, y) = match pos {
                Some(p) => {
                    let lp = p.to_logical::<f64>(scale);
                    (lp.x, lp.y)
                }
                None => (0.0, 0.0),
            };
            state.tx_to_js.send(JsEvent::Reply {
                reply_id,
                value: serde_json::json!({
                    "x": x, "y": y, "width": logical_size.width, "height": logical_size.height
                }),
            })?;
        }
        JsCommand::SetAlwaysOnTop { window_id, flag, reply_id } => {
            with_window(state, window_id, |w| w.set_always_on_top(flag))?;
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::Quit => state.windows.clear(),
        JsCommand::ShowMessageBox { options, reply_id } => {
            let response = native_message_box(&options);
            state.tx_to_js.send(JsEvent::Reply {
                reply_id,
                value: serde_json::json!({ "response": response, "checkboxChecked": false }),
            })?;
        }
        JsCommand::ShowOpenDialog { options, reply_id } => {
            let value = open_dialog(options);
            state.tx_to_js.send(JsEvent::Reply { reply_id, value })?;
        }
        JsCommand::ShowSaveDialog { options, reply_id } => {
            let value = save_dialog(options);
            state.tx_to_js.send(JsEvent::Reply { reply_id, value })?;
        }
        JsCommand::IpcResult { window_id, invoke_id, value, error } => {
            let slot = state.windows.get(&window_id).ok_or_else(|| anyhow!("no window {window_id}"))?;
            let script = format!(
                "window.__volt_deliver({}, {}, {})",
                serde_json::to_string(&invoke_id).unwrap(),
                serde_json::to_string(&value).unwrap(),
                match error {
                    Some(e) => serde_json::to_string(&e).unwrap(),
                    None => "null".into(),
                },
            );
            slot.webview.evaluate_script(&script)?;
        }
        JsCommand::WebContentsSend { window_id, channel, args } => {
            let slot = state.windows.get(&window_id).ok_or_else(|| anyhow!("no window {window_id}"))?;
            let script = format!(
                "window.__volt_receive({}, {})",
                serde_json::to_string(&channel).unwrap(),
                serde_json::to_string(&args).unwrap(),
            );
            slot.webview.evaluate_script(&script)?;
        }
        JsCommand::ShellOpenExternal { url, reply_id } => {
            let opener = if cfg!(target_os = "macos") { "open" }
                else if cfg!(target_os = "windows") { "cmd" }
                else { "xdg-open" };
            let status = if cfg!(target_os = "windows") {
                Command::new(opener).args(["/C", "start", "", &url]).status()
            } else {
                Command::new(opener).arg(&url).status()
            };
            state.tx_to_js.send(JsEvent::Reply {
                reply_id,
                value: serde_json::json!({ "ok": status.map(|s| s.success()).unwrap_or(false) }),
            })?;
        }
        JsCommand::SetApplicationMenu { template, reply_id } => {
            let m = menu::build_menu(&template)?;
            #[cfg(target_os = "macos")]
            m.init_for_nsapp();
            #[cfg(not(target_os = "macos"))]
            {
                for (_, slot) in state.windows.iter() {
                    let _ = m.init_for_hwnd_with_theme(slot.window.hwnd() as _, muda::MenuTheme::Auto);
                }
            }
            state.app_menu = Some(m);
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::OpenDevTools { window_id, reply_id } => {
            let slot = state.windows.get(&window_id).ok_or_else(|| anyhow!("no window {window_id}"))?;
            slot.webview.open_devtools();
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::CloseDevTools { window_id, reply_id } => {
            let slot = state.windows.get(&window_id).ok_or_else(|| anyhow!("no window {window_id}"))?;
            slot.webview.close_devtools();
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::ToggleDevTools { window_id, reply_id } => {
            let slot = state.windows.get(&window_id).ok_or_else(|| anyhow!("no window {window_id}"))?;
            if slot.webview.is_devtools_open() {
                slot.webview.close_devtools();
            } else {
                slot.webview.open_devtools();
            }
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::ExecuteJavaScript { window_id, code, reply_id } => {
            let slot = state.windows.get(&window_id).ok_or_else(|| anyhow!("no window {window_id}"))?;
            let tx = state.tx_to_js.clone();
            let reply = reply_id.clone();
            slot.webview
                .evaluate_script_with_callback(&code, move |result| {
                    let parsed: serde_json::Value = serde_json::from_str(&result)
                        .unwrap_or(serde_json::Value::String(result));
                    let _ = tx.send(JsEvent::Reply {
                        reply_id: reply.clone(),
                        value: serde_json::json!({ "value": parsed }),
                    });
                })?;
        }
        JsCommand::ClipboardReadText { reply_id } => {
            let text = arboard::Clipboard::new()
                .and_then(|mut c| c.get_text())
                .unwrap_or_default();
            state.tx_to_js.send(JsEvent::Reply { reply_id, value: serde_json::Value::String(text) })?;
        }
        JsCommand::ClipboardWriteText { text, reply_id } => {
            let _ = arboard::Clipboard::new().and_then(|mut c| c.set_text(text));
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::GlobalShortcutRegister { id, accelerator, reply_id } => {
            let result = register_hotkey(state, &id, &accelerator);
            state.tx_to_js.send(JsEvent::Reply {
                reply_id,
                value: serde_json::json!({ "ok": result.is_ok(), "error": result.err().map(|e| e.to_string()) }),
            })?;
        }
        JsCommand::GlobalShortcutUnregister { id, reply_id } => {
            if let (Some(mgr), Some(k)) = (state.hotkey_manager.as_ref(), state.hotkeys.remove(&id)) {
                let _ = mgr.unregister(k);
            }
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::GlobalShortcutUnregisterAll { reply_id } => {
            if let Some(mgr) = state.hotkey_manager.as_ref() {
                for (_, k) in state.hotkeys.drain() {
                    let _ = mgr.unregister(k);
                }
            }
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::AppBeforeQuit { reply_id } => {
            ack(&state.tx_to_js, reply_id)?;
        }
        JsCommand::NotificationShow { options, reply_id } => {
            std::thread::spawn(move || show_notification(options));
            ack(&state.tx_to_js, reply_id)?;
        }
    }
    Ok(())
}

fn with_window<F: FnOnce(&Window)>(state: &AppState, id: u64, f: F) -> Result<()> {
    let slot = state.windows.get(&id).ok_or_else(|| anyhow!("no window {id}"))?;
    f(&slot.window);
    Ok(())
}

fn ack(tx: &Sender<JsEvent>, reply_id: String) -> Result<()> {
    tx.send(JsEvent::Reply { reply_id, value: serde_json::Value::Null })?;
    Ok(())
}

fn handle_ipc_from_renderer(window_id: u64, raw: String, state: &AppState) -> Result<()> {
    #[derive(Deserialize)]
    struct Envelope {
        volt: String,
        #[serde(default)]
        invoke_id: Option<String>,
        channel: String,
        #[serde(default)]
        args: Vec<serde_json::Value>,
    }
    let env: Envelope = serde_json::from_str(&raw)?;
    match env.volt.as_str() {
        "invoke" => {
            let invoke_id = env.invoke_id.ok_or_else(|| anyhow!("invoke missing invoke_id"))?;
            state.tx_to_js.send(JsEvent::IpcInvoke {
                window_id,
                invoke_id,
                channel: env.channel,
                args: env.args,
            })?;
        }
        "send" => {
            state.tx_to_js.send(JsEvent::IpcInvoke {
                window_id,
                invoke_id: String::new(),
                channel: env.channel,
                args: env.args,
            })?;
        }
        other => return Err(anyhow!("unknown ipc verb: {other}")),
    }
    Ok(())
}

fn native_message_box(opts: &protocol::MessageBoxOptions) -> u32 {
    use rfd::{MessageButtons, MessageDialog, MessageDialogResult, MessageLevel};
    let mut dlg = MessageDialog::new()
        .set_title(opts.title.as_deref().unwrap_or("Volt"))
        .set_description(match &opts.detail {
            Some(d) => format!("{}\n\n{}", opts.message, d),
            None => opts.message.clone(),
        });
    dlg = dlg.set_level(match opts.kind.as_deref() {
        Some("error") => MessageLevel::Error,
        Some("warning") => MessageLevel::Warning,
        _ => MessageLevel::Info,
    });

    let buttons = opts.buttons.clone().unwrap_or_default();
    let ordered = &buttons[..];
    let btn_config = match ordered.len() {
        0 => MessageButtons::Ok,
        1 => MessageButtons::OkCustom(ordered[0].clone()),
        2 => MessageButtons::OkCancelCustom(ordered[0].clone(), ordered[1].clone()),
        _ => MessageButtons::YesNoCancelCustom(
            ordered[0].clone(),
            ordered[1].clone(),
            ordered[2].clone(),
        ),
    };
    dlg = dlg.set_buttons(btn_config);

    match (ordered.len(), dlg.show()) {
        (0, _) => 0,
        (1, MessageDialogResult::Custom(_)) => 0,
        (2, MessageDialogResult::Custom(ref s)) if s == &ordered[0] => 0,
        (2, MessageDialogResult::Custom(_)) => 1,
        (_, MessageDialogResult::Custom(ref s)) => ordered
            .iter()
            .position(|b| b == s)
            .map(|i| i as u32)
            .unwrap_or(0),
        _ => 0,
    }
}

fn open_dialog(opts: protocol::OpenDialogOptions) -> serde_json::Value {
    let props: Vec<String> = opts.properties.clone();
    let is_dir = props.iter().any(|p| p == "openDirectory");
    let multi = props.iter().any(|p| p == "multiSelections");

    let mut dlg = rfd::FileDialog::new();
    if let Some(t) = &opts.title {
        dlg = dlg.set_title(t);
    }
    if let Some(p) = &opts.default_path {
        dlg = dlg.set_directory(p);
    }
    for f in &opts.filters {
        let exts: Vec<&str> = f.extensions.iter().map(|s| s.as_str()).collect();
        dlg = dlg.add_filter(&f.name, &exts);
    }

    let paths: Vec<String> = match (is_dir, multi) {
        (true, true) => dlg
            .pick_folders()
            .unwrap_or_default()
            .into_iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect(),
        (true, false) => dlg
            .pick_folder()
            .map(|p| vec![p.to_string_lossy().to_string()])
            .unwrap_or_default(),
        (false, true) => dlg
            .pick_files()
            .unwrap_or_default()
            .into_iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect(),
        (false, false) => dlg
            .pick_file()
            .map(|p| vec![p.to_string_lossy().to_string()])
            .unwrap_or_default(),
    };

    serde_json::json!({
        "canceled": paths.is_empty(),
        "filePaths": paths,
    })
}

fn save_dialog(opts: protocol::SaveDialogOptions) -> serde_json::Value {
    let mut dlg = rfd::FileDialog::new();
    if let Some(t) = &opts.title {
        dlg = dlg.set_title(t);
    }
    if let Some(p) = &opts.default_path {
        dlg = dlg.set_file_name(p);
    }
    for f in &opts.filters {
        let exts: Vec<&str> = f.extensions.iter().map(|s| s.as_str()).collect();
        dlg = dlg.add_filter(&f.name, &exts);
    }
    match dlg.save_file() {
        Some(p) => serde_json::json!({ "canceled": false, "filePath": p.to_string_lossy() }),
        None => serde_json::json!({ "canceled": true }),
    }
}

fn register_hotkey(state: &mut AppState, id: &str, accelerator: &str) -> Result<()> {
    use std::str::FromStr;
    let mgr = state.hotkey_manager.as_ref().ok_or_else(|| anyhow!("hotkey manager unavailable"))?;
    let hk = global_hotkey::hotkey::HotKey::from_str(accelerator)
        .map_err(|e| anyhow!("invalid accelerator: {e}"))?;
    mgr.register(hk.clone()).map_err(|e| anyhow!("register failed: {e}"))?;
    state.hotkeys.insert(id.to_string(), hk);
    Ok(())
}

fn show_notification(options: protocol::NotificationOptions) {
    #[cfg(target_os = "macos")]
    {
        let title = applescript_str(&options.title);
        let body = applescript_str(options.body.as_deref().unwrap_or(""));
        let subtitle = options
            .subtitle
            .as_deref()
            .map(|s| format!(" subtitle {}", applescript_str(s)))
            .unwrap_or_default();
        let script = format!("display notification {body} with title {title}{subtitle}");
        let _ = Command::new("osascript").args(["-e", &script]).status();
    }
    #[cfg(not(target_os = "macos"))]
    {
        let mut n = notify_rust::Notification::new();
        n.summary(&options.title);
        if let Some(b) = &options.body {
            n.body(b);
        }
        let _ = n.show();
    }
}

#[cfg(target_os = "macos")]
fn applescript_str(s: &str) -> String {
    format!("\"{}\"", s.replace('\\', "\\\\").replace('"', "\\\""))
}
