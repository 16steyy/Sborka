mod archive;
mod file_ops;
mod models;
mod modrinth;
mod pack_manager;
mod settings;

use models::*;
use tauri_plugin_dialog::DialogExt;

#[tauri::command]
fn list_packs() -> Result<Vec<PackMeta>, String> {
    pack_manager::list_packs()
}

#[tauri::command]
fn create_pack(req: CreatePackRequest) -> Result<PackMeta, String> {
    pack_manager::create_pack(req)
}

#[tauri::command]
fn get_pack(id: String) -> Result<PackMeta, String> {
    pack_manager::get_pack(&id)
}

#[tauri::command]
fn update_pack(req: UpdatePackRequest) -> Result<PackMeta, String> {
    pack_manager::update_pack(req)
}

#[tauri::command]
fn delete_pack(id: String) -> Result<(), String> {
    pack_manager::delete_pack(&id)
}

#[tauri::command]
fn get_pack_icon(id: String) -> Result<Option<String>, String> {
    pack_manager::get_pack_icon(&id)
}

#[tauri::command]
async fn pick_and_set_icon(app: tauri::AppHandle, pack_id: String) -> Result<PackMeta, String> {
    let file = app
        .dialog()
        .file()
        .add_filter("Изображения", &["png", "jpg", "jpeg", "webp", "gif", "ico"])
        .blocking_pick_file();

    match file {
        Some(path) => {
            let path_str = path.to_string();
            pack_manager::set_pack_icon(&pack_id, &path_str)
        }
        None => Err("Файл не выбран".into()),
    }
}

#[tauri::command]
fn open_pack_folder(id: String) -> Result<(), String> {
    pack_manager::open_pack_folder(&id)
}

#[tauri::command]
fn list_files(pack_id: String) -> Result<Vec<FileNode>, String> {
    file_ops::list_files(&pack_id)
}

#[tauri::command]
fn read_file(pack_id: String, path: String) -> Result<FileContent, String> {
    file_ops::read_file(&pack_id, &path)
}

#[tauri::command]
fn write_file(req: WriteFileRequest) -> Result<(), String> {
    file_ops::write_file(&req.pack_id, &req.path, &req.content)
}

#[tauri::command]
fn create_file(pack_id: String, path: String) -> Result<(), String> {
    file_ops::create_file(&pack_id, &path)
}

#[tauri::command]
fn create_folder(pack_id: String, path: String) -> Result<(), String> {
    file_ops::create_folder(&pack_id, &path)
}

#[tauri::command]
fn delete_path(pack_id: String, path: String) -> Result<(), String> {
    file_ops::delete_path(&pack_id, &path)
}

#[tauri::command]
fn rename_path(req: RenameRequest) -> Result<String, String> {
    file_ops::rename_path(&req.pack_id, &req.old_path, &req.new_name)
}

#[tauri::command]
fn search_in_files(pack_id: String, query: String) -> Result<Vec<(String, u32, String)>, String> {
    file_ops::search_in_files(&pack_id, &query)
}

#[tauri::command]
async fn search_modrinth(
    query: String,
    project_type: Option<String>,
    offset: Option<u32>,
    limit: Option<u32>,
    minecraft_version: Option<String>,
    loader: Option<String>,
) -> Result<ModrinthSearchResponse, String> {
    modrinth::search_modrinth(
        &query,
        project_type.as_deref().unwrap_or("modpack"),
        offset.unwrap_or(0),
        limit.unwrap_or(20),
        minecraft_version.as_deref(),
        loader.as_deref(),
    )
    .await
}

#[tauri::command]
async fn get_modrinth_project(id: String) -> Result<ModrinthProject, String> {
    modrinth::get_project(&id).await
}

#[tauri::command]
async fn get_modrinth_versions(project_id: String) -> Result<Vec<ModrinthVersion>, String> {
    modrinth::get_project_versions(&project_id).await
}

#[tauri::command]
async fn import_from_modrinth(version_id: String) -> Result<PackMeta, String> {
    modrinth::import_modpack_version(&version_id).await
}

#[tauri::command]
async fn download_modrinth_to_pack(
    pack_id: String,
    version_id: String,
    project_type: String,
) -> Result<String, String> {
    modrinth::download_content_to_pack(&pack_id, &version_id, &project_type).await
}

#[tauri::command]
async fn pick_and_import_archive(app: tauri::AppHandle) -> Result<PackMeta, String> {
    let file = app
        .dialog()
        .file()
        .add_filter("Архивы модпаков", &["mrpack", "zip"])
        .blocking_pick_file();

    match file {
        Some(path) => archive::import_from_path(&path.to_string()).await,
        None => Err("Файл не выбран".into()),
    }
}

#[tauri::command]
fn get_settings() -> Result<AppSettings, String> {
    settings::get_settings()
}

#[tauri::command]
fn save_settings(settings: AppSettings) -> Result<(), String> {
    settings::save_settings(&settings)
}

#[tauri::command]
async fn export_pack_dialog(
    app: tauri::AppHandle,
    pack_id: String,
    format: String,
) -> Result<String, String> {
    let export_format = match format.as_str() {
        "mrpack" => ExportFormat::Mrpack,
        "zip" => ExportFormat::Zip,
        _ => return Err("Неподдерживаемый формат".into()),
    };

    let (ext, filter_name) = match export_format {
        ExportFormat::Mrpack => ("mrpack", "Modrinth Modpack"),
        ExportFormat::Zip => ("zip", "ZIP архив"),
    };

    let meta = pack_manager::get_pack(&pack_id)?;
    let default_name = format!(
        "{}.{}",
        meta.name.replace(['/', '\\', ':', '*', '?', '"', '<', '>', '|'], "_"),
        ext
    );

    let dest = app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .add_filter(filter_name, &[ext])
        .blocking_save_file();

    match dest {
        Some(path) => {
            let path_str = path.to_string();
            archive::export_pack(&pack_id, export_format, &path_str)?;
            Ok(path_str)
        }
        None => Err("Сохранение отменено".into()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_packs,
            create_pack,
            get_pack,
            update_pack,
            delete_pack,
            get_pack_icon,
            pick_and_set_icon,
            open_pack_folder,
            list_files,
            read_file,
            write_file,
            create_file,
            create_folder,
            delete_path,
            rename_path,
            search_in_files,
            search_modrinth,
            get_modrinth_project,
            get_modrinth_versions,
            import_from_modrinth,
            download_modrinth_to_pack,
            pick_and_import_archive,
            export_pack_dialog,
            get_settings,
            save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
