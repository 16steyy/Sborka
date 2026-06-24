use crate::models::{CreatePackRequest, PackMeta, UpdatePackRequest};
use chrono::Utc;
use std::fs;
use std::path::{Path, PathBuf};
use uuid::Uuid;

const META_FILE: &str = "sborka.json";

pub fn get_packs_dir() -> Result<PathBuf, String> {
    let data_dir = dirs::data_dir().ok_or("Не удалось определить папку данных")?;
    let packs_dir = data_dir.join("sborka").join("packs");
    fs::create_dir_all(&packs_dir).map_err(|e| e.to_string())?;
    Ok(packs_dir)
}

fn pack_dir(id: &str) -> Result<PathBuf, String> {
    Ok(get_packs_dir()?.join(id))
}

fn meta_path(id: &str) -> Result<PathBuf, String> {
    Ok(pack_dir(id)?.join(META_FILE))
}

fn read_meta(path: &Path) -> Result<PackMeta, String> {
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

fn write_meta(dir: &Path, meta: &PackMeta) -> Result<(), String> {
    let path = dir.join(META_FILE);
    let content = serde_json::to_string_pretty(meta).map_err(|e| e.to_string())?;
    fs::write(path, content).map_err(|e| e.to_string())
}

fn scaffold_pack(dir: &Path, _loader: &str) -> Result<(), String> {
    let dirs = [
        "mods",
        "config",
        "defaultconfigs",
        "kubejs/server_scripts",
        "kubejs/startup_scripts",
        "kubejs/client_scripts",
        "scripts",
        "resourcepacks",
        "shaderpacks",
    ];
    for d in dirs {
        fs::create_dir_all(dir.join(d)).map_err(|e| e.to_string())?;
    }

    fs::write(dir.join("README.md"), "# modpack\n").map_err(|e| e.to_string())?;

    fs::write(
        dir.join("modpack.toml"),
        r#"name = "modpack"
version = "1.0.0"
[mods]
"#,
    )
    .map_err(|e| e.to_string())?;

    fs::write(
        dir.join("pack.mcmeta"),
        r#"{
  "pack": {
    "pack_format": 15,
    "description": ""
  }
}
"#,
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

pub fn list_packs() -> Result<Vec<PackMeta>, String> {
    let packs_dir = get_packs_dir()?;
    let mut packs = Vec::new();

    let entries = fs::read_dir(&packs_dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let meta_file = entry.path().join(META_FILE);
        if meta_file.exists() {
            if let Ok(meta) = read_meta(&meta_file) {
                packs.push(meta);
            }
        }
    }

    packs.sort_by(|a, b| b.updated_at.cmp(&a.updated_at));
    Ok(packs)
}

pub fn create_pack_from_import(
    name: String,
    description: String,
    minecraft_version: String,
    loader: String,
    loader_version: String,
) -> Result<PackMeta, String> {
    let id = Uuid::new_v4().to_string();
    let dir = pack_dir(&id)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    let meta = PackMeta {
        id: id.clone(),
        name,
        description,
        minecraft_version,
        loader,
        loader_version,
        created_at: now.clone(),
        updated_at: now,
        icon: None,
    };

    write_meta(&dir, &meta)?;
    Ok(meta)
}

pub fn read_meta_internal(path: &Path) -> Result<PackMeta, String> {
    read_meta(path)
}

pub fn create_pack(req: CreatePackRequest) -> Result<PackMeta, String> {
    let id = Uuid::new_v4().to_string();
    let dir = pack_dir(&id)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let now = Utc::now().to_rfc3339();
    let meta = PackMeta {
        id: id.clone(),
        name: req.name,
        description: req.description,
        minecraft_version: req.minecraft_version,
        loader: req.loader.clone(),
        loader_version: req.loader_version,
        created_at: now.clone(),
        updated_at: now,
        icon: None,
    };

    scaffold_pack(&dir, &req.loader)?;
    write_meta(&dir, &meta)?;
    Ok(meta)
}

pub fn get_pack(id: &str) -> Result<PackMeta, String> {
    read_meta(&meta_path(id)?)
}

pub fn update_pack(req: UpdatePackRequest) -> Result<PackMeta, String> {
    let dir = pack_dir(&req.id)?;
    let mut meta = read_meta(&meta_path(&req.id)?)?;

    meta.name = req.name;
    meta.description = req.description;
    meta.minecraft_version = req.minecraft_version;
    meta.loader = req.loader;
    meta.loader_version = req.loader_version;
    meta.updated_at = Utc::now().to_rfc3339();

    write_meta(&dir, &meta)?;
    Ok(meta)
}

pub fn delete_pack(id: &str) -> Result<(), String> {
    let dir = pack_dir(id)?;
    if dir.exists() {
        fs::remove_dir_all(dir).map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn set_pack_icon(id: &str, source_path: &str) -> Result<PackMeta, String> {
    let dir = pack_dir(id)?;
    let ext = Path::new(source_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");
    let icon_name = format!("icon.{}", ext);
    let dest = dir.join(&icon_name);

    fs::copy(source_path, &dest).map_err(|e| e.to_string())?;

    let mut meta = read_meta(&meta_path(id)?)?;
    meta.icon = Some(icon_name);
    meta.updated_at = Utc::now().to_rfc3339();
    write_meta(&dir, &meta)?;
    Ok(meta)
}

pub fn get_pack_icon(id: &str) -> Result<Option<String>, String> {
    let meta = read_meta(&meta_path(id)?)?;
    let icon_name = match meta.icon {
        Some(name) => name,
        None => return Ok(None),
    };

    let icon_path = pack_dir(id)?.join(&icon_name);
    if !icon_path.exists() {
        return Ok(None);
    }

    let bytes = fs::read(&icon_path).map_err(|e| e.to_string())?;
    let mime = match icon_path.extension().and_then(|e| e.to_str()) {
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        Some("gif") => "image/gif",
        Some("ico") => "image/x-icon",
        _ => "image/png",
    };
    let b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes);
    Ok(Some(format!("data:{};base64,{}", mime, b64)))
}

pub fn open_pack_folder(id: &str) -> Result<(), String> {
    let dir = pack_dir(id)?;
    open::that(&dir).map_err(|e| e.to_string())
}

pub fn touch_pack(id: &str) -> Result<(), String> {
    let dir = pack_dir(id)?;
    let mut meta = read_meta(&meta_path(id)?)?;
    meta.updated_at = Utc::now().to_rfc3339();
    write_meta(&dir, &meta)
}

pub fn pack_root(id: &str) -> Result<PathBuf, String> {
    pack_dir(id)
}
