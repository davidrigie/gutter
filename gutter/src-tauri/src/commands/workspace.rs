use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Serialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileEntry>>,
}

#[tauri::command]
pub fn read_directory(path: String) -> Result<Vec<FileEntry>, String> {
    read_dir_recursive(&path, 0)
}

fn read_dir_recursive(path: &str, depth: u32) -> Result<Vec<FileEntry>, String> {
    if depth > 10 {
        return Ok(vec![]);
    }

    let entries = fs::read_dir(path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    let mut result: Vec<FileEntry> = Vec::new();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path_buf = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files, comments files
        if name.starts_with('.') {
            continue;
        }
        if name.ends_with(".comments.json") || name.ends_with(".comments.md") {
            continue;
        }

        let is_dir = path_buf.is_dir();
        let path_str = path_buf.to_string_lossy().to_string();

        let children = if is_dir {
            Some(read_dir_recursive(&path_str, depth + 1).unwrap_or_default())
        } else {
            None
        };

        result.push(FileEntry {
            name,
            path: path_str,
            is_dir,
            children,
        });
    }

    // Sort: dirs first, then alphabetically
    result.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(result)
}

#[tauri::command]
pub fn get_parent_dir(path: String) -> Option<String> {
    Path::new(&path)
        .parent()
        .map(|p| p.to_string_lossy().to_string())
}
