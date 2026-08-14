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

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageBoxOptions {
    pub message: String,
    pub title: Option<String>,
    pub buttons: Option<Vec<String>>,
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
}
