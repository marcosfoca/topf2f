import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Ban, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import api from "../../lib/api";

export default function AppointmentsPage() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(null);

  const load = async () => {
    try { const { data } = await api.get("/appointments"); setItems(data); } catch {}
  };
  useEffect(() => { load(); }, []);

  const cancel = async (id) => {
    if (!window.confirm("¿Cancelar la citación? Los leads volverán a Pendiente.")) return;
    try { await api.post(`/appointments/${id}/cancel`); toast.success("Cancelada"); load(); } catch { toast.error("Error"); }
  };

  const reactivate = async (id) => {
    try { await api.post(`/appointments/${id}/reactivate`); toast.success("Reactivada"); load(); } catch (e) {
      toast.error(e.response?.data?.detail || "Error");
    }
  };

  return (
    <div className="space-y-4" data-testid="appointments-page">
      <div className="flex items-end justify-between">
        <div>
          <span className="label-tiny">CRM</span>
          <h1 className="font-display text-4xl font-bold uppercase leading-none mt-1">Citaciones</h1>
        </div>
        <Link to="/admin/appointments/new" className="btn-dark" data-testid="new-appointment-link">
          <Plus size={16} strokeWidth={3} className="mr-2" /> Nueva
        </Link>
      </div>

      {items.length === 0 && <div className="brutal-card text-[#5A5A5A] text-center">Sin citaciones todavía.</div>}

      <div className="space-y-2">
        {items.map((a) => {
          const isOpen = open === a.appointment_id;
          const isActive = a.status === "active";
          return (
            <div key={a.appointment_id} className="brutal-card" data-testid={`appointment-${a.appointment_id}`}>
              <button onClick={() => setOpen(isOpen ? null : a.appointment_id)} className="w-full flex items-start justify-between text-left gap-3">
                <div>
                  <p className="font-display text-xl font-bold leading-none">{a.office_name}</p>
                  <p className="text-sm text-[#5A5A5A] mt-1">{new Date(a.scheduled_at).toLocaleString("es-ES")}</p>
                  <p className="text-xs text-[#5A5A5A] mt-1">{a.lead_ids?.length || 0} leads · {a.office_city}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`badge ${isActive ? "badge-accent" : "badge-dark"}`}>{isActive ? "Activa" : "Cancelada"}</span>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {isOpen && (
                <div className="mt-3 pt-3 border-t-2 border-black space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <Dist label="Hot" v={a.distribution?.hot_assigned} req={a.distribution?.hot_requested} cls="bg-[#FF3B30] text-white" />
                    <Dist label="Warm" v={a.distribution?.warm_assigned} req={a.distribution?.warm_requested} cls="bg-[#FF9500] text-black" />
                    <Dist label="Cold" v={a.distribution?.cold_assigned} req={a.distribution?.cold_requested} cls="bg-[#007AFF] text-white" />
                  </div>
                  <p className="text-xs text-[#5A5A5A]">{a.office_address}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {isActive ? (
                      <button onClick={() => cancel(a.appointment_id)} className="border-2 border-black bg-[#FF3B30] text-white px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1" data-testid={`cancel-${a.appointment_id}`}>
                        <Ban size={14} /> Cancelar
                      </button>
                    ) : (
                      <button onClick={() => reactivate(a.appointment_id)} className="border-2 border-black bg-[#f2e00f] text-black px-3 py-2 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1" data-testid={`reactivate-${a.appointment_id}`}>
                        <RefreshCw size={14} /> Reactivar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Dist({ label, v, req, cls }) {
  return (
    <div className={`border-2 border-black p-2 ${cls}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider">{label}</div>
      <div className="font-display text-xl font-bold">{v || 0}/{req || 0}</div>
    </div>
  );
}
