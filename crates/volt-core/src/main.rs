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
use tao::event_loop::{ControlFlow, EventLoop, EventLoopProxy};
use tao::window::{Window, WindowBuilder, WindowId};
use wry::{WebView, WebViewBuilder};

mod protocol;
use protocol::{Command as JsCommand, Event as JsEvent};

struct AppState {
    windows: HashMap<u64, WindowSlot>,
    next_window_id: u64,
    tx_to_js: Sender<JsEvent>,
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
    let event_loop: EventLoop<HostEvent> = EventLoop::with_user_event();
    let proxy = event_loop.create_proxy();

    let (tx_to_js, rx_to_js) = channel::<JsEvent>();
    let child = spawn_js_runtime(&manifest, proxy.clone())?;
    thread::spawn(move || pump_events_to_js(child.stdin, rx_to_js));

    let mut state = AppState {
        windows: HashMap::new(),
        next_window_id: 1,
        tx_to_js,
    };
    let _ = state.tx_to_js.send(JsEvent::Ready);

    event_loop.run(move |event, target, control_flow| {
        *control_flow = ControlFlow::Wait;
        match event {
            Event::UserEvent(HostEvent::Command(cmd)) => {
                if let Err(err) = handle_command(cmd, &mut state, target) {
                    eprintln!("[volt-core] {err:#}");
                }
            }
            Event::UserEvent(HostEvent::ChildExited) => *control_flow = ControlFlow::Exit,
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                window_id,
                ..
            } => {
                let key = state
                    .windows
                    .iter()
                    .find(|(_, s)| s.tao_id == window_id)
                    .map(|(k, _)| *k);
                if let Some(k) = key {
                    state.windows.remove(&k);
                    let _ = state.tx_to_js.send(JsEvent::WindowClosed { id: k });
                }
                if state.windows.is_empty() {
                    let _ = state.tx_to_js.send(JsEvent::AllWindowsClosed);
                }
            }
            _ => {}
        }
    });
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
    let mut child = Command::new(&runtime)
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
    target: &tao::event_loop::EventLoopWindowTarget<HostEvent>,
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
            if let Some(false) = options.resizable {
                builder = builder.with_resizable(false);
            }
            let window = builder.build(target)?;
            let tao_id = window.id();

            let wv = WebViewBuilder::new(&window);
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
            state.tx_to_js.send(JsEvent::Reply {
                reply_id,
                value: serde_json::Value::Null,
            })?;
        }
        JsCommand::CloseWindow { window_id, reply_id } => {
            state.windows.remove(&window_id);
            state.tx_to_js.send(JsEvent::Reply {
                reply_id,
                value: serde_json::Value::Null,
            })?;
        }
        JsCommand::Quit => state.windows.clear(),
        JsCommand::ShowMessageBox { options, reply_id } => {
            let response = native_message_box(&options);
            state.tx_to_js.send(JsEvent::Reply {
                reply_id,
                value: serde_json::json!({ "response": response, "checkboxChecked": false }),
            })?;
        }
    }
    Ok(())
}

fn native_message_box(opts: &protocol::MessageBoxOptions) -> u32 {
    #[cfg(target_os = "macos")]
    {
        let title = opts.title.clone().unwrap_or_else(|| "Volt".into());
        let script = format!(
            "display dialog {msg} with title {ttl} buttons {btns} default button 1",
            msg = as_applescript_str(&opts.message),
            ttl = as_applescript_str(&title),
            btns = as_applescript_button_list(opts.buttons.as_deref().unwrap_or(&["OK".into()])),
        );
        let _ = Command::new("osascript").args(["-e", &script]).status();
        return 0;
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = opts;
        eprintln!("[volt-core] message box not implemented on this platform");
        0
    }
}

#[cfg(target_os = "macos")]
fn as_applescript_str(s: &str) -> String {
    format!("\"{}\"", s.replace('\\', "\\\\").replace('"', "\\\""))
}

#[cfg(target_os = "macos")]
fn as_applescript_button_list(buttons: &[String]) -> String {
    let parts: Vec<String> = buttons.iter().map(|b| as_applescript_str(b)).collect();
    format!("{{{}}}", parts.join(", "))
}
