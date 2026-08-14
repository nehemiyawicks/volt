// SPDX-License-Identifier: Apache-2.0

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(tag = "cmd")]
pub enum Command {
    #[serde(rename = "window.create")]
    CreateWindow { options: WindowOptions, reply_id: String },
    #[serde(rename = "window.loadUrl")]
    LoadUrl { window_id: u64, url: String, reply_id: String },
    #[serde(rename = "window.close")]
    CloseWindow { window_id: u64, reply_id: String },
    #[serde(rename = "app.quit")]
    Quit,
    #[serde(rename = "dialog.showMessageBox")]
    ShowMessageBox { options: MessageBoxOptions, reply_id: String },
    #[serde(rename = "dialog.showOpenDialog")]
    ShowOpenDialog { options: OpenDialogOptions, reply_id: String },
    #[serde(rename = "dialog.showSaveDialog")]
    ShowSaveDialog { options: SaveDialogOptions, reply_id: String },
    #[serde(rename = "ipc.result")]
    IpcResult {
        window_id: u64,
        invoke_id: String,
        value: serde_json::Value,
        error: Option<String>,
    },
    #[serde(rename = "webContents.send")]
    WebContentsSend {
        window_id: u64,
        channel: String,
        args: Vec<serde_json::Value>,
    },
    #[serde(rename = "shell.openExternal")]
    ShellOpenExternal { url: String, reply_id: String },
    #[serde(rename = "notification.show")]
    NotificationShow { options: NotificationOptions, reply_id: String },
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationOptions {
    pub title: String,
    #[serde(default)]
    pub body: Option<String>,
    #[serde(default)]
    pub subtitle: Option<String>,
    #[serde(default)]
    pub silent: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowOptions {
    pub title: Option<String>,
    pub width: Option<f64>,
    pub height: Option<f64>,
    pub resizable: Option<bool>,
    pub url: Option<String>,
    pub html: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageBoxOptions {
    pub message: String,
    pub title: Option<String>,
    pub buttons: Option<Vec<String>>,
    #[serde(default)]
    pub detail: Option<String>,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct OpenDialogOptions {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub default_path: Option<String>,
    #[serde(default)]
    pub button_label: Option<String>,
    #[serde(default)]
    pub filters: Vec<FileFilter>,
    #[serde(default)]
    pub properties: Vec<String>,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct SaveDialogOptions {
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub default_path: Option<String>,
    #[serde(default)]
    pub button_label: Option<String>,
    #[serde(default)]
    pub filters: Vec<FileFilter>,
}

#[derive(Debug, Deserialize)]
pub struct FileFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "event")]
pub enum Event {
    #[serde(rename = "ready")]
    Ready,
    #[serde(rename = "window.closed")]
    WindowClosed { id: u64 },
    #[serde(rename = "app.allWindowsClosed")]
    AllWindowsClosed,
    #[serde(rename = "reply")]
    Reply { reply_id: String, value: serde_json::Value },
    #[serde(rename = "ipc.invoke")]
    IpcInvoke {
        window_id: u64,
        invoke_id: String,
        channel: String,
        args: Vec<serde_json::Value>,
    },
}
