use std::fs;
use std::path::Path;
use tauri::AppHandle;
use super::watcher;

#[tauri::command]
pub fn read_comments(path: String) -> Result<String, String> {
    let comments_path = comments_json_path(&path);
    if Path::new(&comments_path).exists() {
        fs::read_to_string(&comments_path)
            .map_err(|e| format!("Failed to read comments: {}", e))
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
pub fn write_comments(app: AppHandle, path: String, content: String) -> Result<(), String> {
    watcher::mark_write(&app);
    let comments_path = comments_json_path(&path);
    fs::write(&comments_path, &content)
        .map_err(|e| format!("Failed to write comments: {}", e))
}

#[tauri::command]
pub fn delete_comments(path: String) -> Result<(), String> {
    let comments_path = comments_json_path(&path);
    if Path::new(&comments_path).exists() {
        fs::remove_file(&comments_path)
            .map_err(|e| format!("Failed to delete comments: {}", e))?;
    }

    let companion_path = comments_md_path(&path);
    if Path::new(&companion_path).exists() {
        fs::remove_file(&companion_path)
            .map_err(|e| format!("Failed to delete companion: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn write_companion(app: AppHandle, path: String, content: String) -> Result<(), String> {
    watcher::mark_write(&app);
    let companion_path = comments_md_path(&path);
    fs::write(&companion_path, &content)
        .map_err(|e| format!("Failed to write companion: {}", e))
}

#[tauri::command]
pub fn delete_companion(path: String) -> Result<(), String> {
    let companion_path = comments_md_path(&path);
    if Path::new(&companion_path).exists() {
        fs::remove_file(&companion_path)
            .map_err(|e| format!("Failed to delete companion: {}", e))?;
    }
    Ok(())
}

fn comments_json_path(md_path: &str) -> String {
    let p = Path::new(md_path);
    let stem = p.file_stem().unwrap_or_default().to_string_lossy();
    let parent = p.parent().unwrap_or(Path::new("."));
    parent.join(format!("{}.comments.json", stem)).to_string_lossy().to_string()
}

fn comments_md_path(md_path: &str) -> String {
    let p = Path::new(md_path);
    let stem = p.file_stem().unwrap_or_default().to_string_lossy();
    let parent = p.parent().unwrap_or(Path::new("."));
    parent.join(format!("{}.comments.md", stem)).to_string_lossy().to_string()
}
