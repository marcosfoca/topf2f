import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, X } from "lucide-react";
import api from "../../lib/api";

const STATUSES = ["Nuevo", "Pendiente", "Citado", "Confirmado", "No respondió", "No asistió", "Contratado", "Descartado"];
const TEMPS = ["hot", "warm", "cold"];

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [temp, setTemp] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const params = {};
    if (temp) params.temperature = temp;
    if (status) params.status = status;
    try {
      const { data } = await api.get("/leads", { params });
      setLeads(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [temp, status]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => {
    const c = { hot: 0, warm: 0, cold: 0 };
    leads.forEach((l) => { c[l.temperature] = (c[l.temperature] || 0) + 1; });
    return c;
  }, [leads]);

  return (
    <div className="space-y-4" data-testid="leads-page">
      <div className="flex items-end justify-between">
        <div>
          <span className="label-tiny">CRM</span>
          <h1 className="font-display text-4xl font-bold uppercase leading-none mt-1">Leads</h1>
        </div>
        <span className="badge badge-dark">{leads.length} total</span>
      </div>

      <div className="brutal-card space-y-3">
        <div className="flex items-center gap-2"><Filter size={14} /><span className="label-tiny">Temperatura</span></div>
        <div className="grid grid-cols-4 gap-2">
          <FilterBtn active={!temp} onClick={() => setTemp("")} label="Todas" />
          {TEMPS.map((t) => (
            <FilterBtn key={t} active={temp === t} onClick={() => setTemp(t)} label={`${t} (${counts[t] || 0})`} testid={`filter-temp-${t}`} />
          ))}
        </div>
        <div className="flex items-center gap-2"><Filter size={14} /><span className="label-tiny">Estado</span></div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <FilterBtn active={!status} onClick={() => setStatus("")} label="Todos" />
          {STATUSES.map((s) => (
            <FilterBtn key={s} active={status === s} onClick={() => setStatus(s)} label={s} testid={`filter-status-${s}`} compact />
          ))}
        </div>
        {(temp || status) && (
          <button onClick={() => { setTemp(""); setStatus(""); }} className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider underline" data-testid="clear-filters">
            <X size={12} /> Limpiar filtros
          </button>
        )}
      </div>

      <div className="space-y-2" data-testid="leads-list">
        {loading && <p className="text-[#5A5A5A]">Cargando…</p>}
        {!loading && leads.length === 0 && (
          <div className="brutal-card text-center text-[#5A5A5A]">Sin leads para estos filtros.</div>
        )}
        {leads.map((l) => (
          <Link key={l.lead_id} to={`/admin/leads/${l.lead_id}`} className="block brutal-card hover:bg-[#FAFAFA] transition-colors" data-testid={`lead-card-${l.lead_id}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl font-bold leading-none">{l.name}</p>
                <p className="text-sm text-[#5A5A5A] mt-1">{l.phone} · {l.city} · {l.age}a</p>
                <p className="text-xs text-[#5A5A5A] mt-1">{new Date(l.created_at).toLocaleString("es-ES")}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`badge badge-${l.temperature}`}>{l.temperature}</span>
                <span className="badge badge-dark">{l.status}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function FilterBtn({ active, onClick, label, compact, testid }) {
  return (
    <button
      onClick={onClick}
      data-testid={testid}
      className={`border-2 border-black ${compact ? "px-3 py-2 text-[10px] whitespace-nowrap" : "px-3 py-2 text-xs"} font-bold uppercase tracking-wider ${
        active ? "bg-[#f2e00f] text-black" : "bg-white text-black hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}
