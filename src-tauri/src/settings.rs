use crate::models::AppSettings;
use std::fs;
use std::path::PathBuf;

const SETTINGS_FILE: &str = "settings.json";

fn settings_path() -> Result<PathBuf, String> {
    let data_dir = dirs::data_dir().ok_or("Не удалось определить папку данных")?;
    let dir = data_dir.join("sborka");
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(SETTINGS_FILE))
}

pub fn get_settings() -> Result<AppSettings, String> {
    let path = settings_path()?;
    if !path.exists() {
        return Ok(AppSettings::default());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

pub fn save_settings(settings: &AppSettings) -> Result<(), String> {
    let path = settings_path()?;
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}
