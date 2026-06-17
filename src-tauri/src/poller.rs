use crate::redmine::{Issue, Priority};
use chrono::{Local, NaiveDate};

#[derive(Debug, PartialEq)]
pub enum ChangeKind {
    NewIssue,
    Updated,
    DeadlineSoon { days_until: i64 },
    Overdue,
}

#[derive(Debug)]
pub struct DetectedChange {
    pub issue: Issue,
    pub kind: ChangeKind,
}

pub fn diff_issues(
    previous: &[Issue],
    current: &[Issue],
    deadline_days: i64,
) -> Vec<DetectedChange> {
    let mut changes = Vec::new();
    let today = Local::now().date_naive();

    for issue in current {
        let prev = previous.iter().find(|p| p.id == issue.id);

        match prev {
            None => {
                changes.push(DetectedChange { issue: issue.clone(), kind: ChangeKind::NewIssue });
            }
            Some(p) if p.updated_on != issue.updated_on => {
                changes.push(DetectedChange { issue: issue.clone(), kind: ChangeKind::Updated });
            }
            _ => {}
        }

        if let Some(due_str) = &issue.due_date {
            if let Ok(due) = NaiveDate::parse_from_str(due_str, "%Y-%m-%d") {
                let days_until = (due - today).num_days();
                if days_until >= 0 && days_until <= deadline_days {
                    changes.push(DetectedChange {
                        issue: issue.clone(),
                        kind: ChangeKind::DeadlineSoon { days_until },
                    });
                } else if days_until < 0 {
                    changes.push(DetectedChange { issue: issue.clone(), kind: ChangeKind::Overdue });
                }
            }
        }
    }

    changes
}

use std::sync::{Arc, Mutex};
use tokio::time::{sleep, Duration};
use tauri::AppHandle;
use crate::notifications::send_notification;
use crate::store::Config;
use crate::redmine::fetch_issues;

pub async fn start_polling(app: AppHandle, config: Arc<Mutex<Config>>) {
    let mut snapshot: Vec<Issue> = Vec::new();

    loop {
        let (url, key, interval, deadline_days, notify_new, notify_updated, notify_overdue) = {
            let cfg = config.lock().unwrap();
            (
                cfg.redmine_url.clone(),
                cfg.api_key.clone(),
                cfg.poll_interval_minutes,
                cfg.notify_deadline_days,
                cfg.notify_new_issue,
                cfg.notify_updated,
                cfg.notify_overdue,
            )
        };

        if !url.is_empty() && !key.is_empty() {
            match fetch_issues(&url, &key).await {
                Ok(issues) => {
                    // Diff for change notifications
                    let changes = diff_issues(&snapshot, &issues, deadline_days);
                    for change in &changes {
                        let should_notify = match &change.kind {
                            ChangeKind::NewIssue => notify_new,
                            ChangeKind::Updated => notify_updated,
                            ChangeKind::DeadlineSoon { .. } => true,
                            ChangeKind::Overdue => notify_overdue,
                        };
                        if should_notify {
                            send_notification(&app, change);
                        }
                    }

                    // Update snapshot before do_fetch re-fetches so diff logic
                    // is always based on the last-seen state.
                    snapshot = issues;

                    // Emit events + update tray badge via shared helper
                    crate::commands::do_fetch(&app, &url, &key).await;
                }
                Err(e) => {
                    eprintln!("Polling error: {}", e);
                }
            }
        }

        sleep(Duration::from_secs(interval * 60)).await;
    }
}

fn make_issue(id: u32, updated_on: &str, due_date: Option<&str>) -> Issue {
    Issue {
        id,
        subject: format!("Task {}", id),
        priority: Priority::Normal,
        due_date: due_date.map(|s| s.to_string()),
        project_id: 1,
        project_name: "Test".to_string(),
        status: "New".to_string(),
        updated_on: updated_on.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_issue_detected() {
        let previous = vec![];
        let current = vec![make_issue(1, "2026-06-17T10:00:00Z", None)];
        let changes = diff_issues(&previous, &current, 2);
        assert_eq!(changes.len(), 1);
        assert_eq!(changes[0].kind, ChangeKind::NewIssue);
    }

    #[test]
    fn test_updated_issue_detected() {
        let previous = vec![make_issue(1, "2026-06-17T10:00:00Z", None)];
        let current = vec![make_issue(1, "2026-06-17T12:00:00Z", None)];
        let changes = diff_issues(&previous, &current, 2);
        assert_eq!(changes.len(), 1);
        assert_eq!(changes[0].kind, ChangeKind::Updated);
    }

    #[test]
    fn test_no_change_when_same() {
        let issue = make_issue(1, "2026-06-17T10:00:00Z", None);
        let previous = vec![issue.clone()];
        let current = vec![issue];
        let changes = diff_issues(&previous, &current, 2);
        assert!(changes.is_empty());
    }

    #[test]
    fn test_overdue_detected() {
        let previous = vec![make_issue(1, "2026-06-17T10:00:00Z", Some("2020-01-01"))];
        let current = vec![make_issue(1, "2026-06-17T10:00:00Z", Some("2020-01-01"))];
        let changes = diff_issues(&previous, &current, 2);
        assert_eq!(changes.len(), 1);
        assert_eq!(changes[0].kind, ChangeKind::Overdue);
    }
}
