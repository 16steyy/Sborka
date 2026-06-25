use serde::{Deserialize, Serialize};
use std::collections::HashMap;

fn default_version() -> String {
    "1.0.0".to_string()
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackMeta {
    pub id: String,
    pub name: String,
    pub description: String,
    pub minecraft_version: String,
    pub loader: String,
    pub loader_version: String,
    #[serde(default = "default_version")]
    pub version: String,
    #[serde(default)]
    pub author: String,
    #[serde(default = "default_true")]
    pub export_include_icon: bool,
    #[serde(default)]
    pub export_include_metadata: bool,
    pub created_at: String,
    pub updated_at: String,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default)]
pub struct AppSettings {
    pub editor_theme: String,
    pub editor_font_size: u32,
    pub editor_minimap: bool,
    pub editor_word_wrap: bool,
    pub editor_tab_size: u32,
    #[serde(default = "default_true")]
    pub editor_line_numbers: bool,
    pub default_minecraft_version: String,
    pub default_loader: String,
    pub default_loader_version: String,
    #[serde(default)]
    pub default_author: String,
    #[serde(default = "default_version")]
    pub default_pack_version: String,
    #[serde(default = "default_true")]
    pub default_export_include_icon: bool,
    #[serde(default)]
    pub default_export_include_metadata: bool,
    pub confirm_unsaved_close: bool,
    #[serde(default = "default_true")]
    pub confirm_delete: bool,
    pub default_export_format: String,
    #[serde(default = "default_true")]
    pub scaffold_mods_folder: bool,
    #[serde(default = "default_true")]
    pub scaffold_config_folders: bool,
    #[serde(default = "default_true")]
    pub scaffold_kubejs: bool,
    #[serde(default = "default_true")]
    pub scaffold_scripts: bool,
    #[serde(default = "default_true")]
    pub scaffold_resourcepacks: bool,
    #[serde(default = "default_true")]
    pub scaffold_shaderpacks: bool,
    #[serde(default = "default_true")]
    pub scaffold_readme: bool,
    #[serde(default = "default_true")]
    pub scaffold_modpack_toml: bool,
    #[serde(default = "default_true")]
    pub scaffold_pack_mcmeta: bool,
    #[serde(default = "default_modrinth_content")]
    pub default_modrinth_content_type: String,
}

fn default_modrinth_content() -> String {
    "mod".to_string()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            editor_theme: "vs-dark".to_string(),
            editor_font_size: 14,
            editor_minimap: false,
            editor_word_wrap: true,
            editor_tab_size: 2,
            editor_line_numbers: true,
            default_minecraft_version: "1.20.1".to_string(),
            default_loader: "forge".to_string(),
            default_loader_version: String::new(),
            default_author: String::new(),
            default_pack_version: "1.0.0".to_string(),
            default_export_include_icon: true,
            default_export_include_metadata: false,
            confirm_unsaved_close: true,
            confirm_delete: true,
            default_export_format: "mrpack".to_string(),
            scaffold_mods_folder: true,
            scaffold_config_folders: true,
            scaffold_kubejs: true,
            scaffold_scripts: true,
            scaffold_resourcepacks: true,
            scaffold_shaderpacks: true,
            scaffold_readme: true,
            scaffold_modpack_toml: true,
            scaffold_pack_mcmeta: true,
            default_modrinth_content_type: "mod".to_string(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreatePackRequest {
    pub name: String,
    pub description: String,
    pub minecraft_version: String,
    pub loader: String,
    pub loader_version: String,
    #[serde(default)]
    pub author: String,
    #[serde(default = "default_version")]
    pub version: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePackRequest {
    pub id: String,
    pub name: String,
    pub description: String,
    pub minecraft_version: String,
    pub loader: String,
    pub loader_version: String,
    pub version: String,
    pub author: String,
    pub export_include_icon: bool,
    pub export_include_metadata: bool,
}

#[derive(Debug, Serialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileNode>>,
}

#[derive(Debug, Serialize)]
pub struct FileContent {
    pub path: String,
    pub content: String,
    pub language: String,
}

#[derive(Debug, Deserialize)]
pub struct WriteFileRequest {
    pub pack_id: String,
    pub path: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct RenameRequest {
    pub pack_id: String,
    pub old_path: String,
    pub new_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MrPackIndex {
    pub format_version: u16,
    pub game: String,
    pub version_id: String,
    pub name: String,
    pub summary: Option<String>,
    pub files: Vec<MrPackFile>,
    pub dependencies: HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MrPackFile {
    pub path: String,
    pub hashes: HashMap<String, String>,
    pub downloads: Vec<String>,
    #[serde(rename = "fileSize")]
    pub file_size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Mrpack,
    Zip,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModrinthSearchResponse {
    pub hits: Vec<ModrinthSearchHit>,
    pub offset: u32,
    pub limit: u32,
    pub total_hits: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModrinthSearchHit {
    pub project_id: String,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub downloads: u64,
    pub icon_url: Option<String>,
    pub author: String,
    pub display_categories: Vec<String>,
    pub versions: Vec<String>,
    pub date_modified: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModrinthProject {
    pub id: String,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub downloads: u64,
    pub icon_url: Option<String>,
    pub body: Option<String>,
    pub game_versions: Vec<String>,
    pub loaders: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModrinthVersion {
    pub id: String,
    pub project_id: String,
    pub name: String,
    pub version_number: String,
    pub changelog: Option<String>,
    pub game_versions: Vec<String>,
    pub loaders: Vec<String>,
    pub date_published: String,
    pub files: Vec<ModrinthVersionFile>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModrinthVersionFile {
    pub hashes: HashMap<String, String>,
    pub url: String,
    pub filename: String,
    pub primary: bool,
    pub size: u64,
}
