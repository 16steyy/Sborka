export interface PackMeta {
  id: string;
  name: string;
  description: string;
  minecraft_version: string;
  loader: string;
  loader_version: string;
  version: string;
  author: string;
  export_include_icon: boolean;
  export_include_metadata: boolean;
  created_at: string;
  updated_at: string;
  icon: string | null;
}

export interface AppSettings {
  editor_theme: string;
  editor_font_size: number;
  editor_minimap: boolean;
  editor_word_wrap: boolean;
  editor_tab_size: number;
  editor_line_numbers: boolean;
  default_minecraft_version: string;
  default_loader: string;
  default_loader_version: string;
  default_author: string;
  default_pack_version: string;
  default_export_include_icon: boolean;
  default_export_include_metadata: boolean;
  confirm_unsaved_close: boolean;
  confirm_delete: boolean;
  default_export_format: string;
  scaffold_mods_folder: boolean;
  scaffold_config_folders: boolean;
  scaffold_kubejs: boolean;
  scaffold_scripts: boolean;
  scaffold_resourcepacks: boolean;
  scaffold_shaderpacks: boolean;
  scaffold_readme: boolean;
  scaffold_modpack_toml: boolean;
  scaffold_pack_mcmeta: boolean;
  default_modrinth_content_type: ModrinthContentType;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  editor_theme: "vs-dark",
  editor_font_size: 14,
  editor_minimap: false,
  editor_word_wrap: true,
  editor_tab_size: 2,
  editor_line_numbers: true,
  default_minecraft_version: "1.20.1",
  default_loader: "forge",
  default_loader_version: "",
  default_author: "",
  default_pack_version: "1.0.0",
  default_export_include_icon: true,
  default_export_include_metadata: false,
  confirm_unsaved_close: true,
  confirm_delete: true,
  default_export_format: "mrpack",
  scaffold_mods_folder: true,
  scaffold_config_folders: true,
  scaffold_kubejs: true,
  scaffold_scripts: true,
  scaffold_resourcepacks: true,
  scaffold_shaderpacks: true,
  scaffold_readme: true,
  scaffold_modpack_toml: true,
  scaffold_pack_mcmeta: true,
  default_modrinth_content_type: "mod",
};

export interface CreatePackRequest {
  name: string;
  description: string;
  minecraft_version: string;
  loader: string;
  loader_version: string;
  author: string;
  version: string;
}

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
}

export interface FileContent {
  path: string;
  content: string;
  language: string;
}

export interface OpenTab {
  path: string;
  content: string;
  language: string;
  dirty: boolean;
  savedContent: string;
}

export type View = "home" | "editor";

export type ModrinthProjectType = "modpack" | "mod" | "shader" | "resourcepack";

export type ModrinthContentType = "mod" | "shader" | "resourcepack";

export interface ModrinthSearchHit {
  project_id: string;
  slug: string;
  title: string;
  description: string;
  downloads: number;
  icon_url: string | null;
  author: string;
  display_categories: string[];
  versions: string[];
  date_modified: string;
}

export interface ModrinthSearchResponse {
  hits: ModrinthSearchHit[];
  offset: number;
  limit: number;
  total_hits: number;
}

export interface ModrinthProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  downloads: number;
  icon_url: string | null;
  body: string | null;
  game_versions: string[];
  loaders: string[];
}

export interface ModrinthVersion {
  id: string;
  project_id: string;
  name: string;
  version_number: string;
  changelog: string | null;
  game_versions: string[];
  loaders: string[];
  date_published: string;
  files: {
    hashes: Record<string, string>;
    url: string;
    filename: string;
    primary: boolean;
    size: number;
  }[];
}

export const LOADERS = [
  { id: "forge", label: "Forge" },
  { id: "neoforge", label: "NeoForge" },
  { id: "fabric", label: "Fabric" },
  { id: "quilt", label: "Quilt" },
] as const;

export const MC_VERSIONS = [
  "1.21.4",
  "1.21.3",
  "1.21.1",
  "1.20.6",
  "1.20.4",
  "1.20.1",
  "1.19.2",
  "1.18.2",
  "1.16.5",
  "1.12.2",
] as const;

export const FILE_TEMPLATES = [
  { label: "KubeJS (.js)", path: "kubejs/server_scripts/script.js", content: "" },
  { label: "TOML", path: "config/config.toml", content: "" },
  { label: "JSON", path: "config/config.json", content: "{}\n" },
  { label: "CraftTweaker (.zs)", path: "scripts/recipe.zs", content: "" },
] as const;
