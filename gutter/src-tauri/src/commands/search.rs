use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Serialize, Clone)]
#[serde(tag = "type")]
pub enum SearchResult {
    Heading {
        path: String,
        text: String,
        level: u8,
        line: usize,
    },
    Content {
        path: String,
        line: usize,
        snippet: String,
        match_offset: usize,
    },
}

const MAX_HEADINGS: usize = 25;
const MAX_CONTENT: usize = 40;
const MAX_FILE_SIZE: u64 = 1_000_000; // 1MB
const SNIPPET_LEN: usize = 80;

#[tauri::command]
pub fn search_workspace(workspace: String, query: String) -> Result<Vec<SearchResult>, String> {
    if query.is_empty() {
        return Ok(vec![]);
    }

    let query_lower = query.to_lowercase();
    let mut headings: Vec<SearchResult> = Vec::new();
    let mut content: Vec<SearchResult> = Vec::new();

    collect_md_files(Path::new(&workspace), &query_lower, &mut headings, &mut content, 0);

    // Truncate to caps
    headings.truncate(MAX_HEADINGS);
    content.truncate(MAX_CONTENT);

    headings.extend(content);
    Ok(headings)
}

fn collect_md_files(
    dir: &Path,
    query: &str,
    headings: &mut Vec<SearchResult>,
    content: &mut Vec<SearchResult>,
    depth: u32,
) {
    if depth > 10 {
        return;
    }
    if headings.len() >= MAX_HEADINGS && content.len() >= MAX_CONTENT {
        return;
    }

    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files and comment files
        if name.starts_with('.') {
            continue;
        }
        if name.ends_with(".comments.json") || name.ends_with(".comments.md") {
            continue;
        }

        if path.is_dir() {
            collect_md_files(&path, query, headings, content, depth + 1);
        } else if name.ends_with(".md") || name.ends_with(".markdown") {
            // Skip large files
            if let Ok(meta) = fs::metadata(&path) {
                if meta.len() > MAX_FILE_SIZE {
                    continue;
                }
            }
            search_file(&path, query, headings, content);
        }

        if headings.len() >= MAX_HEADINGS && content.len() >= MAX_CONTENT {
            return;
        }
    }
}

fn search_file(
    path: &Path,
    query: &str,
    headings: &mut Vec<SearchResult>,
    content: &mut Vec<SearchResult>,
) {
    let text = match fs::read_to_string(path) {
        Ok(t) => t,
        Err(_) => return,
    };

    let path_str = path.to_string_lossy().to_string();

    for (line_idx, line) in text.lines().enumerate() {
        let line_lower = line.to_lowercase();

        // Check for heading match
        if headings.len() < MAX_HEADINGS && line.starts_with('#') {
            if let Some(level) = parse_heading_level(line) {
                let heading_text = line[level as usize..].trim_start_matches(' ').to_string();
                if heading_text.to_lowercase().contains(query) {
                    headings.push(SearchResult::Heading {
                        path: path_str.clone(),
                        text: heading_text,
                        level,
                        line: line_idx + 1,
                    });
                }
            }
        }

        // Check for content match (skip headings to avoid duplicates)
        if content.len() < MAX_CONTENT && !line.starts_with('#') {
            if let Some(match_pos) = line_lower.find(query) {
                let (snippet, match_offset) = build_snippet(line, match_pos, query.len());
                content.push(SearchResult::Content {
                    path: path_str.clone(),
                    line: line_idx + 1,
                    snippet,
                    match_offset,
                });
            }
        }
    }
}

fn parse_heading_level(line: &str) -> Option<u8> {
    let hashes = line.bytes().take_while(|&b| b == b'#').count();
    if hashes >= 1 && hashes <= 6 {
        // Must be followed by a space or end of line
        let rest = &line[hashes..];
        if rest.is_empty() || rest.starts_with(' ') {
            return Some(hashes as u8);
        }
    }
    None
}

fn build_snippet(line: &str, match_pos: usize, _match_len: usize) -> (String, usize) {
    let trimmed = line.trim();
    let leading = line.len() - line.trim_start().len();
    // Adjust match position for removed leading whitespace
    let adj_pos = match_pos.saturating_sub(leading).min(trimmed.len().saturating_sub(1));

    if trimmed.len() <= SNIPPET_LEN {
        return (trimmed.to_string(), adj_pos);
    }

    // Center the snippet around the match
    let half = SNIPPET_LEN / 2;
    let start = adj_pos.saturating_sub(half);
    let end = (start + SNIPPET_LEN).min(trimmed.len());
    let start = if end == trimmed.len() {
        end.saturating_sub(SNIPPET_LEN)
    } else {
        start
    };

    // Adjust to char boundaries
    let start = trimmed.floor_char_boundary(start);
    let end = trimmed.ceil_char_boundary(end);

    let mut snippet = String::new();
    if start > 0 {
        snippet.push_str("...");
    }
    snippet.push_str(&trimmed[start..end]);
    if end < trimmed.len() {
        snippet.push_str("...");
    }

    let match_offset = if start > 0 { 3 } else { 0 } + adj_pos.saturating_sub(start);
    (snippet, match_offset)
}
