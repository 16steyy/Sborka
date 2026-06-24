use crate::models::FileNode;
use crate::pack_manager::{pack_root, touch_pack};
use std::fs;
use std::path::{Component, Path, PathBuf};

const SKIP_FILES: &[&str] = &["sborka.json"];

fn resolve_path(pack_id: &str, relative: &str) -> Result<PathBuf, String> {
    let root = pack_root(pack_id)?;
    let rel = Path::new(relative);
    if rel
        .components()
        .any(|c| matches!(c, Component::ParentDir | Component::RootDir | Component::Prefix(_)))
    {
        return Err("Недопустимый путь".into());
    }
    let full = root.join(rel);
    if !full.starts_with(&root) {
        return Err("Путь выходит за пределы сборки".into());
    }
    Ok(full)
}

fn detect_language(path: &str) -> String {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    match ext.as_str() {
        "js" | "mjs" | "cjs" => "javascript",
        "ts" | "tsx" => "typescript",
        "java" => "java",
        "toml" => "toml",
        "json" | "mcmeta" => "json",
        "json5" => "json",
        "txt" | "log" => "plaintext",
        "md" | "markdown" => "markdown",
        "properties" | "lang" => "properties",
        "cfg" | "conf" | "ini" => "ini",
        "yaml" | "yml" => "yaml",
        "xml" | "html" | "htm" => "html",
        "css" | "scss" => "css",
        "zs" => "java",
        "snbt" => "json",
        "sh" | "bat" | "ps1" => "shell",
        "gradle" => "groovy",
        "gitignore" | "gitattributes" => "plaintext",
        _ => "plaintext",
    }
    .to_string()
}

fn build_tree(dir: &Path, root: &Path) -> Result<Vec<FileNode>, String> {
    let mut nodes = Vec::new();
    let mut entries: Vec<_> = fs::read_dir(dir).map_err(|e| e.to_string())?.flatten().collect();

    entries.sort_by(|a, b| {
        let a_dir = a.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let b_dir = b.file_type().map(|t| t.is_dir()).unwrap_or(false);
        match (a_dir, b_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.file_name().cmp(&b.file_name()),
        }
    });

    for entry in entries {
        let name = entry.file_name().to_string_lossy().to_string();
        if SKIP_FILES.contains(&name.as_str()) {
            continue;
        }

        let full = entry.path();
        let rel = full
            .strip_prefix(root)
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .replace('\\', "/");

        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let children = if is_dir {
            Some(build_tree(&full, root)?)
        } else {
            None
        };

        nodes.push(FileNode {
            name,
            path: rel,
            is_dir,
            children,
        });
    }

    Ok(nodes)
}

pub fn list_files(pack_id: &str) -> Result<Vec<FileNode>, String> {
    let root = pack_root(pack_id)?;
    build_tree(&root, &root)
}

pub fn read_file(pack_id: &str, path: &str) -> Result<crate::models::FileContent, String> {
    let full = resolve_path(pack_id, path)?;
    if !full.exists() || full.is_dir() {
        return Err("Файл не найден".into());
    }
    let content = fs::read_to_string(&full).map_err(|e| e.to_string())?;
    Ok(crate::models::FileContent {
        path: path.to_string(),
        content,
        language: detect_language(path),
    })
}

pub fn write_file(pack_id: &str, path: &str, content: &str) -> Result<(), String> {
    let full = resolve_path(pack_id, path)?;
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&full, content).map_err(|e| e.to_string())?;
    touch_pack(pack_id)?;
    Ok(())
}

pub fn create_file(pack_id: &str, path: &str) -> Result<(), String> {
    let full = resolve_path(pack_id, path)?;
    if full.exists() {
        return Err("Файл уже существует".into());
    }
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&full, "").map_err(|e| e.to_string())?;
    touch_pack(pack_id)?;
    Ok(())
}

pub fn create_folder(pack_id: &str, path: &str) -> Result<(), String> {
    let full = resolve_path(pack_id, path)?;
    fs::create_dir_all(&full).map_err(|e| e.to_string())?;
    touch_pack(pack_id)?;
    Ok(())
}

pub fn delete_path(pack_id: &str, path: &str) -> Result<(), String> {
    let full = resolve_path(pack_id, path)?;
    if !full.exists() {
        return Err("Путь не найден".into());
    }
    if full.is_dir() {
        fs::remove_dir_all(&full).map_err(|e| e.to_string())?;
    } else {
        fs::remove_file(&full).map_err(|e| e.to_string())?;
    }
    touch_pack(pack_id)?;
    Ok(())
}

pub fn rename_path(pack_id: &str, old_path: &str, new_name: &str) -> Result<String, String> {
    if new_name.contains('/') || new_name.contains('\\') || new_name.is_empty() {
        return Err("Недопустимое имя".into());
    }
    let full = resolve_path(pack_id, old_path)?;
    if !full.exists() {
        return Err("Путь не найден".into());
    }
    let new_full = full
        .parent()
        .ok_or("Недопустимый путь")?
        .join(new_name);
    fs::rename(&full, &new_full).map_err(|e| e.to_string())?;
    touch_pack(pack_id)?;

    let root = pack_root(pack_id)?;
    let new_rel = new_full
        .strip_prefix(&root)
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .replace('\\', "/");
    Ok(new_rel)
}

pub fn search_in_files(pack_id: &str, query: &str) -> Result<Vec<(String, u32, String)>, String> {
    if query.trim().is_empty() {
        return Ok(vec![]);
    }
    let root = pack_root(pack_id)?;
    let query_lower = query.to_lowercase();
    let mut results = Vec::new();

    fn walk(
        dir: &Path,
        root: &Path,
        query: &str,
        results: &mut Vec<(String, u32, String)>,
    ) -> Result<(), String> {
        for entry in fs::read_dir(dir).map_err(|e| e.to_string())?.flatten() {
            let path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            if SKIP_FILES.contains(&name.as_str()) {
                continue;
            }
            if path.is_dir() {
                walk(&path, root, query, results)?;
            } else {
                let rel = path
                    .strip_prefix(root)
                    .map_err(|e| e.to_string())?
                    .to_string_lossy()
                    .replace('\\', "/");
                if let Ok(content) = fs::read_to_string(&path) {
                    for (i, line) in content.lines().enumerate() {
                        if line.to_lowercase().contains(query) {
                            results.push((rel.clone(), (i + 1) as u32, line.trim().to_string()));
                            if results.len() >= 100 {
                                return Ok(());
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }

    walk(&root, &root, &query_lower, &mut results)?;
    Ok(results)
}
