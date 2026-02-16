mod commands;
mod menu;

use std::sync::Mutex;
use tauri::{Emitter, Manager, RunEvent};

pub struct OpenFileState {
    pub path: Mutex<Option<String>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // This handles opening a file when an instance is already running (Windows/Linux)
            let path = args.iter().find(|arg| arg.ends_with(".md") || arg.ends_with(".markdown"));
            if let Some(p) = path {
                let _ = app.emit("open-file", p);
            }
        }))
        .manage(OpenFileState {
            path: Mutex::new(None),
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Handle CLI args on Windows/Linux at startup
            let args: Vec<String> = std::env::args().collect();
            let path = args.iter().find(|arg| arg.ends_with(".md") || arg.ends_with(".markdown"));
            if let Some(p) = path {
                let state = app.state::<OpenFileState>();
                *state.path.lock().unwrap() = Some(p.clone());
            }

            menu::setup_menu(app)?;
            commands::watcher::init(app);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::file_io::read_file,
            commands::file_io::write_file,
            commands::file_io::file_exists,
            commands::file_io::delete_file,
            commands::file_io::create_file,
            commands::file_io::create_directory,
            commands::file_io::rename_path,
            commands::file_io::delete_path,
            commands::file_io::save_image,
            commands::file_io::copy_image,
            commands::file_io::open_url,
            commands::file_io::get_open_file_path,
            commands::comments::read_comments,
            commands::comments::write_comments,
            commands::comments::delete_comments,
            commands::comments::write_companion,
            commands::comments::delete_companion,
            commands::workspace::read_directory,
            commands::workspace::get_parent_dir,
            commands::settings::read_settings,
            commands::settings::write_settings,
            commands::watcher::start_watcher,
            commands::watcher::stop_watcher,
            commands::export::export_html,
            commands::search::search_workspace,
            commands::templates::init_default_templates,
            commands::templates::list_templates,
            commands::templates::read_template,
            commands::templates::save_template,
            commands::templates::delete_template,
            commands::history::save_snapshot,
            commands::history::list_snapshots,
            commands::history::read_snapshot,
            commands::history::pin_snapshot,
            commands::history::rename_snapshot,
            commands::history::delete_snapshot,
            commands::history::list_git_history,
            commands::history::read_git_version,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            match event {
                RunEvent::Opened { urls } => {
                    if let Some(url) = urls.first() {
                        if let Ok(path) = url.to_file_path() {
                            let path_str = path.to_string_lossy().to_string();
                            let state = app_handle.state::<OpenFileState>();
                            *state.path.lock().unwrap() = Some(path_str.clone());
                            let _ = app_handle.emit("open-file", path_str);
                        }
                    }
                }
                RunEvent::ExitRequested { .. } => {
                    // Default behavior is fine
                }
                RunEvent::Exit => {
                    // Stop the watcher so its background thread shuts down cleanly
                    let _ = commands::watcher::stop_watcher(app_handle.clone());
                }
                _ => {}
            }
        });
}
