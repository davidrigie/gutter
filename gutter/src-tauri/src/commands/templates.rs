use std::fs;

const TEMPLATE_MEETING_NOTES: &str = r#"# Meeting Notes — {{date}}

## Attendees

-

## Agenda

1.

## Discussion

-

## Action Items

- [ ]
- [ ]
- [ ]
"#;

const TEMPLATE_JOURNAL_ENTRY: &str = r#"# Journal — {{date}}

## What happened today?



## What went well?



## What could be better?



## Gratitude

-

## Tomorrow's priorities

- [ ]
- [ ]
- [ ]
"#;

const TEMPLATE_PROJECT_BRIEF: &str = r#"# Project Brief

**Date:** {{date}}

## Overview



## Goals

1.
2.
3.

## Timeline

| Phase | Target Date | Status |
|-------|-------------|--------|
|       |             |        |
|       |             |        |

## Stakeholders

-

## Risks

-

## Success Criteria

-
"#;

const TEMPLATE_WEEKLY_REVIEW: &str = r#"# Weekly Review — {{date}}

## Accomplishments

-

## In Progress

-

## Blockers

-

## Next Week

- [ ]
- [ ]
- [ ]

## Notes

"#;

const TEMPLATE_BUG_REPORT: &str = r#"# Bug Report

**Date:** {{date}}

## Description



## Steps to Reproduce

1.
2.
3.

## Expected Behavior



## Actual Behavior



## Environment

- OS:
- Version:

## Screenshots



## Additional Context

"#;

const DEFAULT_TEMPLATES: &[(&str, &str)] = &[
    ("Bug Report", TEMPLATE_BUG_REPORT),
    ("Journal Entry", TEMPLATE_JOURNAL_ENTRY),
    ("Meeting Notes", TEMPLATE_MEETING_NOTES),
    ("Project Brief", TEMPLATE_PROJECT_BRIEF),
    ("Weekly Review", TEMPLATE_WEEKLY_REVIEW),
];

fn templates_dir() -> Result<std::path::PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not determine home directory".to_string())?;
    Ok(home.join(".gutter").join("templates"))
}

#[tauri::command]
pub fn init_default_templates() -> Result<(), String> {
    let dir = templates_dir()?;
    if dir.exists() {
        return Ok(());
    }
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create templates dir: {}", e))?;
    for (name, content) in DEFAULT_TEMPLATES {
        let file_path = dir.join(format!("{}.md", name));
        fs::write(&file_path, content)
            .map_err(|e| format!("Failed to write template '{}': {}", name, e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn list_templates() -> Result<Vec<String>, String> {
    let dir = templates_dir()?;
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut names: Vec<String> = fs::read_dir(&dir)
        .map_err(|e| format!("Failed to read templates dir: {}", e))?
        .filter_map(|entry| {
            let entry = entry.ok()?;
            let name = entry.file_name().to_string_lossy().to_string();
            if name.ends_with(".md") {
                Some(name.trim_end_matches(".md").to_string())
            } else {
                None
            }
        })
        .collect();
    names.sort_by(|a, b| a.to_lowercase().cmp(&b.to_lowercase()));
    Ok(names)
}

#[tauri::command]
pub fn read_template(name: String) -> Result<String, String> {
    let file_path = templates_dir()?.join(format!("{}.md", name));
    fs::read_to_string(&file_path).map_err(|e| format!("Failed to read template: {}", e))
}

#[tauri::command]
pub fn save_template(name: String, content: String) -> Result<(), String> {
    let dir = templates_dir()?;
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Failed to create templates dir: {}", e))?;
    }
    let file_path = dir.join(format!("{}.md", name));
    fs::write(&file_path, &content).map_err(|e| format!("Failed to save template: {}", e))
}

#[tauri::command]
pub fn delete_template(name: String) -> Result<(), String> {
    let file_path = templates_dir()?.join(format!("{}.md", name));
    if file_path.exists() {
        fs::remove_file(&file_path).map_err(|e| format!("Failed to delete template: {}", e))
    } else {
        Ok(())
    }
}
