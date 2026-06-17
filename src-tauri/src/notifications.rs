use crate::poller::{ChangeKind, DetectedChange};
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

pub fn send_notification(app: &AppHandle, change: &DetectedChange) {
    let (title, body) = match &change.kind {
        ChangeKind::NewIssue => (
            "Nový task přiřazen".to_string(),
            format!("{} · {} #{}", change.issue.subject, change.issue.project_name, change.issue.id),
        ),
        ChangeKind::Updated => (
            "Task aktualizován".to_string(),
            format!("{} · {} #{}", change.issue.subject, change.issue.project_name, change.issue.id),
        ),
        ChangeKind::DeadlineSoon { days_until: 0 } => (
            "Deadline dnes!".to_string(),
            format!("{} · {} #{}", change.issue.subject, change.issue.project_name, change.issue.id),
        ),
        ChangeKind::DeadlineSoon { days_until } => (
            format!("Deadline za {} {}", days_until, if *days_until == 1 { "den" } else { "dny" }),
            format!("{} · {} #{}", change.issue.subject, change.issue.project_name, change.issue.id),
        ),
        ChangeKind::Overdue => (
            "Task po termínu".to_string(),
            format!("{} · {} #{}", change.issue.subject, change.issue.project_name, change.issue.id),
        ),
    };

    let _ = app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show();
}
