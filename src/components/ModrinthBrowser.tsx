import { useEffect, useState } from "react";
import { Download, Search, X, ChevronLeft, Loader2 } from "lucide-react";
import { api } from "../api/tauri";
import type { ModrinthSearchHit, ModrinthVersion } from "../types";

interface ModrinthBrowserProps {
  onClose: () => void;
  onImport: (versionId: string) => Promise<void>;
  onToast: (msg: string, type: "success" | "error") => void;
}

export function ModrinthBrowser({ onClose, onImport, onToast }: ModrinthBrowserProps) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ModrinthSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [selected, setSelected] = useState<ModrinthSearchHit | null>(null);
  const [versions, setVersions] = useState<ModrinthVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const search = async (q: string) => {
    setLoading(true);
    try {
      const result = await api.searchModrinth(q || "modpack", "modpack", 0, 20);
      setHits(result.hits);
    } catch (e) {
      onToast(String(e), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    search("");
  }, []);

  const openProject = async (hit: ModrinthSearchHit) => {
    setSelected(hit);
    setVersionsLoading(true);
    try {
      const vers = await api.getModrinthVersions(hit.project_id);
      setVersions(vers);
    } catch (e) {
      onToast(String(e), "error");
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleImport = async (versionId: string) => {
    setImporting(versionId);
    try {
      await onImport(versionId);
      onClose();
    } catch (e) {
      onToast(String(e), "error");
    } finally {
      setImporting(null);
    }
  };

  const formatDownloads = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal glass glass-card modrinth-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modrinth-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {selected && (
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelected(null)}>
                <ChevronLeft size={16} />
              </button>
            )}
            <h2 className="modal-title" style={{ margin: 0 }}>
              {selected ? selected.title : "Modrinth"}
            </h2>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {!selected ? (
          <>
            <div className="search-box" style={{ marginBottom: 16 }}>
              <Search size={16} className="search-icon" />
              <input
                className="input"
                placeholder="Поиск модпаков на Modrinth..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search(query)}
              />
              <button className="btn btn-sm" onClick={() => search(query)} disabled={loading}>
                {loading ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
              </button>
            </div>

            <div className="modrinth-list">
              {loading && hits.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}>
                  <Loader2 size={24} className="spin" />
                  <p>Загрузка...</p>
                </div>
              ) : hits.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}>
                  <p>Ничего не найдено</p>
                </div>
              ) : (
                hits.map((hit) => (
                  <div
                    key={hit.project_id}
                    className="modrinth-item"
                    onClick={() => openProject(hit)}
                  >
                    <div className="modrinth-item-icon">
                      {hit.icon_url ? (
                        <img src={hit.icon_url} alt={hit.title} />
                      ) : (
                        <div className="modrinth-item-placeholder" />
                      )}
                    </div>
                    <div className="modrinth-item-info">
                      <h4>{hit.title}</h4>
                      <p>{hit.description}</p>
                      <div className="modrinth-item-meta">
                        <span>{hit.author}</span>
                        <span>{formatDownloads(hit.downloads)} загрузок</span>
                        {hit.versions[0] && <span>MC {hit.versions[0]}</span>}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="modrinth-versions">
            {versionsLoading ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <Loader2 size={24} className="spin" />
                <p>Загрузка версий...</p>
              </div>
            ) : versions.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <p>Нет доступных версий</p>
              </div>
            ) : (
              versions.map((ver) => (
                <div key={ver.id} className="modrinth-version-item">
                  <div>
                    <h4>{ver.name}</h4>
                    <div className="modrinth-item-meta">
                      <span>v{ver.version_number}</span>
                      {ver.game_versions[0] && <span>MC {ver.game_versions[0]}</span>}
                      {ver.loaders.map((l) => (
                        <span key={l} className="loader-badge">
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={importing !== null}
                    onClick={() => handleImport(ver.id)}
                  >
                    {importing === ver.id ? (
                      <Loader2 size={14} className="spin" />
                    ) : (
                      <Download size={14} />
                    )}
                    Импорт
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
