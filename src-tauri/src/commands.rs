use std::sync::{Arc, Mutex};
use tauri::State;
use crate::store::{Config, save_config};
use crate::AppState;

#[tauri::command]
pub fn get_config(state: State<AppState>) -> Config {
    state.config.lock().unwrap().clone()
}

#[tauri::command]
pub fn save_config_cmd(state: State<AppState>, app: tauri::AppHandle, config: Config) {
    {
        let mut current = state.config.lock().unwrap();
        *current = config.clone();
    }
    use tauri_plugin_store::StoreExt;
    if let Some(store) = app.get_store("config.json") {
        save_config(&store, &config);
    }
    use tauri_plugin_autostart::ManagerExt;
    if config.launch_at_login {
        let _ = app.autolaunch().enable();
    } else {
        let _ = app.autolaunch().disable();
    }
}

#[tauri::command]
pub fn open_in_browser(app: tauri::AppHandle, url: String) {
    use tauri_plugin_shell::ShellExt;
    let _ = app.shell().open(&url, None);
}
