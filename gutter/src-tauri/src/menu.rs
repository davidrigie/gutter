use tauri::{
    menu::{MenuBuilder, MenuItem, SubmenuBuilder},
    App, Emitter,
};

pub fn setup_menu(app: &App) -> Result<(), Box<dyn std::error::Error>> {
    // --- Preferences ---
    let preferences = MenuItem::with_id(
        app,
        "preferences",
        "Preferences",
        true,
        Some("CmdOrCtrl+,"),
    )?;

    // --- File menu ---
    let new_file = MenuItem::with_id(app, "new_file", "New File", true, Some("CmdOrCtrl+N"))?;
    let open = MenuItem::with_id(app, "open", "Open File", true, Some("CmdOrCtrl+O"))?;
    let save = MenuItem::with_id(app, "save", "Save", true, Some("CmdOrCtrl+S"))?;
    let new_from_template = MenuItem::with_id(
        app,
        "new_from_template",
        "New from Template...",
        true,
        None::<&str>,
    )?;
    let save_as_template = MenuItem::with_id(
        app,
        "save_as_template",
        "Save as Template...",
        true,
        None::<&str>,
    )?;
    let export =
        MenuItem::with_id(app, "export", "Export", true, Some("CmdOrCtrl+Shift+E"))?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(&new_file)
        .item(&open)
        .item(&save)
        .separator()
        .item(&new_from_template)
        .item(&save_as_template)
        .separator()
        .item(&export)
        .separator()
        .close_window()
        .build()?;

    // --- Edit menu (all predefined — OS handles these natively) ---
    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    // --- View menu ---
    let toggle_tree = MenuItem::with_id(
        app,
        "toggle_tree",
        "Toggle File Tree",
        true,
        Some("CmdOrCtrl+\\"),
    )?;
    let toggle_comments = MenuItem::with_id(
        app,
        "toggle_comments",
        "Toggle Comments",
        true,
        Some("CmdOrCtrl+Shift+C"),
    )?;
    let toggle_outline =
        MenuItem::with_id(app, "toggle_outline", "Toggle Outline", true, None::<&str>)?;
    let toggle_source = MenuItem::with_id(
        app,
        "toggle_source",
        "Toggle Source Mode",
        true,
        Some("CmdOrCtrl+/"),
    )?;
    let toggle_reading = MenuItem::with_id(
        app,
        "toggle_reading",
        "Reading Mode",
        true,
        Some("CmdOrCtrl+Shift+R"),
    )?;
    let toggle_history = MenuItem::with_id(
        app,
        "toggle_history",
        "Version History",
        true,
        Some("CmdOrCtrl+Shift+H"),
    )?;
    let cycle_theme = MenuItem::with_id(
        app,
        "cycle_theme",
        "Cycle Theme",
        true,
        Some("CmdOrCtrl+Shift+D"),
    )?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(&toggle_tree)
        .item(&toggle_comments)
        .item(&toggle_history)
        .item(&toggle_outline)
        .separator()
        .item(&toggle_source)
        .item(&toggle_reading)
        .separator()
        .item(&cycle_theme)
        .build()?;

    // --- Find menu ---
    let search = MenuItem::with_id(app, "search", "Search", true, Some("CmdOrCtrl+K"))?;
    let quick_open = MenuItem::with_id(
        app,
        "quick_open",
        "Quick Open File",
        true,
        Some("CmdOrCtrl+P"),
    )?;
    let find = MenuItem::with_id(app, "find", "Find", true, Some("CmdOrCtrl+F"))?;
    let replace = MenuItem::with_id(
        app,
        "replace",
        "Find && Replace",
        true,
        Some("CmdOrCtrl+H"),
    )?;

    let find_menu = SubmenuBuilder::new(app, "Find")
        .item(&search)
        .item(&quick_open)
        .separator()
        .item(&find)
        .item(&replace)
        .build()?;

    // --- Comments menu ---
    let new_comment = MenuItem::with_id(
        app,
        "new_comment",
        "New Comment",
        true,
        Some("CmdOrCtrl+Shift+M"),
    )?;
    let next_comment = MenuItem::with_id(
        app,
        "next_comment",
        "Next Comment",
        true,
        Some("CmdOrCtrl+Shift+N"),
    )?;
    let prev_comment = MenuItem::with_id(
        app,
        "prev_comment",
        "Previous Comment",
        true,
        Some("CmdOrCtrl+Shift+P"),
    )?;

    let comments_menu = SubmenuBuilder::new(app, "Comments")
        .item(&new_comment)
        .item(&next_comment)
        .item(&prev_comment)
        .build()?;

    // --- Window menu ---
    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .separator()
        .close_window()
        .build()?;

    // --- Build the top-level menu ---
    // On macOS, include the standard app menu as the first submenu
    #[cfg(target_os = "macos")]
    let app_menu = SubmenuBuilder::new(app, "Gutter")
        .about(None)
        .separator()
        .item(&preferences)
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    let builder = MenuBuilder::new(app);

    #[cfg(target_os = "macos")]
    let builder = builder.item(&app_menu);

    let menu = builder
        .item(&file_menu)
        .item(&edit_menu)
        .item(&view_menu)
        .item(&find_menu)
        .item(&comments_menu)
        .item(&window_menu)
        .build()?;

    app.set_menu(menu)?;

    // Handle custom menu item clicks by emitting events to the frontend.
    // Predefined items (copy, paste, undo, etc.) are handled natively by the OS.
    app.on_menu_event(move |app_handle, event| {
        let event_name = match event.id().as_ref() {
            "preferences" => "menu:preferences",
            "new_file" => "menu:new-file",
            "open" => "menu:open",
            "save" => "menu:save",
            "new_from_template" => "menu:new-from-template",
            "save_as_template" => "menu:save-as-template",
            "export" => "menu:export",
            "toggle_tree" => "menu:toggle-tree",
            "toggle_comments" => "menu:toggle-comments",
            "toggle_history" => "menu:toggle-history",
            "toggle_outline" => "menu:toggle-outline",
            "toggle_source" => "menu:toggle-source",
            "toggle_reading" => "menu:toggle-reading",
            "cycle_theme" => "menu:cycle-theme",
            "search" => "menu:search",
            "quick_open" => "menu:quick-open",
            "find" => "menu:find",
            "replace" => "menu:replace",
            "new_comment" => "menu:new-comment",
            "next_comment" => "menu:next-comment",
            "prev_comment" => "menu:prev-comment",
            _ => return,
        };
        let _ = app_handle.emit(event_name, ());
    });

    Ok(())
}
