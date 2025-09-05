#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod theme;
mod mods;
mod greet;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet::greet, theme::set_theme, mods::list_mods])
        .setup(|app| {
            #[cfg(target_os = "windows")]
            {
                if let Some(window) = app.get_webview_window("main") {
                    // 应用启动时启用 Mica Alt
                    theme::enable_mica_alt(&window);
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("运行 Tauri 失败");
}
