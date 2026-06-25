import { useState } from "react";
import { X } from "lucide-react";
import type { AppSettings } from "../types";
import { DEFAULT_APP_SETTINGS, LOADERS, MC_VERSIONS } from "../types";

interface SettingsModalProps {
  settings: AppSettings;
  onClose: () => void;
  onSave: (settings: AppSettings) => Promise<void>;
}

type Tab = "editor" | "defaults" | "behavior";

export function SettingsModal({ settings, onClose, onSave }: SettingsModalProps) {
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [tab, setTab] = useState<Tab>("editor");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass glass-card settings-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Настройки</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="settings-tabs">
          <button
            type="button"
            className={`settings-tab ${tab === "editor" ? "active" : ""}`}
            onClick={() => setTab("editor")}
          >
            Редактор
          </button>
          <button
            type="button"
            className={`settings-tab ${tab === "defaults" ? "active" : ""}`}
            onClick={() => setTab("defaults")}
          >
            По умолчанию
          </button>
          <button
            type="button"
            className={`settings-tab ${tab === "behavior" ? "active" : ""}`}
            onClick={() => setTab("behavior")}
          >
            Поведение
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {tab === "editor" && (
            <>
              <div className="form-group">
                <label className="label">Тема редактора</label>
                <select
                  className="select"
                  value={form.editor_theme}
                  onChange={(e) => update("editor_theme", e.target.value)}
                >
                  <option value="vs-dark">Тёмная</option>
                  <option value="vs-light">Светлая</option>
                  <option value="hc-black">Высокий контраст</option>
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="label">Размер шрифта</label>
                  <input
                    className="input"
                    type="number"
                    min={10}
                    max={24}
                    value={form.editor_font_size}
                    onChange={(e) => update("editor_font_size", Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Размер табуляции</label>
                  <input
                    className="input"
                    type="number"
                    min={2}
                    max={8}
                    value={form.editor_tab_size}
                    onChange={(e) => update("editor_tab_size", Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.editor_minimap}
                    onChange={(e) => update("editor_minimap", e.target.checked)}
                  />
                  Показывать миникарту
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.editor_word_wrap}
                    onChange={(e) => update("editor_word_wrap", e.target.checked)}
                  />
                  Перенос строк
                </label>
              </div>
            </>
          )}

          {tab === "defaults" && (
            <>
              <p className="settings-hint">Значения для новых сборок</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="form-group">
                  <label className="label">Версия Minecraft</label>
                  <select
                    className="select"
                    value={form.default_minecraft_version}
                    onChange={(e) => update("default_minecraft_version", e.target.value)}
                  >
                    {MC_VERSIONS.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Лоадер</label>
                  <select
                    className="select"
                    value={form.default_loader}
                    onChange={(e) => update("default_loader", e.target.value)}
                  >
                    {LOADERS.map((l) => (
                      <option key={l.id} value={l.id}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="label">Версия лоадера</label>
                <input
                  className="input"
                  value={form.default_loader_version}
                  onChange={(e) => update("default_loader_version", e.target.value)}
                  placeholder="например 47.2.0"
                />
              </div>

              <div className="form-group">
                <label className="label">Формат экспорта по умолчанию</label>
                <select
                  className="select"
                  value={form.default_export_format}
                  onChange={(e) => update("default_export_format", e.target.value)}
                >
                  <option value="mrpack">.mrpack (Modrinth)</option>
                  <option value="zip">.zip</option>
                </select>
              </div>
            </>
          )}

          {tab === "behavior" && (
            <>
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={form.confirm_unsaved_close}
                    onChange={(e) => update("confirm_unsaved_close", e.target.checked)}
                  />
                  Подтверждать закрытие несохранённых файлов
                </label>
              </div>

              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setForm({ ...DEFAULT_APP_SETTINGS })}
              >
                Сбросить к умолчаниям
              </button>
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
