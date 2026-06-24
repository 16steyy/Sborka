export interface PackMeta {
  id: string;
  name: string;
  description: string;
  minecraft_version: string;
  loader: string;
  loader_version: string;
  created_at: string;
  updated_at: string;
  icon: string | null;
}

export interface CreatePackRequest {
  name: string;
  description: string;
  minecraft_version: string;
  loader: string;
  loader_version: string;
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
