use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Priority {
    Urgent,
    High,
    Normal,
    Low,
    #[serde(other)]
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Issue {
    pub id: u32,
    pub subject: String,
    pub priority: Priority,
    pub due_date: Option<String>,
    pub project_id: u32,
    pub project_name: String,
    pub status: String,
    pub updated_on: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: u32,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueDetail {
    pub id: u32,
    pub subject: String,
    pub description: String,
    pub project_id: u32,
    pub project_name: String,
    pub status: String,
    pub status_id: u32,
    pub priority: Priority,
    pub due_date: Option<String>,
    pub assignee_id: Option<u32>,
    pub assignee_name: Option<String>,
    pub journals: Vec<Journal>,
    pub closed_statuses: Vec<IssueStatus>,
    pub members: Vec<Member>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Journal {
    pub id: u32,
    pub notes: String,
    pub created_on: String,
    pub author_name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IssueStatus {
    pub id: u32,
    pub name: String,
    pub is_closed: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Member {
    pub id: u32,
    pub name: String,
}

#[derive(Debug, thiserror::Error)]
pub enum RedmineError {
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Unauthorized — check your API key")]
    Unauthorized,
    #[error("API error: {0}")]
    Api(String),
}

// Raw Redmine JSON shapes
#[derive(Deserialize)]
struct RawIssuesResponse {
    issues: Vec<RawIssue>,
}

#[derive(Deserialize)]
struct RawIssue {
    id: u32,
    subject: String,
    priority: RawNamed,
    due_date: Option<String>,
    project: RawNamed,
    status: RawNamed,
    updated_on: String,
}

#[derive(Deserialize)]
struct RawNamed {
    id: u32,
    name: String,
}

#[derive(Deserialize)]
struct RawProjectsResponse {
    projects: Vec<RawProject>,
}

#[derive(Deserialize)]
struct RawProject {
    id: u32,
    name: String,
}

#[derive(Deserialize)]
struct RawIssueDetailResponse {
    issue: RawIssueDetail,
}

#[derive(Deserialize)]
struct RawIssueDetail {
    id: u32,
    subject: String,
    description: Option<String>,
    status: RawNamed,
    priority: RawNamed,
    project: RawNamed,
    due_date: Option<String>,
    assigned_to: Option<RawNamed>,
    journals: Vec<RawJournal>,
}

#[derive(Deserialize)]
struct RawJournal {
    id: u32,
    notes: Option<String>,
    created_on: String,
    user: RawNamed,
}

#[derive(Deserialize)]
struct RawIssueStatusesResponse {
    issue_statuses: Vec<RawIssueStatus>,
}

#[derive(Deserialize)]
struct RawIssueStatus {
    id: u32,
    name: String,
    is_closed: Option<bool>,
}

#[derive(Deserialize)]
struct RawMembershipsResponse {
    memberships: Vec<RawMembership>,
}

#[derive(Deserialize)]
struct RawMembership {
    user: Option<RawNamed>,
}

#[derive(Serialize)]
struct UpdateIssueRequest {
    issue: UpdateIssueBody,
}

#[derive(Serialize)]
struct UpdateIssueBody {
    #[serde(skip_serializing_if = "Option::is_none")]
    status_id: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    assigned_to_id: Option<u32>,
}

#[derive(Serialize)]
struct AddNoteRequest {
    issue: AddNoteBody,
}

#[derive(Serialize)]
struct AddNoteBody {
    notes: String,
}

fn parse_priority(name: &str) -> Priority {
    match name.to_lowercase().as_str() {
        "urgent" | "urgentní" => Priority::Urgent,
        "high" | "vysoká" | "high priority" => Priority::High,
        "normal" | "normální" | "medium" => Priority::Normal,
        "low" | "nízká" => Priority::Low,
        _ => Priority::Unknown,
    }
}

pub async fn fetch_issues(base_url: &str, api_key: &str) -> Result<Vec<Issue>, RedmineError> {
    let client = Client::new();
    let url = format!("{}/issues.json?assigned_to_id=me&status_id=open&limit=100", base_url.trim_end_matches('/'));

    let response = client
        .get(&url)
        .header("X-Redmine-API-Key", api_key)
        .send()
        .await?;

    if response.status() == 401 {
        return Err(RedmineError::Unauthorized);
    }
    if !response.status().is_success() {
        return Err(RedmineError::Api(response.status().to_string()));
    }

    let raw: RawIssuesResponse = response.json().await?;
    Ok(raw.issues.into_iter().map(|r| Issue {
        id: r.id,
        subject: r.subject,
        priority: parse_priority(&r.priority.name),
        due_date: r.due_date,
        project_id: r.project.id,
        project_name: r.project.name,
        status: r.status.name,
        updated_on: r.updated_on,
    }).collect())
}

pub async fn fetch_projects(base_url: &str, api_key: &str) -> Result<Vec<Project>, RedmineError> {
    let client = Client::new();
    let url = format!("{}/projects.json?limit=100", base_url.trim_end_matches('/'));

    let response = client
        .get(&url)
        .header("X-Redmine-API-Key", api_key)
        .send()
        .await?;

    if response.status() == 401 {
        return Err(RedmineError::Unauthorized);
    }
    if !response.status().is_success() {
        return Err(RedmineError::Api(response.status().to_string()));
    }

    let raw: RawProjectsResponse = response.json().await?;
    Ok(raw.projects.into_iter().map(|p| Project { id: p.id, name: p.name }).collect())
}

pub async fn fetch_statuses(base_url: &str, api_key: &str) -> Result<Vec<IssueStatus>, RedmineError> {
    let client = Client::new();
    let url = format!("{}/issue_statuses.json", base_url.trim_end_matches('/'));
    let resp = client.get(&url).header("X-Redmine-API-Key", api_key).send().await?;
    if resp.status() == 401 { return Err(RedmineError::Unauthorized); }
    if !resp.status().is_success() { return Err(RedmineError::Api(resp.status().to_string())); }
    let raw: RawIssueStatusesResponse = resp.json().await?;
    Ok(raw.issue_statuses.into_iter()
        .map(|s| IssueStatus { id: s.id, name: s.name, is_closed: s.is_closed.unwrap_or(false) })
        .collect())
}

pub async fn fetch_issue_detail(base_url: &str, api_key: &str, id: u32) -> Result<IssueDetail, RedmineError> {
    let client = Client::new();
    let base = base_url.trim_end_matches('/');

    // 1. Issue detail + journals
    let detail_url = format!("{}/issues/{}.json?include=journals", base, id);
    let resp = client.get(&detail_url).header("X-Redmine-API-Key", api_key).send().await?;
    if resp.status() == 401 { return Err(RedmineError::Unauthorized); }
    if !resp.status().is_success() { return Err(RedmineError::Api(resp.status().to_string())); }
    let raw: RawIssueDetailResponse = resp.json().await?;
    let r = raw.issue;
    let project_id = r.project.id;

    // 2 & 3. Issue statuses and project members in parallel (non-fatal)
    let (closed_statuses, members) = tokio::join!(
        async {
            let url = format!("{}/issue_statuses.json", base);
            let resp = client.get(&url).header("X-Redmine-API-Key", api_key).send().await.ok()?;
            let body: RawIssueStatusesResponse = resp.json().await.ok()?;
            Some(body.issue_statuses.into_iter()
                .filter(|s| s.is_closed.unwrap_or(false))
                .map(|s| IssueStatus { id: s.id, name: s.name, is_closed: true })
                .collect::<Vec<_>>())
        },
        async {
            let url = format!("{}/projects/{}/memberships.json?limit=100", base, project_id);
            let resp = client.get(&url).header("X-Redmine-API-Key", api_key).send().await.ok()?;
            let body: RawMembershipsResponse = resp.json().await.ok()?;
            Some(body.memberships.into_iter()
                .filter_map(|m| m.user)
                .map(|u| Member { id: u.id, name: u.name })
                .collect::<Vec<_>>())
        }
    );
    let closed_statuses = closed_statuses.unwrap_or_default();
    let members = members.unwrap_or_default();

    Ok(IssueDetail {
        id: r.id,
        subject: r.subject,
        description: r.description.unwrap_or_default(),
        project_id,
        project_name: r.project.name,
        status: r.status.name.clone(),
        status_id: r.status.id,
        priority: parse_priority(&r.priority.name),
        due_date: r.due_date,
        assignee_id: r.assigned_to.as_ref().map(|a| a.id),
        assignee_name: r.assigned_to.map(|a| a.name),
        journals: r.journals.into_iter()
            .map(|j| Journal {
                id: j.id,
                notes: j.notes.unwrap_or_default(),
                created_on: j.created_on,
                author_name: j.user.name,
            })
            .collect(),
        closed_statuses,
        members,
    })
}

pub async fn update_issue(base_url: &str, api_key: &str, id: u32, status_id: Option<u32>, assigned_to_id: Option<u32>) -> Result<(), RedmineError> {
    if status_id.is_none() && assigned_to_id.is_none() {
        return Ok(());
    }
    let client = Client::new();
    let url = format!("{}/issues/{}.json", base_url.trim_end_matches('/'), id);
    let body = UpdateIssueRequest {
        issue: UpdateIssueBody { status_id, assigned_to_id },
    };
    let resp = client.put(&url)
        .header("X-Redmine-API-Key", api_key)
        .header("Content-Type", "application/json")
        .json(&body)
        .send().await?;
    if resp.status() == 401 { return Err(RedmineError::Unauthorized); }
    if !resp.status().is_success() { return Err(RedmineError::Api(resp.status().to_string())); }
    Ok(())
}

pub async fn add_note(base_url: &str, api_key: &str, id: u32, notes: String) -> Result<(), RedmineError> {
    let client = Client::new();
    let url = format!("{}/issues/{}.json", base_url.trim_end_matches('/'), id);
    let body = AddNoteRequest { issue: AddNoteBody { notes } };
    let resp = client.put(&url)
        .header("X-Redmine-API-Key", api_key)
        .header("Content-Type", "application/json")
        .json(&body)
        .send().await?;
    if resp.status() == 401 { return Err(RedmineError::Unauthorized); }
    if !resp.status().is_success() { return Err(RedmineError::Api(resp.status().to_string())); }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockito::Server;

    #[tokio::test]
    async fn test_fetch_issues_parses_response() {
        let mut server = Server::new_async().await;
        let mock = server.mock("GET", "/issues.json?assigned_to_id=me&status_id=open&limit=100")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{
                "issues": [{
                    "id": 1042,
                    "subject": "Opravit export PDF",
                    "priority": {"id": 6, "name": "Urgent"},
                    "due_date": "2026-06-17",
                    "project": {"id": 1, "name": "Backend"},
                    "status": {"id": 1, "name": "New"},
                    "updated_on": "2026-06-17T10:00:00Z"
                }]
            }"#)
            .create_async().await;

        let issues = fetch_issues(&server.url(), "test-key").await.unwrap();

        assert_eq!(issues.len(), 1);
        assert_eq!(issues[0].id, 1042);
        assert_eq!(issues[0].subject, "Opravit export PDF");
        assert_eq!(issues[0].priority, Priority::Urgent);
        assert_eq!(issues[0].due_date, Some("2026-06-17".to_string()));
        assert_eq!(issues[0].project_name, "Backend");

        mock.assert_async().await;
    }

    #[tokio::test]
    async fn test_fetch_issues_unauthorized() {
        let mut server = Server::new_async().await;
        server.mock("GET", "/issues.json?assigned_to_id=me&status_id=open&limit=100")
            .with_status(401)
            .create_async().await;

        let result = fetch_issues(&server.url(), "bad-key").await;
        assert!(matches!(result, Err(RedmineError::Unauthorized)));
    }

    #[test]
    fn test_parse_priority() {
        assert_eq!(parse_priority("Urgent"), Priority::Urgent);
        assert_eq!(parse_priority("urgentní"), Priority::Urgent);
        assert_eq!(parse_priority("High"), Priority::High);
        assert_eq!(parse_priority("Normal"), Priority::Normal);
        assert_eq!(parse_priority("Low"), Priority::Low);
        assert_eq!(parse_priority("something_else"), Priority::Unknown);
    }

    #[tokio::test]
    async fn test_fetch_issue_detail_parses_response() {
        let mut server = Server::new_async().await;
        server.mock("GET", "/issues/42.json?include=journals")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{
                "issue": {
                    "id": 42,
                    "subject": "Fix login bug",
                    "description": "Users cannot log in",
                    "status": {"id": 1, "name": "New"},
                    "priority": {"id": 2, "name": "Normal"},
                    "project": {"id": 3, "name": "Backend"},
                    "due_date": null,
                    "assigned_to": {"id": 5, "name": "Pavel"},
                    "journals": [
                        {"id": 1, "notes": "Looking into it", "created_on": "2026-06-18T10:00:00Z", "user": {"id": 5, "name": "Pavel"}}
                    ]
                }
            }"#)
            .create_async().await;
        server.mock("GET", "/issue_statuses.json")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{"issue_statuses": [{"id": 3, "name": "Resolved", "is_closed": true}]}"#)
            .create_async().await;
        server.mock("GET", "/projects/3/memberships.json?limit=100")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{"memberships": [{"user": {"id": 5, "name": "Pavel"}}, {"user": {"id": 6, "name": "Jana"}}]}"#)
            .create_async().await;

        let detail = fetch_issue_detail(&server.url(), "test-key", 42).await.unwrap();

        assert_eq!(detail.id, 42);
        assert_eq!(detail.subject, "Fix login bug");
        assert_eq!(detail.description, "Users cannot log in");
        assert_eq!(detail.project_name, "Backend");
        assert_eq!(detail.assignee_name, Some("Pavel".to_string()));
        assert_eq!(detail.journals.len(), 1);
        assert_eq!(detail.journals[0].notes, "Looking into it");
        assert_eq!(detail.closed_statuses.len(), 1);
        assert_eq!(detail.closed_statuses[0].name, "Resolved");
        assert_eq!(detail.members.len(), 2);
    }

    #[tokio::test]
    async fn test_update_issue_status() {
        let mut server = Server::new_async().await;
        server.mock("PUT", "/issues/42.json")
            .with_status(200)
            .create_async().await;

        let result = update_issue(&server.url(), "test-key", 42, Some(3), None).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_fetch_statuses_returns_all() {
        let mut server = Server::new_async().await;
        server.mock("GET", "/issue_statuses.json")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(r#"{"issue_statuses": [
                {"id": 1, "name": "New", "is_closed": false},
                {"id": 2, "name": "In Progress", "is_closed": false},
                {"id": 3, "name": "Resolved", "is_closed": true}
            ]}"#)
            .create_async().await;

        let statuses = fetch_statuses(&server.url(), "test-key").await.unwrap();

        assert_eq!(statuses.len(), 3);
        assert_eq!(statuses[0].name, "New");
        assert_eq!(statuses[2].name, "Resolved");
    }

    #[tokio::test]
    async fn test_add_note_sends_put() {
        let mut server = Server::new_async().await;
        let mock = server.mock("PUT", "/issues/42.json")
            .with_status(200)
            .create_async().await;

        let result = add_note(&server.url(), "test-key", 42, "Testovací poznámka".to_string()).await;

        assert!(result.is_ok());
        mock.assert_async().await;
    }
}
