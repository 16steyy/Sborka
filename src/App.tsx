import { useState, useCallback } from "react";
import { Home, Package } from "lucide-react";
import type { PackMeta, View } from "./types";
import { PackList } from "./components/PackList";
import { EditorView } from "./components/EditorView";
import { Toast } from "./components/Toast";
import "./App.css";

function App() {
  const [view, setView] = useState<View>("home");
  const [activePack, setActivePack] = useState<PackMeta | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
  }, []);

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
        </div>
      </header>

      <div className="main-content">
        {view === "home" ? (
          <PackList onOpenPack={openPack} onToast={showToast} />
        ) : activePack ? (
          <EditorView
            pack={activePack}
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
          </span>
        )}
      </footer>

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
