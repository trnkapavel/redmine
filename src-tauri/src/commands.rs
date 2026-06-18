use tauri::{State, Emitter};
use crate::store::{Config, save_config};
use crate::AppState;
use crate::redmine::{fetch_issues, fetch_projects, fetch_issue_detail, update_issue, add_note, fetch_statuses, IssueDetail, IssueStatus, Priority};

fn require_config(state: &State<'_, AppState>) -> Result<(String, String), String> {
    let cfg = state.config.lock().unwrap();
    let url = cfg.redmine_url.clone();
    let key = cfg.api_key.clone();
    if url.is_empty() || key.is_empty() {
        return Err("Chybí URL nebo API klíč".to_string());
    }
    Ok((url, key))
}

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
    let (url, key) = require_config(&state)?;
    do_fetch(&app, &url, &key).await;
    Ok(())
}

#[tauri::command]
pub async fn get_issue_detail(state: State<'_, AppState>, id: u32) -> Result<IssueDetail, String> {
    let (url, key) = require_config(&state)?;
    fetch_issue_detail(&url, &key, id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_issue_cmd(
    state: State<'_, AppState>,
    id: u32,
    status_id: Option<u32>,
    assigned_to_id: Option<u32>,
) -> Result<(), String> {
    let (url, key) = require_config(&state)?;
    update_issue(&url, &key, id, status_id, assigned_to_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn fetch_statuses_cmd(state: State<'_, AppState>) -> Result<Vec<IssueStatus>, String> {
    let (url, key) = require_config(&state)?;
    fetch_statuses(&url, &key).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn add_note_cmd(state: State<'_, AppState>, id: u32, notes: String) -> Result<(), String> {
    let (url, key) = require_config(&state)?;
    add_note(&url, &key, id, notes).await.map_err(|e| e.to_string())
}
