use tauri::{State, Emitter};
use crate::store::{Config, save_config};
use crate::AppState;
use crate::redmine::{fetch_issues, fetch_projects, Priority};

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

/// Shared fetch logic used by both the tray "Refresh" menu item and the
/// `fetch_now` Tauri command. Fetches issues + projects, emits the relevant
/// events, and updates the tray badge.
pub async fn do_fetch(app: &tauri::AppHandle, url: &str, key: &str) {
    if let Ok(issues) = fetch_issues(url, key).await {
        let _ = app.emit("tasks-updated", &issues);
        let urgent = issues.iter().filter(|i| i.priority == Priority::Urgent).count();
        let _ = app.emit("urgent-count", urgent);
        if let Some(tray) = app.tray_by_id("main") {
            let title = if urgent > 0 { Some(format!(" {}", urgent)) } else { None };
            let _ = tray.set_title(title.as_deref());
        }
    }
    if let Ok(projects) = fetch_projects(url, key).await {
        let _ = app.emit("projects-updated", &projects);
    }
}

#[tauri::command]
pub async fn fetch_now(state: State<'_, AppState>, app: tauri::AppHandle) -> Result<(), String> {
    let (url, key) = {
        let cfg = state.config.lock().unwrap();
        (cfg.redmine_url.clone(), cfg.api_key.clone())
    };
    if url.is_empty() || key.is_empty() {
        return Err("Chybí URL nebo API klíč".to_string());
    }
    do_fetch(&app, &url, &key).await;
    Ok(())
}
