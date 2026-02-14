use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::Mutex;
use std::time::Instant;
use tauri::{AppHandle, Emitter, Manager};

struct WatcherState {
    watcher: Mutex<Option<RecommendedWatcher>>,
    /// Tracks the last time we wrote a file, so we can ignore our own writes
    last_write: Mutex<Option<Instant>>,
}

pub fn init(app: &tauri::App) {
    app.manage(WatcherState {
        watcher: Mutex::new(None),
        last_write: Mutex::new(None),
    });
}

/// Call this before writing files to suppress watcher notifications
pub fn mark_write(app: &AppHandle) {
    if let Some(state) = app.try_state::<WatcherState>() {
        if let Ok(mut guard) = state.last_write.lock() {
            *guard = Some(Instant::now());
        }
    }
}

fn is_ignored_path(path: &Path) -> bool {
    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
    // Ignore comment sidecar files
    if name.ends_with(".comments.json") || name.ends_with(".comments.md") {
        return true;
    }
    // Ignore .gutter directory (settings, history snapshots)
    let path_str = path.to_string_lossy();
    if path_str.contains("/.gutter/") || path_str.contains("\\.gutter\\") {
        return true;
    }
    // Ignore hidden files and directories
    if name.starts_with('.') {
        return true;
    }
    false
}

#[tauri::command]
pub fn start_watcher(app: AppHandle, path: String) -> Result<(), String> {
    let state = app.state::<WatcherState>();
    let mut guard = state.watcher.lock().map_err(|e| e.to_string())?;

    // Stop existing watcher
    *guard = None;

    let app_handle = app.clone();
    let watch_path = path.clone();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let paths = &event.paths;

                // Skip if all paths are ignored
                if paths.iter().all(|p| is_ignored_path(p)) {
                    return;
                }

                // Check if this is likely our own write (within 3 seconds)
                if let Some(ws) = app_handle.try_state::<WatcherState>() {
                    if let Ok(guard) = ws.last_write.lock() {
                        if let Some(last) = *guard {
                            if last.elapsed().as_secs() < 3 {
                                return;
                            }
                        }
                    }
                }

                match event.kind {
                    EventKind::Create(_) | EventKind::Remove(_) => {
                        let _ = app_handle.emit("tree-changed", &watch_path);
                    }
                    EventKind::Modify(_) => {
                        // Emit file-changed for non-ignored files
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
