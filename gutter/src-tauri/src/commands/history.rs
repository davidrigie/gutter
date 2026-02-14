use std::fs;
use std::path::Path;
use serde::Serialize;

fn history_dir(md_path: &str) -> std::path::PathBuf {
    let path = Path::new(md_path);
    let parent = path.parent().unwrap_or(Path::new("."));
    let filename = path.file_stem().and_then(|s| s.to_str()).unwrap_or("unknown");
    parent.join(".gutter").join("history").join(filename)
}

#[derive(Serialize)]
pub struct Snapshot {
    pub timestamp: String,
    pub size: u64,
    pub path: String,
}

#[tauri::command]
pub fn save_snapshot(md_path: String, content: String) -> Result<(), String> {
    let dir = history_dir(&md_path);
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create history dir: {}", e))?;
    }
    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let snapshot_path = dir.join(format!("{}.md", timestamp));
    fs::write(&snapshot_path, &content)
        .map_err(|e| format!("Failed to save snapshot: {}", e))
}

#[tauri::command]
pub fn list_snapshots(md_path: String) -> Result<Vec<Snapshot>, String> {
    let dir = history_dir(&md_path);
    if !dir.exists() {
        return Ok(vec![]);
    }
    let mut snapshots: Vec<Snapshot> = vec![];
    let entries = fs::read_dir(&dir).map_err(|e| format!("Failed to read history: {}", e))?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("md") {
            let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
            let name = path.file_stem().and_then(|s| s.to_str()).unwrap_or("").to_string();
            snapshots.push(Snapshot {
                timestamp: name,
                size: metadata.len(),
                path: path.to_string_lossy().to_string(),
            });
        }
    }
    snapshots.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    Ok(snapshots)
}

#[tauri::command]
pub fn read_snapshot(snapshot_path: String) -> Result<String, String> {
    fs::read_to_string(&snapshot_path).map_err(|e| format!("Failed to read snapshot: {}", e))
}
