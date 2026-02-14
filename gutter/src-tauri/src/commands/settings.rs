use std::fs;
use std::path::PathBuf;

fn settings_dir() -> PathBuf {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".gutter")
}

fn settings_path() -> PathBuf {
    settings_dir().join("config.json")
}

#[tauri::command]
pub fn read_settings() -> Result<String, String> {
    let path = settings_path();
    if !path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(&path).map_err(|e| format!("Failed to read settings: {}", e))
}

#[tauri::command]
pub fn write_settings(content: String) -> Result<(), String> {
    let dir = settings_dir();
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create settings directory: {}", e))?;
    }
    fs::write(settings_path(), &content)
        .map_err(|e| format!("Failed to write settings: {}", e))
}
