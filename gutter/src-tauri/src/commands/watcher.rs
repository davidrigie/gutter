use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager};

struct WatcherState {
    watcher: Mutex<Option<RecommendedWatcher>>,
    /// Tracks recently-written paths so we can ignore our own writes
    recent_writes: Mutex<Vec<(PathBuf, Instant)>>,
}

pub fn init(app: &tauri::App) {
    app.manage(WatcherState {
        watcher: Mutex::new(None),
        recent_writes: Mutex::new(Vec::new()),
    });
}

/// Call this before writing files to suppress watcher notifications
pub fn mark_write(app: &AppHandle) {
    // We don't know exact path yet, so mark a global timestamp
    if let Some(state) = app.try_state::<WatcherState>() {
        if let Ok(mut guard) = state.recent_writes.lock() {
            // Use empty path as global marker
            guard.push((PathBuf::new(), Instant::now()));
            // Prune old entries
            guard.retain(|(_, t)| t.elapsed() < Duration::from_secs(5));
        }
    }
}

/// Check if a path was recently written by us
fn was_recently_written(app: &AppHandle, _path: &Path) -> bool {
    if let Some(state) = app.try_state::<WatcherState>() {
        if let Ok(guard) = state.recent_writes.lock() {
            // Check if any write happened in the last 5 seconds
            return guard.iter().any(|(_, t)| t.elapsed() < Duration::from_secs(5));
        }
    }
    false
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

    // Debounce: track recently emitted file-changed paths to avoid duplicates
    let recently_emitted: std::sync::Arc<Mutex<HashSet<String>>> =
        std::sync::Arc::new(Mutex::new(HashSet::new()));
    let emitted_clone = recently_emitted.clone();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let paths = &event.paths;

                // Skip if all paths are ignored
                if paths.iter().all(|p| is_ignored_path(p)) {
                    return;
                }

                // Check if this is likely our own write
                for p in paths {
                    if was_recently_written(&app_handle, p) {
                        return;
                    }
                }

                match event.kind {
                    EventKind::Create(_) | EventKind::Remove(_) => {
                        let _ = app_handle.emit("tree-changed", &watch_path);
                    }
                    EventKind::Modify(_) => {
                        // Emit file-changed for non-ignored files, with dedup
                        for p in paths {
                            if !is_ignored_path(p) {
                                let path_str = p.to_string_lossy().to_string();
                                // Deduplicate: skip if we emitted this path recently
                                if let Ok(mut set) = emitted_clone.lock() {
                                    if set.contains(&path_str) {
                                        continue;
                                    }
                                    set.insert(path_str.clone());
                                    // Clean up after 2 seconds
                                    let set_ref = emitted_clone.clone();
                                    let ps = path_str.clone();
                                    std::thread::spawn(move || {
                                        std::thread::sleep(Duration::from_secs(2));
                                        if let Ok(mut s) = set_ref.lock() {
                                            s.remove(&ps);
                                        }
                                    });
                                }
                                let _ = app_handle.emit(
                                    "file-changed",
                                    path_str,
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
