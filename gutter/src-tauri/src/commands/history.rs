use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize, Deserialize, Clone)]
pub struct SnapshotMeta {
    pub id: String,
    pub timestamp: u64,
    pub content_hash: String,
    pub name: Option<String>,
    pub description: Option<String>,
    pub pinned: bool,
    pub size_bytes: u64,
}

#[derive(Serialize)]
pub struct GitCommit {
    pub hash: String,
    pub short_hash: String,
    pub message: String,
    pub author: String,
    pub timestamp: u64,
    pub path: String,
}

fn history_dir(file_path: &str) -> PathBuf {
    let mut hasher = Sha256::new();
    hasher.update(file_path.as_bytes());
    let hash = format!("{:x}", hasher.finalize());
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join(".gutter")
        .join("history")
        .join(&hash[..16]) // Use first 16 chars for shorter directory names
}

fn meta_path(file_path: &str) -> PathBuf {
    history_dir(file_path).join("meta.json")
}

fn snapshots_dir(file_path: &str) -> PathBuf {
    history_dir(file_path).join("snapshots")
}

fn read_meta(file_path: &str) -> Vec<SnapshotMeta> {
    let path = meta_path(file_path);
    if !path.exists() {
        return Vec::new();
    }
    fs::read_to_string(&path)
        .ok()
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn write_meta(file_path: &str, meta: &[SnapshotMeta]) -> Result<(), String> {
    let dir = history_dir(file_path);
    if !dir.exists() {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create history dir: {}", e))?;
    }
    let json =
        serde_json::to_string_pretty(meta).map_err(|e| format!("Failed to serialize: {}", e))?;
    fs::write(meta_path(file_path), json)
        .map_err(|e| format!("Failed to write meta: {}", e))
}

fn content_hash(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn now_secs() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

const MAX_AGE_SECS: u64 = 24 * 60 * 60; // 24 hours

#[tauri::command]
pub fn save_snapshot(file_path: String, content: String) -> Result<SnapshotMeta, String> {
    let hash = content_hash(&content);
    let mut meta = read_meta(&file_path);
    let ts = now_secs();

    // Dedup: skip if latest snapshot has the same content hash
    if let Some(latest) = meta.first() {
        if latest.content_hash == hash {
            return Ok(latest.clone());
        }
        // 30s debounce: skip if last snapshot was less than 30s ago
        // UNLESS content is substantially different? No, just follow the plan.
        if ts - latest.timestamp < 30 {
            return Ok(latest.clone());
        }
    }

    // Create snapshot file
    let snap_dir = snapshots_dir(&file_path);
    if !snap_dir.exists() {
        fs::create_dir_all(&snap_dir)
            .map_err(|e| format!("Failed to create snapshots dir: {}", e))?;
    }

    let id = format!("s{}", ts);
    let snap_path = snap_dir.join(format!("{}.md", id));
    fs::write(&snap_path, &content).map_err(|e| format!("Failed to write snapshot: {}", e))?;

    let entry = SnapshotMeta {
        id: id.clone(),
        timestamp: ts,
        content_hash: hash,
        name: None,
        description: None,
        pinned: false,
        size_bytes: content.len() as u64,
    };

    // Insert at front (newest first)
    meta.insert(0, entry.clone());

    // Auto-prune: remove unpinned snapshots older than 7 days
    let cutoff = ts.saturating_sub(MAX_AGE_SECS);
    let mut to_remove = Vec::new();
    meta.retain(|s| {
        if !s.pinned && s.timestamp < cutoff {
            to_remove.push(s.id.clone());
            false
        } else {
            true
        }
    });
    // Clean up pruned snapshot files
    for old_id in to_remove {
        let old_path = snap_dir.join(format!("{}.md", old_id));
        let _ = fs::remove_file(old_path);
    }

    write_meta(&file_path, &meta)?;
    Ok(entry)
}

#[tauri::command]
pub fn list_snapshots(file_path: String) -> Result<Vec<SnapshotMeta>, String> {
    Ok(read_meta(&file_path))
}

#[tauri::command]
pub fn read_snapshot(file_path: String, snapshot_id: String) -> Result<String, String> {
    let path = snapshots_dir(&file_path).join(format!("{}.md", snapshot_id));
    fs::read_to_string(&path).map_err(|e| format!("Snapshot not found: {}", e))
}

#[tauri::command]
pub fn update_snapshot_metadata(
    file_path: String,
    snapshot_id: String,
    name: Option<String>,
    description: Option<String>,
    pinned: Option<bool>,
) -> Result<(), String> {
    let mut meta = read_meta(&file_path);
    if let Some(s) = meta.iter_mut().find(|s| s.id == snapshot_id) {
        if let Some(n) = name {
            s.name = if n.is_empty() { None } else { Some(n) };
        }
        if let Some(d) = description {
            s.description = if d.is_empty() { None } else { Some(d) };
        }
        if let Some(p) = pinned {
            s.pinned = p;
        }
    } else {
        return Err("Snapshot not found".to_string());
    }
    write_meta(&file_path, &meta)
}

#[tauri::command]
pub fn delete_snapshot(file_path: String, snapshot_id: String) -> Result<(), String> {
    let mut meta = read_meta(&file_path);
    meta.retain(|s| s.id != snapshot_id);
    // Remove snapshot file
    let snap_path = snapshots_dir(&file_path).join(format!("{}.md", snapshot_id));
    let _ = fs::remove_file(snap_path);
    write_meta(&file_path, &meta)
}

#[tauri::command]
pub fn list_git_history(file_path: String) -> Result<Vec<GitCommit>, String> {
    let path = PathBuf::from(&file_path);
    let dir = path.parent().unwrap_or(&path);

    // Get the repo root
    let repo_root_output = Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .current_dir(dir)
        .output();

    let repo_root = match repo_root_output {
        Ok(o) if o.status.success() => PathBuf::from(String::from_utf8_lossy(&o.stdout).trim()),
        _ => return Ok(Vec::new()), // Not a git repo
    };

    // Use --name-only to get the path of the file in each commit (handles --follow renames)
    let output = Command::new("git")
        .args([
            "log",
            "--follow",
            "--no-merges",
            "--name-only",
            "--format=%H%n%h%n%s%n%an%n%ct",
            "-50",
            "--",
            &file_path,
        ])
        .current_dir(&repo_root)
        .output();

    let output = match output {
        Ok(o) if o.status.success() => o,
        _ => return Ok(Vec::new()),
    };

    let stdout = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = stdout.trim().lines().collect();
    let mut commits = Vec::new();

    let mut i = 0;
    while i + 4 < lines.len() {
        let hash = lines[i].to_string();
        let short_hash = lines[i+1].to_string();
        let message = lines[i+2].to_string();
        let author = lines[i+3].to_string();
        let timestamp = lines[i+4].parse().unwrap_or(0);
        
        // Find the path (next non-empty line after the metadata block)
        let mut path = String::new();
        let mut j = i + 5;
        while j < lines.len() {
            if !lines[j].trim().is_empty() {
                path = lines[j].trim().to_string();
                i = j + 1;
                break;
            }
            j += 1;
        }
        
        if !path.is_empty() {
            commits.push(GitCommit {
                hash,
                short_hash,
                message,
                author,
                timestamp,
                path,
            });
        } else {
            i += 5;
        }
    }

    Ok(commits)
}

#[tauri::command]
pub fn read_git_version(
    file_path: String,
    commit_hash: String,
    commit_path: Option<String>,
) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    let dir = path.parent().unwrap_or(&path);

    // Get the repo root
    let repo_root_output = Command::new("git")
        .args(["rev-parse", "--show-toplevel"])
        .current_dir(dir)
        .output()
        .map_err(|e| format!("Failed to find repo root: {}", e))?;

    if !repo_root_output.status.success() {
        return Err("Not a git repository".to_string());
    }
    let repo_root = PathBuf::from(String::from_utf8_lossy(&repo_root_output.stdout).trim());

    // Use provided commit_path (renames) or fallback to current ls-files path
    let rel_path = if let Some(p) = commit_path {
        p
    } else {
        let rel_output = Command::new("git")
            .args(["ls-files", "--full-name", "--", &file_path])
            .current_dir(dir)
            .output()
            .map_err(|e| format!("Failed to run git: {}", e))?;

        let p = String::from_utf8_lossy(&rel_output.stdout).trim().to_string();
        if p.is_empty() {
            return Err("File not tracked by git".to_string());
        }
        p
    };

    let output = Command::new("git")
        .args(["show", &format!("{}:{}", commit_hash, rel_path)])
        .current_dir(&repo_root)
        .output()
        .map_err(|e| format!("Failed to run git show: {}", e))?;

    if !output.status.success() {
        return Err("Failed to read git version".to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
