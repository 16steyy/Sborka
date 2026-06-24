import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  FolderPlus,
  FilePlus,
  RefreshCw,
  Search,
  FolderOpen,
  ImagePlus,
  X,
  FileCode,
  Settings,
  Globe,
  Download,
  FileArchive,
} from "lucide-react";
import { api } from "../api/tauri";
import type { FileNode, OpenTab, PackMeta } from "../types";
import { FILE_TEMPLATES } from "../types";
import { FileTree } from "./FileTree";
import { CodeEditor } from "./CodeEditor";
import { ModrinthContentBrowser } from "./ModrinthContentBrowser";

interface EditorViewProps {
  pack: PackMeta;
  onBack: () => void;
  onToast: (msg: string, type: "success" | "error") => void;
  onPackUpdate: (pack: PackMeta) => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  node: FileNode | null;
}

export function EditorView({ pack, onBack, onToast, onPackUpdate }: EditorViewProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [icon, setIcon] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<[string, number, string][]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showModrinth, setShowModrinth] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [packForm, setPackForm] = useState(pack);

  const loadFiles = useCallback(async () => {
    try {
      const tree = await api.listFiles(pack.id);
      setFiles(tree);
    } catch (e) {
      onToast(String(e), "error");
    }
  }, [pack.id, onToast]);

  useEffect(() => {
    loadFiles();
    api.getPackIcon(pack.id).then(setIcon);
    setPackForm(pack);
  }, [pack, loadFiles]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveActiveTab();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const openFile = async (path: string) => {
    const existing = tabs.find((t) => t.path === path);
    if (existing) {
      setActiveTab(path);
      return;
    }
    try {
      const file = await api.readFile(pack.id, path);
      const tab: OpenTab = {
        path: file.path,
        content: file.content,
        language: file.language,
        dirty: false,
        savedContent: file.content,
      };
      setTabs((prev) => [...prev, tab]);
      setActiveTab(path);
    } catch (e) {
      onToast(String(e), "error");
    }
  };

  const saveActiveTab = async () => {
    if (!activeTab) return;
    const tab = tabs.find((t) => t.path === activeTab);
    if (!tab) return;
    try {
      await api.writeFile(pack.id, tab.path, tab.content);
      setTabs((prev) =>
        prev.map((t) =>
          t.path === activeTab ? { ...t, dirty: false, savedContent: t.content } : t
        )
      );
      onToast("Сохранено", "success");
    } catch (e) {
      onToast(String(e), "error");
    }
  };

  const closeTab = (path: string) => {
    const tab = tabs.find((t) => t.path === path);
    if (tab?.dirty && !confirm("Файл не сохранён. Закрыть?")) return;
    setTabs((prev) => prev.filter((t) => t.path !== path));
    if (activeTab === path) {
      const remaining = tabs.filter((t) => t.path !== path);
      setActiveTab(remaining.length > 0 ? remaining[remaining.length - 1].path : null);
    }
  };

  const updateTabContent = (path: string, content: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.path === path
          ? { ...t, content, dirty: content !== t.savedContent }
          : t
      )
    );
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await api.searchInFiles(pack.id, searchQuery);
      setSearchResults(results);
    } catch (e) {
      onToast(String(e), "error");
    }
  };

  const handleNewFile = async () => {
    const name = prompt("Имя файла (с путём, например config/myfile.toml):");
    if (!name) return;
    try {
      await api.createFile(pack.id, name);
      await loadFiles();
      openFile(name);
      onToast("Файл создан", "success");
    } catch (e) {
      onToast(String(e), "error");
    }
  };

  const handleNewFolder = async () => {
    const name = prompt("Имя папки (с путём, например config/mymod):");
    if (!name) return;
    try {
      await api.createFolder(pack.id, name);
      await loadFiles();
      onToast("Папка создана", "success");
    } catch (e) {
      onToast(String(e), "error");
    }
  };

  const handleDelete = async (node: FileNode) => {
    if (!confirm(`Удалить "${node.name}"?`)) return;
    try {
      await api.deletePath(pack.id, node.path);
      setTabs((prev) => prev.filter((t) => !t.path.startsWith(node.path)));
      if (activeTab?.startsWith(node.path)) setActiveTab(null);
      await loadFiles();
      onToast("Удалено", "success");
    } catch (e) {
      onToast(String(e), "error");
    }
  };

  const handleRename = async (node: FileNode) => {
    const newName = prompt("Новое имя:", node.name);
    if (!newName || newName === node.name) return;
    try {
      const newPath = await api.renamePath(pack.id, node.path, newName);
      setTabs((prev) =>
        prev.map((t) => {
          if (t.path === node.path) {
            return { ...t, path: newPath };
          }
          if (node.is_dir && t.path.startsWith(node.path + "/")) {
            return { ...t, path: newPath + t.path.slice(node.path.length) };
          }
          return t;
        })
      );
      if (activeTab === node.path) setActiveTab(newPath);
      await loadFiles();
      onToast("Переименовано", "success");
    } catch (e) {
      onToast(String(e), "error");
    }
  };

  const handleUploadIcon = async () => {
    try {
      const updated = await api.pickAndSetIcon(pack.id);
      onPackUpdate(updated);
      const newIcon = await api.getPackIcon(pack.id);
      setIcon(newIcon);
      onToast("Иконка обновлена", "success");
    } catch (e) {
      onToast(String(e), "error");
    }
  };

  const handleSavePackSettings = async () => {
    try {
      const updated = await api.updatePack(packForm);
      onPackUpdate(updated);
      onToast("Настройки сохранены", "success");
      setShowSettings(false);
    } catch (e) {
      onToast(String(e), "error");
    }
  };

  const handleExport = async (format: "mrpack" | "zip") => {
    setExporting(true);
    try {
      const path = await api.exportPack(pack.id, format);
      onToast(`Экспортировано: ${path.split(/[/\\]/).pop()}`, "success");
    } catch (e) {
      if (String(e) !== "Сохранение отменено") {
        onToast(String(e), "error");
      }
    } finally {
      setExporting(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  const currentTab = tabs.find((t) => t.path === activeTab);

  return (
    <div className="editor-layout">
      <div className="sidebar glass">
        <div className="sidebar-header">
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onBack} title="Назад">
            <ArrowLeft size={16} />
          </button>
          <h3 title={pack.name}>{pack.name}</h3>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowSettings(!showSettings)} title="Настройки">
            <Settings size={14} />
          </button>
        </div>

        <div style={{ padding: "8px 12px", display: "flex", gap: 4, flexWrap: "wrap" }}>
          <button className="btn btn-sm" onClick={handleNewFile} title="Новый файл">
            <FilePlus size={14} />
          </button>
          <button className="btn btn-sm" onClick={handleNewFolder} title="Новая папка">
            <FolderPlus size={14} />
          </button>
          <button className="btn btn-sm" onClick={loadFiles} title="Обновить">
            <RefreshCw size={14} />
          </button>
          <button className="btn btn-sm" onClick={() => setShowSearch(!showSearch)} title="Поиск">
            <Search size={14} />
          </button>
          <button
            className="btn btn-sm"
            onClick={() => setShowModrinth(true)}
            title="Скачать с Modrinth"
          >
            <Globe size={14} />
          </button>
          <button
            className="btn btn-sm"
            onClick={() => api.openPackFolder(pack.id)}
            title="Открыть в проводнике"
          >
            <FolderOpen size={14} />
          </button>
          <button
            className="btn btn-sm"
            onClick={() => handleExport("mrpack")}
            disabled={exporting}
            title="Экспорт .mrpack"
          >
            <Download size={14} />
          </button>
          <button
            className="btn btn-sm"
            onClick={() => handleExport("zip")}
            disabled={exporting}
            title="Экспорт .zip"
          >
            <FileArchive size={14} />
          </button>
        </div>

        {showSearch && (
          <div className="search-panel">
            <div style={{ display: "flex", gap: 6 }}>
              <input
                className="input"
                style={{ padding: "6px 10px", fontSize: 12 }}
                placeholder="Поиск в файлах..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button className="btn btn-sm" onClick={handleSearch}>
                <Search size={12} />
              </button>
            </div>
            <div className="search-results">
              {searchResults.map(([path, line, text], i) => (
                <div
                  key={`${path}-${line}-${i}`}
                  className="search-result-item"
                  onClick={() => openFile(path)}
                >
                  <div className="search-result-path">{path}:{line}</div>
                  <div className="search-result-line">{text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <FileTree
          nodes={files}
          activePath={activeTab}
          onSelect={openFile}
          onContextMenu={handleContextMenu}
        />

        {showSettings && (
          <div className="settings-panel">
            <h4>Настройки сборки</h4>
            <div className="form-group">
              <label className="label">Название</label>
              <input
                className="input"
                style={{ padding: "6px 10px", fontSize: 12 }}
                value={packForm.name}
                onChange={(e) => setPackForm({ ...packForm, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="label">Описание</label>
              <textarea
                className="textarea"
                style={{ minHeight: 50, fontSize: 12, padding: "6px 10px" }}
                value={packForm.description}
                onChange={(e) => setPackForm({ ...packForm, description: e.target.value })}
              />
            </div>
            <div className="icon-upload" style={{ marginBottom: 12 }}>
              <div className="icon-preview">
                {icon ? <img src={icon} alt="icon" /> : <ImagePlus size={20} color="var(--text-muted)" />}
              </div>
              <button className="btn btn-sm" onClick={handleUploadIcon}>
                <ImagePlus size={14} />
                Иконка
              </button>
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleSavePackSettings}>
              Сохранить
            </button>
          </div>
        )}
      </div>

      <div className="editor-area">
        {tabs.length > 0 && (
          <div className="tab-bar glass">
            {tabs.map((tab) => (
              <div
                key={tab.path}
                className={`tab ${activeTab === tab.path ? "active" : ""} ${tab.dirty ? "dirty" : ""}`}
                onClick={() => setActiveTab(tab.path)}
              >
                <FileCode size={12} />
                <span className="tab-name">{tab.path.split("/").pop()}</span>
                <span
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.path);
                  }}
                >
                  <X size={12} />
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="editor-container">
          {currentTab ? (
            <CodeEditor
              path={currentTab.path}
              language={currentTab.language}
              content={currentTab.content}
              onChange={(v) => updateTabContent(currentTab.path, v)}
            />
          ) : (
            <div className="editor-welcome">
              <FileCode size={48} strokeWidth={1} />
              <h2>Откройте файл</h2>
              <p>
                <kbd>Ctrl</kbd> + <kbd>S</kbd> — сохранить
              </p>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ fontSize: 12 }}>Шаблоны:</span>
                {FILE_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.path}
                    className="btn btn-sm"
                    style={{ width: 240 }}
                    onClick={async () => {
                      try {
                        await api.createFile(pack.id, tpl.path);
                        await api.writeFile(pack.id, tpl.path, tpl.content);
                        await loadFiles();
                        openFile(tpl.path);
                      } catch (e) {
                        onToast(String(e), "error");
                      }
                    }}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 1999 }} onClick={() => setContextMenu(null)} />
          <div
            className="context-menu glass"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {contextMenu.node && !contextMenu.node.is_dir && (
              <div className="context-menu-item" onClick={() => { openFile(contextMenu.node!.path); setContextMenu(null); }}>
                <FileCode size={14} /> Открыть
              </div>
            )}
            <div className="context-menu-item" onClick={() => { handleRename(contextMenu.node!); setContextMenu(null); }}>
              Переименовать
            </div>
            <div className="context-menu-separator" />
            <div className="context-menu-item danger" onClick={() => { handleDelete(contextMenu.node!); setContextMenu(null); }}>
              Удалить
            </div>
          </div>
        </>
      )}

      {showModrinth && (
        <ModrinthContentBrowser
          pack={pack}
          onClose={() => setShowModrinth(false)}
          onDownloaded={loadFiles}
          onToast={onToast}
        />
      )}
    </div>
  );
}