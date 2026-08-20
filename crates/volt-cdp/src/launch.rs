// SPDX-License-Identifier: Apache-2.0

use anyhow::{anyhow, Result};
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct LaunchOptions {
    pub user_data_dir: PathBuf,
    pub headless: bool,
    pub extra_args: Vec<String>,
}

#[derive(Debug)]
pub struct ChromiumLaunch {
    pub binary: PathBuf,
    pub version: Option<String>,
}

pub fn find_chromium() -> Result<ChromiumLaunch> {
    if let Ok(path) = std::env::var("VOLT_CHROMIUM_BIN") {
        let p = PathBuf::from(&path);
        if p.is_file() {
            return Ok(ChromiumLaunch { binary: p, version: None });
        }
        return Err(anyhow!("VOLT_CHROMIUM_BIN set but not a file: {path}"));
    }

    let candidates = default_candidates();
    for c in candidates {
        if c.is_file() {
            return Ok(ChromiumLaunch { binary: c, version: None });
        }
    }

    Err(anyhow!(
        "No Chromium found. Options: install Google Chrome, or set VOLT_CHROMIUM_BIN to a Chromium binary path."
    ))
}

#[cfg(target_os = "macos")]
fn default_candidates() -> Vec<PathBuf> {
    vec![
        PathBuf::from("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
        PathBuf::from("/Applications/Chromium.app/Contents/MacOS/Chromium"),
        PathBuf::from("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
        PathBuf::from("/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"),
    ]
}

#[cfg(target_os = "linux")]
fn default_candidates() -> Vec<PathBuf> {
    vec![
        PathBuf::from("/usr/bin/google-chrome"),
        PathBuf::from("/usr/bin/google-chrome-stable"),
        PathBuf::from("/usr/bin/chromium"),
        PathBuf::from("/usr/bin/chromium-browser"),
        PathBuf::from("/usr/bin/microsoft-edge"),
    ]
}

#[cfg(target_os = "windows")]
fn default_candidates() -> Vec<PathBuf> {
    vec![
        PathBuf::from(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
        PathBuf::from(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
        PathBuf::from(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"),
    ]
}
