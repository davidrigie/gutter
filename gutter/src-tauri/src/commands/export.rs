use std::fs;

#[tauri::command]
pub fn export_html(content: String, path: String) -> Result<(), String> {
    let html = format!(
        r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported Document</title>
  <style>
    body {{ max-width: 48rem; margin: 2rem auto; padding: 0 1rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; }}
    h1 {{ font-size: 2rem; margin: 1.5rem 0 0.75rem; }}
    h2 {{ font-size: 1.5rem; margin: 1.25rem 0 0.625rem; }}
    h3 {{ font-size: 1.25rem; margin: 1rem 0 0.5rem; }}
    pre {{ background: #f5f5f5; padding: 1rem; border-radius: 6px; overflow-x: auto; }}
    code {{ background: #f0f0f0; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }}
    pre code {{ background: none; padding: 0; }}
    blockquote {{ border-left: 3px solid #ddd; margin: 1rem 0; padding: 0.5rem 1rem; color: #555; }}
    table {{ border-collapse: collapse; width: 100%; }}
    th, td {{ border: 1px solid #ddd; padding: 0.5rem; text-align: left; }}
    th {{ background: #f5f5f5; }}
    mark {{ background: #fef08a; padding: 0.1em 0.2em; border-radius: 2px; }}
    img {{ max-width: 100%; }}
    hr {{ border: none; border-top: 1px solid #ddd; margin: 2rem 0; }}
  </style>
</head>
<body>
{}
</body>
</html>"#,
        content
    );
    fs::write(&path, html).map_err(|e| format!("Failed to export HTML: {}", e))
}
