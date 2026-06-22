use serde::{Deserialize, Serialize};
use keyring::Entry;

const KEYCHAIN_SERVICE: &str = "cz.redminefocus.app";
const KEYCHAIN_ACCOUNT: &str = "api_key";

fn keychain_set(value: &str) {
    if let Ok(entry) = Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT) {
        let _ = entry.set_password(value);
    }
}

fn keychain_get() -> Option<String> {
    Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT)
        .ok()
        .and_then(|e| e.get_password().ok())
        .filter(|s| !s.is_empty())
}

#[allow(dead_code)]
fn keychain_delete() {
    if let Ok(entry) = Entry::new(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT) {
        let _ = entry.delete_credential();
    }
}

fn default_font_size() -> u32 { 14 }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub redmine_url: String,
    pub api_key: String,
    pub poll_interval_minutes: u64,
    pub notify_new_issue: bool,
    pub notify_updated: bool,
    pub notify_deadline_days: i64,
    pub notify_overdue: bool,
    pub launch_at_login: bool,
    #[serde(default = "default_font_size")]
    pub font_size: u32,
    #[serde(default)]
    pub in_progress_status_id: Option<u32>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            redmine_url: String::new(),
            api_key: String::new(),
            poll_interval_minutes: 15,
            notify_new_issue: true,
            notify_updated: true,
            notify_deadline_days: 2,
            notify_overdue: true,
            launch_at_login: true,
            font_size: default_font_size(),
            in_progress_status_id: None,
        }
    }
}

pub fn load_config(store: &tauri_plugin_store::Store<tauri::Wry>) -> Config {
    let url = store.get("redmine_url")
        .and_then(|v| v.as_str().map(|s| s.to_string()))
        .unwrap_or_default();
    // Načteme z Keychain; pokud tam není, zkusíme migrovat ze store
    let api_key = keychain_get().unwrap_or_else(|| {
        let from_store = store.get("api_key")
            .and_then(|v| v.as_str().map(|s| s.to_string()))
            .unwrap_or_default();
        if !from_store.is_empty() {
            keychain_set(&from_store);
            let _ = store.delete("api_key");
            let _ = store.save();
        }
        from_store
    });
    let poll_interval = store.get("poll_interval_minutes")
        .and_then(|v| v.as_u64())
        .unwrap_or(15);
    let notify_new = store.get("notify_new_issue")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let notify_updated = store.get("notify_updated")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let deadline_days = store.get("notify_deadline_days")
        .and_then(|v| v.as_i64())
        .unwrap_or(2);
    let notify_overdue = store.get("notify_overdue")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let launch_at_login = store.get("launch_at_login")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let font_size = store.get("fontSize")
        .and_then(|v| v.as_u64())
        .map(|v| v as u32)
        .unwrap_or_else(default_font_size);
    let in_progress_status_id = store.get("inProgressStatusId")
        .and_then(|v| v.as_u64())
        .map(|v| v as u32);

    Config {
        redmine_url: url,
        api_key,
        poll_interval_minutes: poll_interval,
        notify_new_issue: notify_new,
        notify_updated,
        notify_deadline_days: deadline_days,
        notify_overdue,
        launch_at_login,
        font_size,
        in_progress_status_id,
    }
}

pub fn save_config(store: &tauri_plugin_store::Store<tauri::Wry>, config: &Config) {
    store.set("redmine_url", config.redmine_url.clone());
    keychain_set(&config.api_key);
    store.set("poll_interval_minutes", config.poll_interval_minutes);
    store.set("notify_new_issue", config.notify_new_issue);
    store.set("notify_updated", config.notify_updated);
    store.set("notify_deadline_days", config.notify_deadline_days);
    store.set("notify_overdue", config.notify_overdue);
    store.set("launch_at_login", config.launch_at_login);
    store.set("fontSize", config.font_size);
    match config.in_progress_status_id {
        Some(id) => store.set("inProgressStatusId", id),
        None => { let _ = store.delete("inProgressStatusId"); }
    }
    let _ = store.save();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = Config::default();
        assert_eq!(config.poll_interval_minutes, 15);
        assert_eq!(config.notify_deadline_days, 2);
        assert!(config.notify_new_issue);
        assert!(config.notify_overdue);
    }
}
