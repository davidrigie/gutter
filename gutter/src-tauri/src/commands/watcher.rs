use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

struct WatcherState {
    watcher: Mutex<Option<RecommendedWatcher>>,
}

struct IgnoredPathState {
    // Maps absolute path -> Instant when it should stop being ignored
    paths: Mutex<std::collections::HashMap<PathBuf, Instant>>,
}

pub fn init(app: &tauri::App) {
    app.manage(WatcherState {
        watcher: Mutex::new(None),
    });
    app.manage(IgnoredPathState {
        paths: Mutex::new(std::collections::HashMap::new()),
    });
}

/// Temporarily suppress watcher events for a specific file path
pub fn mark_write(app: &AppHandle, path: &str) {
    let state = app.state::<IgnoredPathState>();
    let mut guard = state.paths.lock().unwrap();
    // Ignore this path for the next 2 seconds
    guard.insert(PathBuf::from(path), Instant::now() + Duration::from_secs(2));
}

fn is_suppressed(app: &AppHandle, path: &Path) -> bool {
    let state = app.state::<IgnoredPathState>();
    let mut guard = state.paths.lock().unwrap();
    
    // Clean up expired entries while we're here
    let now = Instant::now();
    guard.retain(|_, expiry| *expiry > now);

    guard.contains_key(path)
}

fn is_ignored_path(path: &Path) -> bool {
    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
    if name.ends_with(".comments.json") || name.ends_with(".comments.md") {
        return true;
    }
    let path_str = path.to_string_lossy();
    if path_str.contains("/.gutter/") || path_str.contains("\\.gutter\\") {
        return true;
    }
    if name.starts_with('.') {
        return true;
    }
    false
}

#[tauri::command]
pub fn start_watcher(app: AppHandle, path: String) -> Result<(), String> {
    let state = app.state::<WatcherState>();
    let mut guard = state.watcher.lock().map_err(|e| e.to_string())?;

    *guard = None;

    let app_handle = app.clone();
    let watch_path = path.clone();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let paths = &event.paths;

                if paths.iter().all(|p| is_ignored_path(p) || is_suppressed(&app_handle, p)) {
                    return;
                }

                match event.kind {
                    EventKind::Create(_) | EventKind::Remove(_) => {
                        let _ = app_handle.emit("tree-changed", &watch_path);
                    }
                    EventKind::Modify(_) => {
                        for p in paths {
                            if !is_ignored_path(p) && !is_suppressed(&app_handle, p) {
                                let _ = app_handle.emit(
                                    "file-changed",
                                    p.to_string_lossy().to_string(),
                                );
                            }
                        }
                        let _ = app_handle.emit("tree-changed", &watch_path);
                    }
                    _ => {}
                }
            }
        },
        notify::Config::default(),
    )
    .map_err(|e| format!("Failed to create watcher: {}", e))?;

    watcher
        .watch(Path::new(&path), RecursiveMode::Recursive)
        .map_err(|e| format!("Failed to start watching: {}", e))?;

    *guard = Some(watcher);
    Ok(())
}

#[tauri::command]
pub fn stop_watcher(app: AppHandle) -> Result<(), String> {
    let state = app.state::<WatcherState>();
    let mut guard = state.watcher.lock().map_err(|e| e.to_string())?;
    *guard = None;
    Ok(())
}
