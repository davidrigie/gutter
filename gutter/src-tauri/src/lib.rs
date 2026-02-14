mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
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
            commands::comments::read_comments,
            commands::comments::write_comments,
            commands::comments::delete_comments,
            commands::comments::write_companion,
            commands::comments::delete_companion,
            commands::workspace::read_directory,
            commands::workspace::get_parent_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
