use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

struct WatcherState {
    watcher: Mutex<Option<RecommendedWatcher>>,
}

pub fn init(app: &tauri::App) {
    app.manage(WatcherState {
        watcher: Mutex::new(None),
    });
}

/// Legacy — kept for API compatibility with file_io.rs / comments.rs
pub fn mark_write(_app: &AppHandle) {}

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

                if paths.iter().all(|p| is_ignored_path(p)) {
                    return;
                }

                match event.kind {
                    EventKind::Create(_) | EventKind::Remove(_) => {
                        let _ = app_handle.emit("tree-changed", &watch_path);
                    }
                    EventKind::Modify(_) => {
                        for p in paths {
                            if !is_ignored_path(p) {
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
