// SPDX-License-Identifier: Apache-2.0

use anyhow::{anyhow, Result};
use tray_icon::{Icon, TrayIcon, TrayIconBuilder};

use crate::menu::build_submenu_as_menu;

pub fn create(
    id: &str,
    icon_path: Option<&str>,
    tooltip: Option<&str>,
    menu: &[crate::protocol::MenuItemSpec],
) -> Result<TrayIcon> {
    let icon = load_icon(icon_path)?;
    let mut b = TrayIconBuilder::new().with_id(id.to_string()).with_icon(icon);
    if let Some(t) = tooltip {
        b = b.with_tooltip(t);
    }
    if !menu.is_empty() {
        b = b.with_menu(Box::new(build_submenu_as_menu(menu)?));
    }
    Ok(b.build()?)
}

fn load_icon(path: Option<&str>) -> Result<Icon> {
    if let Some(p) = path {
        return load_png(p);
    }
    default_icon()
}

fn load_png(path: &str) -> Result<Icon> {
    let bytes = std::fs::read(path)?;
    let img = image::load_from_memory(&bytes)
        .map_err(|e| anyhow!("decode icon {path}: {e}"))?
        .to_rgba8();
    let (w, h) = img.dimensions();
    Icon::from_rgba(img.into_raw(), w, h).map_err(|e| anyhow!("icon: {e}"))
}

fn default_icon() -> Result<Icon> {
    let (w, h) = (16u32, 16u32);
    let mut rgba = vec![0u8; (w * h * 4) as usize];
    for pixel in rgba.chunks_exact_mut(4) {
        pixel[0] = 0x60;
        pixel[1] = 0x60;
        pixel[2] = 0x60;
        pixel[3] = 0xff;
    }
    Icon::from_rgba(rgba, w, h).map_err(|e| anyhow!("default icon: {e}"))
}
