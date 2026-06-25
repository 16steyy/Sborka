import { invoke } from "@tauri-apps/api/core";
import type {
  AppSettings,
  CreatePackRequest,
  FileContent,
  FileNode,
  ModrinthContentType,
  ModrinthProject,
  ModrinthProjectType,
  ModrinthSearchResponse,
  ModrinthVersion,
  PackMeta,
} from "../types";

export const api = {
  listPacks: () => invoke<PackMeta[]>("list_packs"),
  createPack: (req: CreatePackRequest) => invoke<PackMeta>("create_pack", { req }),
  getPack: (id: string) => invoke<PackMeta>("get_pack", { id }),
  updatePack: (req: PackMeta) =>
    invoke<PackMeta>("update_pack", {
      req: {
        id: req.id,
        name: req.name,
        description: req.description,
        minecraft_version: req.minecraft_version,
        loader: req.loader,
        loader_version: req.loader_version,
        version: req.version,
        author: req.author,
        export_include_icon: req.export_include_icon,
        export_include_metadata: req.export_include_metadata,
      },
    }),
  deletePack: (id: string) => invoke<void>("delete_pack", { id }),
  getPackIcon: (id: string) => invoke<string | null>("get_pack_icon", { id }),
  pickAndSetIcon: (packId: string) => invoke<PackMeta>("pick_and_set_icon", { packId }),
  openPackFolder: (id: string) => invoke<void>("open_pack_folder", { id }),
  listFiles: (packId: string) => invoke<FileNode[]>("list_files", { packId }),
  readFile: (packId: string, path: string) =>
    invoke<FileContent>("read_file", { packId, path }),
  writeFile: (packId: string, path: string, content: string) =>
    invoke<void>("write_file", { req: { pack_id: packId, path, content } }),
  createFile: (packId: string, path: string) =>
    invoke<void>("create_file", { packId, path }),
  createFolder: (packId: string, path: string) =>
    invoke<void>("create_folder", { packId, path }),
  deletePath: (packId: string, path: string) =>
    invoke<void>("delete_path", { packId, path }),
  renamePath: (packId: string, oldPath: string, newName: string) =>
    invoke<string>("rename_path", { req: { pack_id: packId, old_path: oldPath, new_name: newName } }),
  searchInFiles: (packId: string, query: string) =>
    invoke<[string, number, string][]>("search_in_files", { packId, query }),

  searchModrinth: (
    query: string,
    projectType?: ModrinthProjectType,
    offset?: number,
    limit?: number,
    minecraftVersion?: string,
    loader?: string
  ) =>
    invoke<ModrinthSearchResponse>("search_modrinth", {
      query,
      projectType,
      offset,
      limit,
      minecraftVersion,
      loader,
    }),
  getModrinthProject: (id: string) =>
    invoke<ModrinthProject>("get_modrinth_project", { id }),
  getModrinthVersions: (projectId: string) =>
    invoke<ModrinthVersion[]>("get_modrinth_versions", { projectId }),
  importFromModrinth: (versionId: string) =>
    invoke<PackMeta>("import_from_modrinth", { versionId }),
  downloadModrinthToPack: (
    packId: string,
    versionId: string,
    projectType: ModrinthContentType
  ) =>
    invoke<string>("download_modrinth_to_pack", { packId, versionId, projectType }),
  pickAndImportArchive: () => invoke<PackMeta>("pick_and_import_archive"),
  exportPack: (packId: string, format: "mrpack" | "zip") =>
    invoke<string>("export_pack_dialog", { packId, format }),
  getSettings: () => invoke<AppSettings>("get_settings"),
  saveSettings: (settings: AppSettings) =>
    invoke<void>("save_settings", { settings }),
};
