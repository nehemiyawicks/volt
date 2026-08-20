// SPDX-License-Identifier: Apache-2.0

use anyhow::{anyhow, Context, Result};
use chromiumoxide::browser::{Browser, BrowserConfig};
use chromiumoxide::cdp::browser_protocol::target::CreateTargetParams;
use chromiumoxide::page::Page;
use futures::StreamExt;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;

use crate::launch::{find_chromium, LaunchOptions};

pub struct CdpSession {
    browser: Arc<Mutex<Browser>>,
    pages: Arc<Mutex<HashMap<u64, Page>>>,
}

impl CdpSession {
    pub async fn start(opts: LaunchOptions) -> Result<Self> {
        let launch = find_chromium()?;
        let mut cfg = BrowserConfig::builder()
            .chrome_executable(launch.binary)
            .user_data_dir(&opts.user_data_dir);

        if !opts.headless {
            cfg = cfg.with_head();
        }
        for a in &opts.extra_args {
            cfg = cfg.arg(a);
        }

        let cfg = cfg.build().map_err(|e| anyhow!("BrowserConfig: {e}"))?;
        let (browser, mut handler) = Browser::launch(cfg).await.context("launch chromium")?;

        tokio::spawn(async move {
            while let Some(h) = handler.next().await {
                if h.is_err() {
                    break;
                }
            }
        });

        Ok(Self {
            browser: Arc::new(Mutex::new(browser)),
            pages: Arc::new(Mutex::new(HashMap::new())),
        })
    }

    pub async fn create_window(&self, id: u64, url: Option<&str>) -> Result<()> {
        let target = CreateTargetParams::new(url.unwrap_or("about:blank"));
        let page = self.browser.lock().await.new_page(target).await?;
        self.pages.lock().await.insert(id, page);
        Ok(())
    }

    pub async fn load_url(&self, id: u64, url: &str) -> Result<()> {
        let pages = self.pages.lock().await;
        let page = pages.get(&id).ok_or_else(|| anyhow!("no page {id}"))?;
        page.goto(url).await?;
        Ok(())
    }

    pub async fn load_html(&self, id: u64, html: &str) -> Result<()> {
        let pages = self.pages.lock().await;
        let page = pages.get(&id).ok_or_else(|| anyhow!("no page {id}"))?;
        let data_url = format!(
            "data:text/html;base64,{}",
            base64_encode(html.as_bytes())
        );
        page.goto(&data_url).await?;
        Ok(())
    }

    pub async fn evaluate(&self, id: u64, script: &str) -> Result<serde_json::Value> {
        let pages = self.pages.lock().await;
        let page = pages.get(&id).ok_or_else(|| anyhow!("no page {id}"))?;
        let value = page.evaluate(script).await?.into_value::<serde_json::Value>()
            .unwrap_or(serde_json::Value::Null);
        Ok(value)
    }

    pub async fn close_window(&self, id: u64) -> Result<()> {
        let mut pages = self.pages.lock().await;
        if let Some(page) = pages.remove(&id) {
            let _ = page.close().await;
        }
        Ok(())
    }

    pub async fn close(&self) -> Result<()> {
        let mut pages = self.pages.lock().await;
        for (_, page) in pages.drain() {
            let _ = page.close().await;
        }
        let _ = self.browser.lock().await.close().await;
        Ok(())
    }
}

fn base64_encode(bytes: &[u8]) -> String {
    const CHARSET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity((bytes.len() + 2) / 3 * 4);
    let mut i = 0;
    while i + 3 <= bytes.len() {
        let n = ((bytes[i] as u32) << 16) | ((bytes[i + 1] as u32) << 8) | (bytes[i + 2] as u32);
        out.push(CHARSET[((n >> 18) & 63) as usize] as char);
        out.push(CHARSET[((n >> 12) & 63) as usize] as char);
        out.push(CHARSET[((n >> 6) & 63) as usize] as char);
        out.push(CHARSET[(n & 63) as usize] as char);
        i += 3;
    }
    match bytes.len() - i {
        1 => {
            let n = (bytes[i] as u32) << 16;
            out.push(CHARSET[((n >> 18) & 63) as usize] as char);
            out.push(CHARSET[((n >> 12) & 63) as usize] as char);
            out.push('=');
            out.push('=');
        }
        2 => {
            let n = ((bytes[i] as u32) << 16) | ((bytes[i + 1] as u32) << 8);
            out.push(CHARSET[((n >> 18) & 63) as usize] as char);
            out.push(CHARSET[((n >> 12) & 63) as usize] as char);
            out.push(CHARSET[((n >> 6) & 63) as usize] as char);
            out.push('=');
        }
        _ => {}
    }
    out
}
