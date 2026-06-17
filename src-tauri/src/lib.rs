pub mod redmine;
pub mod store;
pub mod poller;
pub mod notifications;
pub mod commands;

use std::sync::{Arc, Mutex};
use store::Config;

pub struct AppState {
    pub config: Arc<Mutex<Config>>,
}

pub use commands::{get_config, save_config_cmd, open_in_browser};
