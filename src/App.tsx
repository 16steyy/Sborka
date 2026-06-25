import { useState, useCallback, useEffect } from "react";
import { Home, Package, Settings } from "lucide-react";
import type { AppSettings, PackMeta, View } from "./types";
import { DEFAULT_APP_SETTINGS } from "./types";
import { api } from "./api/tauri";
import { PackList } from "./components/PackList";
import { EditorView } from "./components/EditorView";
import { SettingsModal } from "./components/SettingsModal";
import { Toast } from "./components/Toast";
import "./App.css";

function App() {
  const [view, setView] = useState<View>("home");
  const [activePack, setActivePack] = useState<PackMeta | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    api.getSettings().then(setSettings).catch(() => {});
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

  const handleSaveSettings = async (newSettings: AppSettings) => {
    await api.saveSettings(newSettings);
    setSettings(newSettings);
    showToast("Настройки сохранены", "success");
  };

  const openPack = (pack: PackMeta) => {
    setActivePack(pack);
    setView("editor");
  };

  const goHome = () => {
    setView("home");
    setActivePack(null);
  };

  return (
    <div className="app">
      <header className="titlebar glass">
        <div className="titlebar-logo" onClick={goHome}>
          <div className="logo-icon">
            <Package size={16} color="#fff" />
          </div>
          Sborka
        </div>

        {view === "editor" && activePack && (
          <button className="btn btn-ghost btn-sm" onClick={goHome}>
            <Home size={14} />
            Все сборки
          </button>
        )}

        <div className="titlebar-actions">
          {view === "home" && (
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Редактор modpack
            </span>
          )}
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => setShowSettings(true)}
            title="Настройки"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      <div className="main-content">
        {view === "home" ? (
          <PackList
            settings={settings}
            onOpenPack={openPack}
            onToast={showToast}
          />
        ) : activePack ? (
          <EditorView
            pack={activePack}
            settings={settings}
            onBack={goHome}
            onToast={showToast}
            onPackUpdate={setActivePack}
          />
        ) : null}
      </div>

      <footer className="statusbar glass">
        <span className="statusbar-item">
          Sborka v0.1.0
        </span>
        {activePack && view === "editor" && (
          <span className="statusbar-item">
            {activePack.name} · {activePack.loader} · MC {activePack.minecraft_version}
            {activePack.version && ` · v${activePack.version}`}
          </span>
        )}
      </footer>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

export default App;
