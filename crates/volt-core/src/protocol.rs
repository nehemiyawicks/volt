// SPDX-License-Identifier: Apache-2.0

use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(tag = "cmd")]
pub enum Command {
    #[serde(rename = "window.create")]
    CreateWindow { options: WindowOptions, reply_id: String },
    #[serde(rename = "window.loadUrl")]
    LoadUrl { window_id: u64, url: String, reply_id: String },
    #[serde(rename = "window.loadHtml")]
    LoadHtml { window_id: u64, html: String, reply_id: String },
    #[serde(rename = "window.close")]
    CloseWindow { window_id: u64, reply_id: String },
    #[serde(rename = "window.show")]
    ShowWindow { window_id: u64, reply_id: String },
    #[serde(rename = "window.hide")]
    HideWindow { window_id: u64, reply_id: String },
    #[serde(rename = "window.focus")]
    FocusWindow { window_id: u64, reply_id: String },
    #[serde(rename = "window.minimize")]
    MinimizeWindow { window_id: u64, reply_id: String },
    #[serde(rename = "window.maximize")]
    MaximizeWindow { window_id: u64, reply_id: String },
    #[serde(rename = "window.unmaximize")]
    UnmaximizeWindow { window_id: u64, reply_id: String },
    #[serde(rename = "window.setTitle")]
    SetTitle { window_id: u64, title: String, reply_id: String },
    #[serde(rename = "window.setBounds")]
    SetBounds { window_id: u64, bounds: Bounds, reply_id: String },
    #[serde(rename = "window.getBounds")]
    GetBounds { window_id: u64, reply_id: String },
    #[serde(rename = "window.setAlwaysOnTop")]
    SetAlwaysOnTop { window_id: u64, flag: bool, reply_id: String },
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
    #[serde(rename = "menu.setApplicationMenu")]
    SetApplicationMenu { template: Vec<MenuItemSpec>, reply_id: String },
    #[serde(rename = "clipboard.readText")]
    ClipboardReadText { reply_id: String },
    #[serde(rename = "clipboard.writeText")]
    ClipboardWriteText { text: String, reply_id: String },
    #[serde(rename = "globalShortcut.register")]
    GlobalShortcutRegister { id: String, accelerator: String, reply_id: String },
    #[serde(rename = "globalShortcut.unregister")]
    GlobalShortcutUnregister { id: String, reply_id: String },
    #[serde(rename = "globalShortcut.unregisterAll")]
    GlobalShortcutUnregisterAll { reply_id: String },
    #[serde(rename = "app.beforeQuit")]
    AppBeforeQuit { reply_id: String },
    #[serde(rename = "tray.create")]
    TrayCreate {
        id: String,
        icon_path: Option<String>,
        tooltip: Option<String>,
        menu: Vec<MenuItemSpec>,
        reply_id: String,
    },
    #[serde(rename = "tray.setToolTip")]
    TraySetToolTip { id: String, tooltip: String, reply_id: String },
    #[serde(rename = "tray.setContextMenu")]
    TraySetContextMenu { id: String, menu: Vec<MenuItemSpec>, reply_id: String },
    #[serde(rename = "tray.destroy")]
    TrayDestroy { id: String, reply_id: String },
    #[serde(rename = "webContents.executeJavaScript")]
    ExecuteJavaScript { window_id: u64, code: String, reply_id: String },
    #[serde(rename = "webContents.openDevTools")]
    OpenDevTools { window_id: u64, reply_id: String },
    #[serde(rename = "webContents.closeDevTools")]
    CloseDevTools { window_id: u64, reply_id: String },
    #[serde(rename = "webContents.toggleDevTools")]
    ToggleDevTools { window_id: u64, reply_id: String },
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MenuItemSpec {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default, rename = "type")]
    pub kind: Option<String>,
    #[serde(default)]
    pub role: Option<String>,
    #[serde(default)]
    pub accelerator: Option<String>,
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub submenu: Vec<MenuItemSpec>,
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
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub resizable: Option<bool>,
    pub minimizable: Option<bool>,
    pub maximizable: Option<bool>,
    pub always_on_top: Option<bool>,
    pub frame: Option<bool>,
    pub transparent: Option<bool>,
    pub show: Option<bool>,
    pub url: Option<String>,
    pub html: Option<String>,
    #[serde(default)]
    pub web_preferences: Option<WebPreferences>,
}

#[derive(Debug, Deserialize)]
pub struct Bounds {
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub width: Option<f64>,
    pub height: Option<f64>,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WebPreferences {
    #[serde(default)]
    pub preload: Option<String>,
    #[serde(default)]
    pub context_isolation: Option<bool>,
    #[serde(default)]
    pub node_integration: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MessageBoxOptions {
    pub message: String,
    #[serde(default)]
    pub title: Option<String>,
    #[serde(default)]
    pub buttons: Option<Vec<String>>,
    #[serde(default)]
    pub detail: Option<String>,
    #[serde(default, rename = "type")]
    pub kind: Option<String>,
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
    #[serde(rename = "window.focus")]
    WindowFocus { id: u64 },
    #[serde(rename = "window.blur")]
    WindowBlur { id: u64 },
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
    #[serde(rename = "menu.click")]
    MenuClick { id: String },
    #[serde(rename = "globalShortcut.click")]
    GlobalShortcutClick { id: String },
    #[serde(rename = "tray.click")]
    TrayClick { id: String },
    #[serde(rename = "app.activate")]
    AppActivate { has_visible_windows: bool },
}
