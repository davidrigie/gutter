use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::Path;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

struct WatcherState(Mutex<Option<RecommendedWatcher>>);

pub fn init(app: &tauri::App) {
    app.manage(WatcherState(Mutex::new(None)));
}

fn is_comment_file(path: &Path) -> bool {
    let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("");
    name.ends_with(".comments.json") || name.ends_with(".comments.md")
}

#[tauri::command]
pub fn start_watcher(app: AppHandle, path: String) -> Result<(), String> {
    let state = app.state::<WatcherState>();
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;

    // Stop existing watcher
    *guard = None;

    let app_handle = app.clone();
    let watch_path = path.clone();

    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                let paths = &event.paths;
                let any_comment = paths.iter().all(|p| is_comment_file(p));
                if any_comment {
                    return;
                }

                match event.kind {
                    EventKind::Create(_) | EventKind::Remove(_) | EventKind::Modify(_) => {
                        // Check if it's a file content change
                        let is_content_change = matches!(
                            event.kind,
                            EventKind::Modify(notify::event::ModifyKind::Data(_))
                        );

                        if is_content_change {
                            for p in paths {
                                if !is_comment_file(p) {
                                    let _ = app_handle.emit(
                                        "file-changed",
                                        p.to_string_lossy().to_string(),
                                    );
                                }
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
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    *guard = None;
    Ok(())
}
