#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};
use tauri::Manager;
use tauri::tray::TrayIconBuilder;
use redmine_focus_lib::AppState;
use redmine_focus_lib::store::load_config;
use redmine_focus_lib::poller::start_polling;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(tauri_plugin_autostart::MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            use tauri_plugin_store::StoreExt;
            let store = app.store_builder("config.json").build()?;
            let config = load_config(&store);

            let config = Arc::new(Mutex::new(config));
            app.manage(AppState { config: config.clone() });

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Redmine Focus")
                .on_tray_icon_event(|tray, event| {
                    use tauri::tray::TrayIconEvent;
                    if let TrayIconEvent::Click { .. } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            let app_handle = app.handle().clone();
            tokio::spawn(async move {
                start_polling(app_handle, config).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            redmine_focus_lib::commands::get_config,
            redmine_focus_lib::commands::save_config_cmd,
            redmine_focus_lib::commands::open_in_browser
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
