import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import api from "../../lib/api";

export default function OfficesPage() {
  const [offices, setOffices] = useState([]);
  const [form, setForm] = useState({ name: "", address: "", city: "", maps_url: "" });
  const [adding, setAdding] = useState(false);

  const load = async () => {
    try { const { data } = await api.get("/offices"); setOffices(data); } catch {}
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.name || !form.address || !form.city) { toast.error("Completa los campos obligatorios"); return; }
    try {
      await api.post("/offices", { ...form, hiring_open: true });
      setForm({ name: "", address: "", city: "", maps_url: "" });
      setAdding(false);
      toast.success("Oficina creada");
      load();
    } catch { toast.error("Error"); }
  };

  const toggle = async (o) => {
    try { await api.patch(`/offices/${o.office_id}`, { hiring_open: !o.hiring_open }); load(); } catch {}
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar oficina?")) return;
    try { await api.delete(`/offices/${id}`); toast.success("Eliminada"); load(); } catch { toast.error("Error"); }
  };

  return (
    <div className="space-y-4" data-testid="offices-page">
      <div className="flex items-end justify-between">
        <div>
          <span className="label-tiny">CRM</span>
          <h1 className="font-display text-4xl font-bold uppercase leading-none mt-1">Oficinas</h1>
        </div>
        <button onClick={() => setAdding((a) => !a)} className="btn-dark" data-testid="toggle-add-office">
          <Plus size={16} strokeWidth={3} className="mr-2" /> Nueva
        </button>
      </div>

      {adding && (
        <form onSubmit={create} className="brutal-card space-y-3" data-testid="new-office-form">
          <input data-testid="office-name" className="brutal-input" placeholder="Nombre (ej: Madrid Centro)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input data-testid="office-address" className="brutal-input" placeholder="Dirección" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <input data-testid="office-city" className="brutal-input" placeholder="Ciudad" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input data-testid="office-maps-url" className="brutal-input" placeholder="URL Google Maps (opcional)" value={form.maps_url} onChange={(e) => setForm({ ...form, maps_url: e.target.value })} />
          <button type="submit" className="btn-primary w-full" data-testid="submit-office">Crear oficina</button>
        </form>
      )}

      <div className="space-y-2">
        {offices.length === 0 && <div className="brutal-card text-[#5A5A5A] text-center">No hay oficinas.</div>}
        {offices.map((o) => (
          <div key={o.office_id} className="brutal-card" data-testid={`office-${o.office_id}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl font-bold leading-none">{o.name}</p>
                <p className="text-sm text-[#5A5A5A] mt-1">{o.address}</p>
                <p className="text-sm text-[#5A5A5A]">{o.city}</p>
                {o.maps_url && (
                  <a href={o.maps_url} target="_blank" rel="noopener noreferrer" className="text-xs underline text-[#007AFF] mt-1 inline-block">
                    Ver en Google Maps
                  </a>
                )}
              </div>
              <span className={`badge ${o.hiring_open ? "badge-accent" : "badge-dark"}`}>{o.hiring_open ? "Abierta" : "Cerrada"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <button onClick={() => toggle(o)} className="border-2 border-black bg-white text-black px-3 py-2 text-xs font-bold uppercase tracking-wider hover:bg-gray-100" data-testid={`toggle-${o.office_id}`}>
                {o.hiring_open ? "Cerrar contratación" : "Abrir contratación"}
              </button>
              <button onClick={() => remove(o.office_id)} className="border-2 border-black bg-[#FF3B30] text-white px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1" data-testid={`delete-${o.office_id}`}>
                <Trash2 size={14} /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
