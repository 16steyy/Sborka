use crate::models::{ExportFormat, MrPackIndex, PackMeta};
use crate::pack_manager::{create_pack_from_import, pack_root, read_meta_internal};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::{Read, Seek, Write};
use std::path::{Component, Path, PathBuf};
use zip::read::ZipArchive;
use zip::write::FileOptions;
use zip::{CompressionMethod, ZipWriter};

const INDEX_FILE: &str = "modrinth.index.json";
const SKIP_EXPORT: &[&str] = &["sborka.json"];
const OVERRIDE_PREFIXES: &[&str] = &["overrides/", "client-overrides/", "server-overrides/"];

fn is_safe_relative_path(path: &str) -> bool {
    !Path::new(path).components().any(|c| {
        matches!(
            c,
            Component::ParentDir | Component::RootDir | Component::Prefix(_)
        )
    })
}

fn strip_override_prefix(name: &str) -> Option<&str> {
    for prefix in OVERRIDE_PREFIXES {
        if let Some(rest) = name.strip_prefix(prefix) {
            if !rest.is_empty() && !rest.ends_with('/') {
                return Some(rest);
            }
        }
    }
    None
}

fn parse_dependencies(deps: &HashMap<String, String>) -> (String, String, String) {
    let mc_version = deps
        .get("minecraft")
        .cloned()
        .unwrap_or_else(|| "1.20.1".to_string());

    if let Some(v) = deps.get("fabric-loader") {
        return ("fabric".to_string(), v.clone(), mc_version);
    }
    if let Some(v) = deps.get("quilt-loader") {
        return ("quilt".to_string(), v.clone(), mc_version);
    }
    if let Some(v) = deps.get("neoforge") {
        return ("neoforge".to_string(), v.clone(), mc_version);
    }
    if let Some(v) = deps.get("forge") {
        return ("forge".to_string(), v.clone(), mc_version);
    }

    ("forge".to_string(), String::new(), mc_version)
}

fn build_dependencies(meta: &PackMeta) -> HashMap<String, String> {
    let mut deps = HashMap::new();
    deps.insert("minecraft".to_string(), meta.minecraft_version.clone());
    let loader_key = match meta.loader.as_str() {
        "fabric" => "fabric-loader",
        "quilt" => "quilt-loader",
        "neoforge" => "neoforge",
        _ => "forge",
    };
    if !meta.loader_version.is_empty() {
        deps.insert(loader_key.to_string(), meta.loader_version.clone());
    }
    deps
}

fn should_skip_export(name: &str) -> bool {
    SKIP_EXPORT.contains(&name) || name.starts_with("icon.")
}

pub async fn import_from_path(source_path: &str) -> Result<PackMeta, String> {
    let path = PathBuf::from(source_path);
    if !path.exists() {
        return Err("Файл не найден".into());
    }

    let file = File::open(&path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("Не удалось открыть архив: {}", e))?;

    if archive.by_name(INDEX_FILE).is_ok() {
        import_mrpack(&mut archive).await
    } else {
        let name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("Импортированная сборка")
            .to_string();
        import_plain_zip(&mut archive, &name)
    }
}

async fn import_mrpack<R: Read + Seek>(archive: &mut ZipArchive<R>) -> Result<PackMeta, String> {
    let index_str = {
        let mut index_file = archive
            .by_name(INDEX_FILE)
            .map_err(|e| format!("Не удалось прочитать {}: {}", INDEX_FILE, e))?;
        let mut index_str = String::new();
        index_file
            .read_to_string(&mut index_str)
            .map_err(|e| e.to_string())?;
        index_str
    };

    let index: MrPackIndex =
        serde_json::from_str(&index_str).map_err(|e| format!("Некорректный {}: {}", INDEX_FILE, e))?;

    let (loader, loader_version, mc_version) = parse_dependencies(&index.dependencies);

    let meta = create_pack_from_import(
        index.name.clone(),
        index.summary.clone().unwrap_or_default(),
        mc_version,
        loader,
        loader_version,
    )?;
    let root = pack_root(&meta.id)?;

    let client = reqwest::Client::builder()
        .user_agent(crate::modrinth::USER_AGENT)
        .build()
        .map_err(|e| e.to_string())?;

    for file_entry in &index.files {
        if !is_safe_relative_path(&file_entry.path) {
            continue;
        }
        let dest = root.join(&file_entry.path.replace('/', std::path::MAIN_SEPARATOR_STR));
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        if let Some(url) = file_entry.downloads.first() {
            let response = client
                .get(url)
                .send()
                .await
                .map_err(|e| format!("Ошибка загрузки {}: {}", file_entry.path, e))?;
            let bytes = response
                .bytes()
                .await
                .map_err(|e| format!("Ошибка чтения {}: {}", file_entry.path, e))?;
            fs::write(&dest, &bytes).map_err(|e| e.to_string())?;
        }
    }

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = file.name().to_string();
        if name == INDEX_FILE || name.ends_with('/') {
            continue;
        }
        if let Some(rel) = strip_override_prefix(&name) {
            if !is_safe_relative_path(rel) {
                continue;
            }
            let dest = root.join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
            if let Some(parent) = dest.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut contents = Vec::new();
            file.read_to_end(&mut contents).map_err(|e| e.to_string())?;
            fs::write(dest, contents).map_err(|e| e.to_string())?;
        }
    }

    Ok(meta)
}

fn import_plain_zip<R: Read + Seek>(
    archive: &mut ZipArchive<R>,
    default_name: &str,
) -> Result<PackMeta, String> {
    let meta = create_pack_from_import(
        default_name.to_string(),
        String::new(),
        "1.20.1".to_string(),
        "forge".to_string(),
        String::new(),
    )?;
    let root = pack_root(&meta.id)?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = file.name().to_string();
        if name.ends_with('/') || name == "sborka.json" {
            continue;
        }

        let rel = if let Some(r) = strip_override_prefix(&name) {
            r
        } else {
            &name
        };

        if !is_safe_relative_path(rel) {
            continue;
        }

        let dest = root.join(rel.replace('/', std::path::MAIN_SEPARATOR_STR));
        if !dest.starts_with(&root) {
            continue;
        }
        if let Some(parent) = dest.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let mut contents = Vec::new();
        file.read_to_end(&mut contents).map_err(|e| e.to_string())?;
        fs::write(dest, contents).map_err(|e| e.to_string())?;
    }

    Ok(meta)
}

fn collect_pack_files(root: &Path, base: &Path, files: &mut Vec<PathBuf>) -> Result<(), String> {
    for entry in fs::read_dir(base).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let rel = path
            .strip_prefix(root)
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .replace('\\', "/");

        if path.is_dir() {
            collect_pack_files(root, &path, files)?;
        } else if !should_skip_export(&rel) {
            files.push(path);
        }
    }
    Ok(())
}

pub fn export_pack(pack_id: &str, format: ExportFormat, dest_path: &str) -> Result<(), String> {
    let root = pack_root(pack_id)?;
    let meta = read_meta_internal(&root.join("sborka.json"))?;

    let file = File::create(dest_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);
    let options: FileOptions<'_, ()> = FileOptions::default()
        .compression_method(CompressionMethod::Deflated);

    let mut pack_files = Vec::new();
    collect_pack_files(&root, &root, &mut pack_files)?;

    match format {
        ExportFormat::Mrpack => {
            let index = MrPackIndex {
                format_version: 1,
                game: "minecraft".to_string(),
                version_id: "1.0.0".to_string(),
                name: meta.name.clone(),
                summary: if meta.description.is_empty() {
                    None
                } else {
                    Some(meta.description.clone())
                },
                files: vec![],
                dependencies: build_dependencies(&meta),
            };

            let index_json =
                serde_json::to_string_pretty(&index).map_err(|e| e.to_string())?;
            zip.start_file(INDEX_FILE, options)
                .map_err(|e| e.to_string())?;
            zip.write_all(index_json.as_bytes())
                .map_err(|e| e.to_string())?;

            for path in &pack_files {
                let rel = path
                    .strip_prefix(&root)
                    .map_err(|e| e.to_string())?
                    .to_string_lossy()
                    .replace('\\', "/");
                let zip_path = format!("overrides/{}", rel);
                let data = fs::read(path).map_err(|e| e.to_string())?;
                zip.start_file(&zip_path, options)
                    .map_err(|e| e.to_string())?;
                zip.write_all(&data).map_err(|e| e.to_string())?;
            }
        }
        ExportFormat::Zip => {
            for path in &pack_files {
                let rel = path
                    .strip_prefix(&root)
                    .map_err(|e| e.to_string())?
                    .to_string_lossy()
                    .replace('\\', "/");
                let data = fs::read(path).map_err(|e| e.to_string())?;
                zip.start_file(&rel, options)
                    .map_err(|e| e.to_string())?;
                zip.write_all(&data).map_err(|e| e.to_string())?;
            }
        }
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

pub async fn import_from_bytes(data: &[u8]) -> Result<PackMeta, String> {
    let cursor = std::io::Cursor::new(data);
    let mut archive =
        ZipArchive::new(cursor).map_err(|e| format!("Не удалось открыть архив: {}", e))?;

    if archive.by_name(INDEX_FILE).is_ok() {
        import_mrpack(&mut archive).await
    } else {
        import_plain_zip(&mut archive, "Modrinth сборка")
    }
}
