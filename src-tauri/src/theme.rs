use tauri::Manager;

#[cfg(target_os = "windows")]
use windows::Win32::Graphics::Dwm::{DwmSetWindowAttribute, DWMWINDOWATTRIBUTE, DWMWA_SYSTEMBACKDROP_TYPE, DWMWA_USE_IMMERSIVE_DARK_MODE};
#[cfg(target_os = "windows")]
use windows::Win32::Foundation::HWND;

#[cfg(target_os = "windows")]
pub(crate) fn enable_mica_alt(window: &tauri::WebviewWindow) {
    use std::ffi::c_void;
    unsafe {
        let hwnd: HWND = window.hwnd().unwrap();
        let backdrop_type: i32 = 2; // 2 = Mica Alt
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWINDOWATTRIBUTE(DWMWA_SYSTEMBACKDROP_TYPE.0),
            &backdrop_type as *const _ as *const c_void,
            std::mem::size_of_val(&backdrop_type) as u32,
        );
    }
}

#[cfg(target_os = "windows")]
pub(crate) fn set_immersive_dark_mode(window: &tauri::WebviewWindow, dark: bool) {
    use std::ffi::c_void;
    unsafe {
        let hwnd: HWND = window.hwnd().unwrap();
        let dark_mode: i32 = if dark { 1 } else { 0 };
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWINDOWATTRIBUTE(DWMWA_USE_IMMERSIVE_DARK_MODE.0),
            &dark_mode as *const _ as *const c_void,
            std::mem::size_of_val(&dark_mode) as u32,
        );
    }
}

#[cfg(target_os = "windows")]
#[tauri::command]
pub fn set_theme(dark: bool, app: tauri::AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("main") {
        set_immersive_dark_mode(&w, dark);
        enable_mica_alt(&w);
        Ok(())
    } else {
        Err("未找到窗口 main".into())
    }
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
pub fn set_theme(_dark: bool, _app: tauri::AppHandle) -> Result<(), String> {
    Ok(())
}

