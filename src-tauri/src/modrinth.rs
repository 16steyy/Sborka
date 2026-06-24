use crate::archive::import_from_bytes;
use crate::models::{
    ModrinthProject, ModrinthSearchResponse, ModrinthVersion, PackMeta,
};
use crate::pack_manager;
use std::fs;

pub const API_BASE: &str = "https://api.modrinth.com/v2";
pub const USER_AGENT: &str = "sborka/0.1.0 (minecraft-modpack-editor)";

fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .build()
        .map_err(|e| e.to_string())
}

pub async fn search_modrinth(
    query: &str,
    project_type: &str,
    offset: u32,
    limit: u32,
    minecraft_version: Option<&str>,
    loader: Option<&str>,
) -> Result<ModrinthSearchResponse, String> {
    let mut facet_groups = vec![format!(r#"["project_type:{}"]"#, project_type)];

    if let Some(mc) = minecraft_version {
        if !mc.is_empty() {
            facet_groups.push(format!(r#"["versions:{}"]"#, mc));
        }
    }

    if project_type == "mod" {
        if let Some(ld) = loader {
            if !ld.is_empty() {
                facet_groups.push(format!(r#"["categories:{}"]"#, ld));
            }
        }
    }

    let facets = format!("[{}]", facet_groups.join(", "));
    let url = format!(
        "{}/search?query={}&facets={}&offset={}&limit={}",
        API_BASE,
        urlencoding_encode(query),
        facets,
        offset,
        limit
    );

    let response = client()?
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Ошибка запроса к Modrinth: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Modrinth вернул ошибку: {}", response.status()));
    }

    response
        .json::<ModrinthSearchResponse>()
        .await
        .map_err(|e| format!("Ошибка разбора ответа Modrinth: {}", e))
}

pub async fn get_project(id_or_slug: &str) -> Result<ModrinthProject, String> {
    let url = format!("{}/project/{}", API_BASE, id_or_slug);
    let response = client()?
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Ошибка запроса к Modrinth: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Проект не найден: {}", response.status()));
    }

    response
        .json::<ModrinthProject>()
        .await
        .map_err(|e| e.to_string())
}

pub async fn get_project_versions(project_id: &str) -> Result<Vec<ModrinthVersion>, String> {
    let url = format!("{}/project/{}/version", API_BASE, project_id);
    let response = client()?
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Ошибка запроса к Modrinth: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Версии не найдены: {}", response.status()));
    }

    response
        .json::<Vec<ModrinthVersion>>()
        .await
        .map_err(|e| e.to_string())
}

pub async fn import_modpack_version(version_id: &str) -> Result<PackMeta, String> {
    let url = format!("{}/version/{}", API_BASE, version_id);
    let response = client()?
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Ошибка запроса к Modrinth: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Версия не найдена: {}", response.status()));
    }

    let version: ModrinthVersion = response.json().await.map_err(|e| e.to_string())?;

    let file = version
        .files
        .iter()
        .find(|f| f.primary || f.filename.ends_with(".mrpack"))
        .or_else(|| version.files.first())
        .ok_or("У версии нет файлов для скачивания")?;

    let download_response = client()?
        .get(&file.url)
        .send()
        .await
        .map_err(|e| format!("Ошибка загрузки модпака: {}", e))?;

    let bytes = download_response
        .bytes()
        .await
        .map_err(|e| e.to_string())?;

    import_from_bytes(&bytes).await
}

fn content_subdir(project_type: &str) -> Result<&'static str, String> {
    match project_type {
        "mod" => Ok("mods"),
        "shader" => Ok("shaderpacks"),
        "resourcepack" => Ok("resourcepacks"),
        _ => Err(format!("Неподдерживаемый тип контента: {}", project_type)),
    }
}

pub async fn download_content_to_pack(
    pack_id: &str,
    version_id: &str,
    project_type: &str,
) -> Result<String, String> {
    let subdir = content_subdir(project_type)?;

    let url = format!("{}/version/{}", API_BASE, version_id);
    let response = client()?
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Ошибка запроса к Modrinth: {}", e))?;

    if !response.status().is_success() {
        return Err(format!("Версия не найдена: {}", response.status()));
    }

    let version: ModrinthVersion = response.json().await.map_err(|e| e.to_string())?;

    let file = version
        .files
        .iter()
        .find(|f| f.primary)
        .or_else(|| version.files.first())
        .ok_or("У версии нет файлов для скачивания")?;

    let download_response = client()?
        .get(&file.url)
        .send()
        .await
        .map_err(|e| format!("Ошибка загрузки файла: {}", e))?;

    if !download_response.status().is_success() {
        return Err(format!(
            "Не удалось скачать файл: {}",
            download_response.status()
        ));
    }

    let bytes = download_response
        .bytes()
        .await
        .map_err(|e| e.to_string())?;

    let pack_root = pack_manager::pack_root(pack_id)?;
    let target_dir = pack_root.join(subdir);
    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    let target_path = target_dir.join(&file.filename);
    fs::write(&target_path, &bytes).map_err(|e| e.to_string())?;

    pack_manager::touch_pack(pack_id)?;

    Ok(format!("{}/{}", subdir, file.filename))
}

fn urlencoding_encode(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            ' ' => "+".to_string(),
            _ => format!("%{:02X}", c as u8),
        })
        .collect()
}
