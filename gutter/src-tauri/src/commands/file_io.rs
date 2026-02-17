use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::AppHandle;
use super::watcher;

#[tauri::command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

#[tauri::command]
pub fn write_file(app: AppHandle, path: String, content: String) -> Result<(), String> {
    watcher::mark_write(&app, &path);
    fs::write(&path, &content).map_err(|e| format!("Failed to write file: {}", e))
}

#[tauri::command]
pub fn file_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
pub fn delete_file(path: String) -> Result<(), String> {
    if Path::new(&path).exists() {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))
    } else {
        Ok(())
    }
}

#[tauri::command]
pub fn create_file(path: String) -> Result<(), String> {
    if Path::new(&path).exists() {
        return Err("File already exists".to_string());
    }
    fs::write(&path, "").map_err(|e| format!("Failed to create file: {}", e))
}

#[tauri::command]
pub fn create_directory(path: String) -> Result<(), String> {
    if Path::new(&path).exists() {
        return Err("Directory already exists".to_string());
    }
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory: {}", e))
}

#[tauri::command]
pub fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    // Try simple rename first
    if let Ok(_) = fs::rename(&old_path, &new_path) {
        return Ok(());
    }

    // Fallback for cross-device/partition moves
    let source = Path::new(&old_path);
    let dest = Path::new(&new_path);

    if source.is_dir() {
        copy_dir_recursive(source, dest).map_err(|e| format!("Failed to copy directory: {}", e))?;
        fs::remove_dir_all(source).map_err(|e| format!("Failed to delete source directory: {}", e))?;
    } else {
        fs::copy(source, dest).map_err(|e| format!("Failed to copy file: {}", e))?;
        fs::remove_file(source).map_err(|e| format!("Failed to delete source file: {}", e))?;
    }

    Ok(())
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let ty = entry.file_type()?;
        if ty.is_dir() {
            copy_dir_recursive(&entry.path(), &dst.join(entry.file_name()))?;
        } else {
            fs::copy(&entry.path(), &dst.join(entry.file_name()))?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn delete_path(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.exists() {
        return Ok(());
    }
    if p.is_dir() {
        fs::remove_dir_all(&path).map_err(|e| format!("Failed to delete directory: {}", e))
    } else {
        fs::remove_file(&path).map_err(|e| format!("Failed to delete file: {}", e))
    }
}

#[tauri::command]
pub fn save_image(dir_path: String, filename: String, data: Vec<u8>) -> Result<String, String> {
    let assets_dir = Path::new(&dir_path).join("assets");
    if !assets_dir.exists() {
        fs::create_dir_all(&assets_dir)
            .map_err(|e| format!("Failed to create assets directory: {}", e))?;
    }
    let file_path = assets_dir.join(&filename);
    fs::write(&file_path, &data).map_err(|e| format!("Failed to save image: {}", e))?;
    Ok(format!("./assets/{}", filename))
}

#[tauri::command]
pub fn copy_image(source: String, dir_path: String, filename: String) -> Result<String, String> {
    let assets_dir = Path::new(&dir_path).join("assets");
    if !assets_dir.exists() {
        fs::create_dir_all(&assets_dir)
            .map_err(|e| format!("Failed to create assets directory: {}", e))?;
    }
    let dest = assets_dir.join(&filename);
    fs::copy(&source, &dest).map_err(|e| format!("Failed to copy image: {}", e))?;
    Ok(format!("./assets/{}", filename))
}

#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    Command::new("open")
        .arg(&url)
        .spawn()
        .map_err(|e| format!("Failed to open URL: {}", e))?;

    #[cfg(target_os = "linux")]
    Command::new("xdg-open")
        .arg(&url)
        .spawn()
        .map_err(|e| format!("Failed to open URL: {}", e))?;

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        Command::new("cmd")
            .args(["/c", "start", &url])
            .creation_flags(0x08000000) // CREATE_NO_WINDOW
            .spawn()
            .map_err(|e| format!("Failed to open URL: {}", e))?;
    }

    Ok(())
}

/// Read a file and return it as a data: URL (base64-encoded).
/// Used for images to bypass the asset protocol which has issues on Windows.
#[tauri::command]
pub fn read_file_data_url(path: String) -> Result<String, String> {
    let data = fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    let mime = match Path::new(&path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase()
        .as_str()
    {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        _ => "application/octet-stream",
    };
    use base64::Engine;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&data);
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[tauri::command]
pub fn get_open_file_path(app: tauri::AppHandle) -> Option<String> {
    use tauri::Manager;
    let state = app.state::<crate::OpenFileState>();
    let path = state.path.lock().unwrap().take();
    path
}
