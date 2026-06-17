#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::{Arc, Mutex};
use tauri::{Manager, Emitter};
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
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

            // Pravý klik menu
            let refresh_item = MenuItem::with_id(app, "refresh", "Obnovit tasky", true, None::<&str>)?;
            let settings_item = MenuItem::with_id(app, "settings", "Nastavení…", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Ukončit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&refresh_item, &settings_item, &separator, &quit_item])?;

            TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Redmine Focus")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "refresh" => {
                            let app_clone = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let state = app_clone.state::<AppState>();
                                let (url, key) = {
                                    let cfg = state.config.lock().unwrap();
                                    (cfg.redmine_url.clone(), cfg.api_key.clone())
                                };
                                if !url.is_empty() && !key.is_empty() {
                                    use redmine_focus_lib::redmine::{fetch_issues, fetch_projects};
                                    if let Ok(issues) = fetch_issues(&url, &key).await {
                                        let _ = app_clone.emit("tasks-updated", &issues);
                                        let urgent = issues.iter().filter(|i| i.priority == redmine_focus_lib::redmine::Priority::Urgent).count();
                                        let _ = app_clone.emit("urgent-count", urgent);
                                        if let Some(tray) = app_clone.tray_by_id("main") {
                                            let title = if urgent > 0 { Some(format!(" {}", urgent)) } else { None };
                                            let _ = tray.set_title(title.as_deref());
                                        }
                                    }
                                    if let Ok(projects) = fetch_projects(&url, &key).await {
                                        let _ = app_clone.emit("projects-updated", &projects);
                                    }
                                }
                            });
                        }
                        "settings" => {
                            let _ = app.emit("show-settings", ());
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        rect,
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                // Pozicovat okno pod tray ikonou
                                let pos = rect.position.to_physical::<f64>(1.0);
                                let size = rect.size.to_physical::<f64>(1.0);
                                let icon_x = pos.x;
                                let icon_y = pos.y;
                                let icon_w = size.width;
                                let icon_h = size.height;

                                let win_w = 440.0_f64;
                                let x = (icon_x + icon_w / 2.0 - win_w / 2.0) as i32;
                                let y = (icon_y + icon_h + 5.0) as i32;
                                let x = x.max(5);

                                let _ = window.set_position(tauri::PhysicalPosition::new(x, y));
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // Focus-lost → schovat okno
            if let Some(window) = app.get_webview_window("main") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(false) = event {
                        let _ = window_clone.hide();
                    }
                });
            }

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                start_polling(app_handle, config).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            redmine_focus_lib::commands::get_config,
            redmine_focus_lib::commands::save_config_cmd,
            redmine_focus_lib::commands::open_in_browser,
            redmine_focus_lib::commands::fetch_now
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
