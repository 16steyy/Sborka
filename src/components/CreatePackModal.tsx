import { useState } from "react";
import { X } from "lucide-react";
import { LOADERS, MC_VERSIONS, type CreatePackRequest } from "../types";

interface CreatePackModalProps {
  onClose: () => void;
  onCreate: (req: CreatePackRequest) => Promise<void>;
}

export function CreatePackModal({ onClose, onCreate }: CreatePackModalProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreatePackRequest>({
    name: "",
    description: "",
    minecraft_version: "1.20.1",
    loader: "forge",
    loader_version: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await onCreate(form);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass glass-card" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Новая сборка</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label">Название *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Название"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="label">Описание</label>
            <textarea
              className="textarea"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Описание"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="label">Версия Minecraft</label>
              <select
                className="select"
                value={form.minecraft_version}
                onChange={(e) => setForm({ ...form, minecraft_version: e.target.value })}
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
                value={form.loader}
                onChange={(e) => setForm({ ...form, loader: e.target.value })}
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
              value={form.loader_version}
              onChange={(e) => setForm({ ...form, loader_version: e.target.value })}
              placeholder="например 47.2.0"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !form.name.trim()}>
              {loading ? "Создание..." : "Создать сборку"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
