// SPDX-License-Identifier: Apache-2.0

use serde_json::json;
use volt_core::protocol;

#[test]
fn create_window_command_deserializes() {
    let raw = r#"{"cmd":"window.create","options":{"title":"t","width":800,"height":600},"reply_id":"r1"}"#;
    let cmd: protocol::Command = serde_json::from_str(raw).unwrap();
    match cmd {
        protocol::Command::CreateWindow { options, reply_id } => {
            assert_eq!(options.title.as_deref(), Some("t"));
            assert_eq!(options.width, Some(800.0));
            assert_eq!(reply_id, "r1");
        }
        _ => panic!("wrong variant"),
    }
}

#[test]
fn ipc_result_carries_error() {
    let raw = r#"{"cmd":"ipc.result","window_id":3,"invoke_id":"i7","value":null,"error":"boom"}"#;
    let cmd: protocol::Command = serde_json::from_str(raw).unwrap();
    match cmd {
        protocol::Command::IpcResult { window_id, invoke_id, error, .. } => {
            assert_eq!(window_id, 3);
            assert_eq!(invoke_id, "i7");
            assert_eq!(error.as_deref(), Some("boom"));
        }
        _ => panic!("wrong variant"),
    }
}

#[test]
fn menu_template_deserializes_with_submenu() {
    let raw = json!({
        "cmd": "menu.setApplicationMenu",
        "template": [
            { "label": "File", "submenu": [{ "role": "quit" }] }
        ],
        "reply_id": "r1"
    })
    .to_string();
    let cmd: protocol::Command = serde_json::from_str(&raw).unwrap();
    if let protocol::Command::SetApplicationMenu { template, .. } = cmd {
        assert_eq!(template.len(), 1);
        assert_eq!(template[0].label.as_deref(), Some("File"));
        assert_eq!(template[0].submenu.len(), 1);
        assert_eq!(template[0].submenu[0].role.as_deref(), Some("quit"));
    } else {
        panic!("wrong variant");
    }
}

#[test]
fn reply_event_serializes() {
    let ev = protocol::Event::Reply {
        reply_id: "r1".into(),
        value: json!({ "id": 42 }),
    };
    let s = serde_json::to_string(&ev).unwrap();
    assert!(s.contains("\"event\":\"reply\""));
    assert!(s.contains("\"reply_id\":\"r1\""));
    assert!(s.contains("\"id\":42"));
}

#[test]
fn menu_click_event_serializes() {
    let ev = protocol::Event::MenuClick { id: "mi_1".into() };
    let s = serde_json::to_string(&ev).unwrap();
    assert!(s.contains("\"event\":\"menu.click\""));
    assert!(s.contains("\"id\":\"mi_1\""));
}

#[test]
fn unknown_command_is_rejected() {
    let raw = r#"{"cmd":"nope"}"#;
    let r: Result<protocol::Command, _> = serde_json::from_str(raw);
    assert!(r.is_err());
}
