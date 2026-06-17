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
}
