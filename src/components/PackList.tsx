import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Package,
  Trash2,
  FolderOpen,
  ImageIcon,
  Upload,
  Globe,
} from "lucide-react";
import { api } from "../api/tauri";
import type { AppSettings, PackMeta } from "../types";
import { CreatePackModal } from "./CreatePackModal";
import { ModrinthBrowser } from "./ModrinthBrowser";

interface PackListProps {
  settings: AppSettings;
  onOpenPack: (pack: PackMeta) => void;
  onToast: (msg: string, type: "success" | "error") => void;
}

export function PackList({ settings, onOpenPack, onToast }: PackListProps) {
  const [packs, setPacks] = useState<PackMeta[]>([]);
  const [icons, setIcons] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showModrinth, setShowModrinth] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPacks = async () => {
    try {
      const list = await api.listPacks();
      setPacks(list);
      const iconMap: Record<string, string> = {};
      for (const pack of list) {
        const icon = await api.getPackIcon(pack.id);
        if (icon) iconMap[pack.id] = icon;
      }
      setIcons(iconMap);
    } catch (e) {
      onToast(String(e), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPacks();
  }, []);

  const filtered = packs.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.loader.toLowerCase().includes(search.toLowerCase()) ||
      p.minecraft_version.includes(search)
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Удалить сборку? Это действие необратимо.")) return;
    try {
      await api.deletePack(id);
      onToast("Сборка удалена", "success");
      loadPacks();
    } catch (err) {
      onToast(String(err), "error");
    }
  };

  const handleCreate = async (req: Parameters<typeof api.createPack>[0]) => {
    const pack = await api.createPack(req);
    onToast("Сборка создана", "success");
    await loadPacks();
    onOpenPack(pack);
  };

  const handleImportArchive = async () => {
    setImporting(true);
    try {
      const pack = await api.pickAndImportArchive();
      onToast("Сборка импортирована", "success");
      await loadPacks();
      onOpenPack(pack);
    } catch (e) {
      if (String(e) !== "Файл не выбран") {
        onToast(String(e), "error");
      }
    } finally {
      setImporting(false);
    }
  };

  const handleModrinthImport = async (versionId: string) => {
    const pack = await api.importFromModrinth(versionId);
    onToast("Модпак импортирован", "success");
    await loadPacks();
    onOpenPack(pack);
  };

  return (
    <div className="home-view">
      <div className="home-header">
        <div>
          <h1>Мои сборки</h1>
          <p>Создание и редактирование modpack</p>
        </div>
        <div className="home-header-actions">
          <button
            className="btn"
            onClick={handleImportArchive}
            disabled={importing}
            title="Импорт .mrpack или .zip"
          >
            <Upload size={16} />
            Импорт
          </button>
          <button className="btn" onClick={() => setShowModrinth(true)}>
            <Globe size={16} />
            Modrinth
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={16} />
            Новая сборка
          </button>
        </div>
      </div>

      <div className="search-box">
        <Search size={16} className="search-icon" />
        <input
          className="input"
          placeholder="Поиск по названию, лоадеру, версии..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="empty-state">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <Package size={48} strokeWidth={1.2} />
          <h2>{packs.length === 0 ? "Нет сборок" : "Ничего не найдено"}</h2>
          <p>
            {packs.length === 0
              ? "Нет сборок"
              : "Ничего не найдено"}
          </p>
          {packs.length === 0 && (
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => setShowCreate(true)}
            >
              <Plus size={16} />
              Создать сборку
            </button>
          )}
        </div>
      ) : (
        <div className="packs-grid">
          {filtered.map((pack) => (
            <div
              key={pack.id}
              className="glass-card pack-card"
              onClick={() => onOpenPack(pack)}
            >
              <div className="pack-card-actions">
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  title="Открыть папку"
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await api.openPackFolder(pack.id);
                    } catch (err) {
                      onToast(String(err), "error");
                    }
                  }}
                >
                  <FolderOpen size={14} />
                </button>
                <button
                  className="btn btn-ghost btn-icon btn-sm btn-danger"
                  title="Удалить"
                  onClick={(e) => handleDelete(e, pack.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="pack-card-icon">
                {icons[pack.id] ? (
                  <img src={icons[pack.id]} alt={pack.name} />
                ) : (
                  <ImageIcon size={28} color="var(--text-muted)" />
                )}
              </div>

              <h3>{pack.name}</h3>
              <div className="pack-card-meta">
                <span className="loader-badge">{pack.loader}</span>
                <span>MC {pack.minecraft_version}</span>
              </div>
              {pack.description && (
                <p className="pack-card-desc">{pack.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreatePackModal
          settings={settings}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      {showModrinth && (
        <ModrinthBrowser
          onClose={() => setShowModrinth(false)}
          onImport={handleModrinthImport}
          onToast={onToast}
        />
      )}
    </div>
  );
}
