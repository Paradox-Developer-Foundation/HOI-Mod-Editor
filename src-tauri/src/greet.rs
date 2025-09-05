#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("你好, {}! 来自 Rust 核心的问候~", name)
}

