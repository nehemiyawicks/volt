// SPDX-License-Identifier: Apache-2.0
//
// Chromium/CDP host process for volt. Same stdio JSON protocol as volt-core
// but routes window/webview commands through a spawned Chromium via CDP.

use anyhow::{anyhow, Context, Result};
use serde::Deserialize;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use tokio::sync::mpsc;

use volt_cdp::{CdpSession, LaunchOptions};
use volt_core::protocol::{Command as JsCommand, Event as JsEvent};

#[derive(Debug, Deserialize)]
struct Manifest {
    entry: String,
    #[serde(default)]
    runtime: Option<String>,
    #[serde(default)]
    #[allow(dead_code)]
    name: Option<String>,
    #[serde(default)]
    #[allow(dead_code)]
    engine: Option<String>,
}

fn main() -> Result<()> {
    let runtime = tokio::runtime::Runtime::new()?;
    runtime.block_on(run())
}

async fn run() -> Result<()> {
    let manifest = load_manifest()?;
    eprintln!("[volt-core-chromium] engine: chromium; entry: {}", manifest.entry);

    let user_data_dir = std::env::temp_dir().join(format!(
        "volt-cdp-{}",
        manifest.name.clone().unwrap_or_else(|| "app".into())
    ));
    let cdp = CdpSession::start(LaunchOptions {
        user_data_dir,
        headless: std::env::var("VOLT_HEADLESS").is_ok(),
        extra_args: vec![
            "--no-first-run".into(),
            "--no-default-browser-check".into(),
        ],
    })
    .await
    .context("start chromium session")?;

    let (cmd_tx, mut cmd_rx) = mpsc::unbounded_channel::<JsCommand>();
    let (event_tx, event_rx) = std::sync::mpsc::channel::<JsEvent>();

    let child = spawn_js_runtime(&manifest, cmd_tx)?;
    std::thread::spawn(move || pump_events_to_js(child.stdin, event_rx));

    let _ = event_tx.send(JsEvent::Ready);

    while let Some(cmd) = cmd_rx.recv().await {
        if let Err(err) = handle_command(cmd, &cdp, &event_tx).await {
            eprintln!("[volt-core-chromium] {err:#}");
        }
    }

    let _ = cdp.close().await;
    Ok(())
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

fn spawn_js_runtime(
    manifest: &Manifest,
    tx: mpsc::UnboundedSender<JsCommand>,
) -> Result<ChildHandles> {
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
        .env("VOLT_ENGINE", "chromium")
        .spawn()
        .with_context(|| format!("spawn {runtime} {}", manifest.entry))?;

    let stdout = child.stdout.take().ok_or_else(|| anyhow!("no stdout"))?;
    let stdin = child.stdin.take().ok_or_else(|| anyhow!("no stdin"))?;

    std::thread::spawn(move || {
        let reader = BufReader::new(stdout);
        for line in reader.lines() {
            let Ok(line) = line else { break };
            if line.trim().is_empty() {
                continue;
            }
            match serde_json::from_str::<JsCommand>(&line) {
                Ok(cmd) => {
                    if tx.send(cmd).is_err() {
                        break;
                    }
                }
                Err(err) => eprintln!("[volt-core-chromium] bad message: {err}: {line}"),
            }
        }
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

fn pump_events_to_js(
    mut stdin: std::process::ChildStdin,
    rx: std::sync::mpsc::Receiver<JsEvent>,
) {
    while let Ok(ev) = rx.recv() {
        let Ok(mut line) = serde_json::to_string(&ev) else { continue };
        line.push('\n');
        if stdin.write_all(line.as_bytes()).is_err() {
            break;
        }
        let _ = stdin.flush();
    }
}

async fn handle_command(
    cmd: JsCommand,
    cdp: &CdpSession,
    event_tx: &std::sync::mpsc::Sender<JsEvent>,
) -> Result<()> {
    match cmd {
        JsCommand::CreateWindow { options, reply_id } => {
            let id = fastrand_u64();
            let url = options.url.as_deref();
            let html = options.html.as_deref();
            if let Some(html) = html {
                cdp.create_window(id, None).await?;
                cdp.load_html(id, html).await?;
            } else {
                cdp.create_window(id, url).await?;
            }
            event_tx.send(JsEvent::Reply {
                reply_id,
                value: serde_json::json!({ "id": id }),
            })?;
        }
        JsCommand::LoadUrl { window_id, url, reply_id } => {
            cdp.load_url(window_id, &url).await?;
            event_tx.send(JsEvent::Reply { reply_id, value: serde_json::Value::Null })?;
        }
        JsCommand::LoadHtml { window_id, html, reply_id } => {
            cdp.load_html(window_id, &html).await?;
            event_tx.send(JsEvent::Reply { reply_id, value: serde_json::Value::Null })?;
        }
        JsCommand::CloseWindow { window_id, reply_id } => {
            cdp.close_window(window_id).await?;
            event_tx.send(JsEvent::Reply { reply_id, value: serde_json::Value::Null })?;
        }
        JsCommand::ExecuteJavaScript { window_id, code, reply_id } => {
            let value = cdp.evaluate(window_id, &code).await.unwrap_or(serde_json::Value::Null);
            event_tx.send(JsEvent::Reply {
                reply_id,
                value: serde_json::json!({ "value": value }),
            })?;
        }
        JsCommand::Quit => {
            cdp.close().await?;
            std::process::exit(0);
        }
        _ => {
            // Most other commands (Menu, Tray, Dialog, ...) are OS-level and don't
            // need the renderer. In v0.9 we route them to the same native code the
            // wry backend uses. For now, ack no-op so the JS side stops waiting.
            reply_unknown(&cmd, event_tx)?;
        }
    }
    Ok(())
}

fn reply_unknown(cmd: &JsCommand, event_tx: &std::sync::mpsc::Sender<JsEvent>) -> Result<()> {
    if let Some(reply_id) = extract_reply_id(cmd) {
        event_tx.send(JsEvent::Reply {
            reply_id,
            value: serde_json::Value::Null,
        })?;
    }
    Ok(())
}

fn extract_reply_id(cmd: &JsCommand) -> Option<String> {
    match cmd {
        JsCommand::ShowMessageBox { reply_id, .. }
        | JsCommand::ShowOpenDialog { reply_id, .. }
        | JsCommand::ShowSaveDialog { reply_id, .. }
        | JsCommand::ShowWindow { reply_id, .. }
        | JsCommand::HideWindow { reply_id, .. }
        | JsCommand::FocusWindow { reply_id, .. }
        | JsCommand::MinimizeWindow { reply_id, .. }
        | JsCommand::MaximizeWindow { reply_id, .. }
        | JsCommand::UnmaximizeWindow { reply_id, .. }
        | JsCommand::SetTitle { reply_id, .. }
        | JsCommand::SetBounds { reply_id, .. }
        | JsCommand::GetBounds { reply_id, .. }
        | JsCommand::SetAlwaysOnTop { reply_id, .. }
        | JsCommand::SetFullScreen { reply_id, .. }
        | JsCommand::ShellOpenExternal { reply_id, .. }
        | JsCommand::NotificationShow { reply_id, .. }
        | JsCommand::SetApplicationMenu { reply_id, .. }
        | JsCommand::ClipboardReadText { reply_id, .. }
        | JsCommand::ClipboardWriteText { reply_id, .. }
        | JsCommand::GlobalShortcutRegister { reply_id, .. }
        | JsCommand::GlobalShortcutUnregister { reply_id, .. }
        | JsCommand::GlobalShortcutUnregisterAll { reply_id, .. }
        | JsCommand::AppBeforeQuit { reply_id, .. }
        | JsCommand::TrayCreate { reply_id, .. }
        | JsCommand::TraySetToolTip { reply_id, .. }
        | JsCommand::TraySetContextMenu { reply_id, .. }
        | JsCommand::TrayDestroy { reply_id, .. }
        | JsCommand::ScreenGetPrimaryDisplay { reply_id, .. }
        | JsCommand::ScreenGetAllDisplays { reply_id, .. }
        | JsCommand::NativeThemeShouldUseDarkColors { reply_id, .. }
        | JsCommand::OpenDevTools { reply_id, .. }
        | JsCommand::CloseDevTools { reply_id, .. }
        | JsCommand::ToggleDevTools { reply_id, .. }
        | JsCommand::SetNewWindowOpenPolicy { reply_id, .. } => Some(reply_id.clone()),
        _ => None,
    }
}

fn fastrand_u64() -> u64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos() as u64)
        .unwrap_or(1)
}
