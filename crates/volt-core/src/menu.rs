// SPDX-License-Identifier: Apache-2.0

use anyhow::Result;
use muda::{
    accelerator::Accelerator, AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu,
};
use std::str::FromStr;

use crate::protocol::MenuItemSpec;

pub fn build_menu(template: &[MenuItemSpec]) -> Result<Menu> {
    let menu = Menu::new();
    for spec in template {
        attach(&menu, spec)?;
    }
    Ok(menu)
}

pub fn build_submenu_as_menu(template: &[MenuItemSpec]) -> Result<Menu> {
    build_menu(template)
}

fn attach(parent: &Menu, spec: &MenuItemSpec) -> Result<()> {
    if !spec.submenu.is_empty() {
        let sub = Submenu::new(spec.label.as_deref().unwrap_or(""), spec.enabled.unwrap_or(true));
        for child in &spec.submenu {
            attach_sub(&sub, child)?;
        }
        parent.append(&sub)?;
    } else {
        parent.append(&*item(spec)?)?;
    }
    Ok(())
}

fn attach_sub(parent: &Submenu, spec: &MenuItemSpec) -> Result<()> {
    if !spec.submenu.is_empty() {
        let sub = Submenu::new(spec.label.as_deref().unwrap_or(""), spec.enabled.unwrap_or(true));
        for child in &spec.submenu {
            attach_sub(&sub, child)?;
        }
        parent.append(&sub)?;
    } else {
        parent.append(&*item(spec)?)?;
    }
    Ok(())
}

fn item(spec: &MenuItemSpec) -> Result<Box<dyn muda::IsMenuItem>> {
    if spec.kind.as_deref() == Some("separator") {
        return Ok(Box::new(PredefinedMenuItem::separator()));
    }
    if let Some(role) = spec.role.as_deref() {
        return Ok(predefined(role, spec.label.as_deref()));
    }
    let label = spec.label.as_deref().unwrap_or("");
    let enabled = spec.enabled.unwrap_or(true);
    let accel = spec
        .accelerator
        .as_deref()
        .and_then(|s| Accelerator::from_str(s).ok());
    let id = spec.id.clone().unwrap_or_default();
    Ok(Box::new(MenuItem::with_id(id, label, enabled, accel)))
}

fn predefined(role: &str, label: Option<&str>) -> Box<dyn muda::IsMenuItem> {
    let l = label;
    match role {
        "quit" => Box::new(PredefinedMenuItem::quit(l)),
        "close" | "closeWindow" => Box::new(PredefinedMenuItem::close_window(l)),
        "minimize" => Box::new(PredefinedMenuItem::minimize(l)),
        "hide" => Box::new(PredefinedMenuItem::hide(l)),
        "hideOthers" => Box::new(PredefinedMenuItem::hide_others(l)),
        "unhide" | "showAll" => Box::new(PredefinedMenuItem::show_all(l)),
        "about" => Box::new(PredefinedMenuItem::about(l, Some(AboutMetadata::default()))),
        "services" => Box::new(PredefinedMenuItem::services(l)),
        "separator" => Box::new(PredefinedMenuItem::separator()),
        "cut" => Box::new(PredefinedMenuItem::cut(l)),
        "copy" => Box::new(PredefinedMenuItem::copy(l)),
        "paste" => Box::new(PredefinedMenuItem::paste(l)),
        "selectAll" | "selectall" => Box::new(PredefinedMenuItem::select_all(l)),
        "undo" => Box::new(PredefinedMenuItem::undo(l)),
        "redo" => Box::new(PredefinedMenuItem::redo(l)),
        "togglefullscreen" | "toggleFullscreen" => Box::new(PredefinedMenuItem::fullscreen(l)),
        _ => Box::new(MenuItem::new(l.unwrap_or(role), true, None)),
    }
}
