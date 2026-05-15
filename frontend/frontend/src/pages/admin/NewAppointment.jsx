import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Users } from "lucide-react";
import api from "../../lib/api";

function localDatetimePlus12h() {
  const d = new Date(Date.now() + 13 * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewAppointment() {
  const nav = useNavigate();
  const [offices, setOffices] = useState([]);
  const [form, setForm] = useState({
    office_id: "",
    scheduled_at: localDatetimePlus12h(),
    age_min: 18,
    age_max: 35,
    doc_type_filter: "AMBAS",
    num_leads_requested: 10,
  });
  const [submitting, setSubmitting] = useState(false);
  const [availableCount, setAvailableCount] = useState(null);
  const [counting, setCounting] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/offices");
        const open = data.filter((x) => x.hiring_open);
        setOffices(open);
        if (open[0]) setForm((f) => ({ ...f, office_id: open[0].office_id }));
      } catch {}
    })();
  }, []);

  // Live counter with 500ms debounce
  const fetchCount = useCallback(async (age_min, age_max, doc_type) => {
    setCounting(true);
    try {
      const { data } = await api.get("/leads/count-available", {
        params: { age_min, age_max, doc_type },
      });
      setAvailableCount(data.count);
    } catch {
      setAvailableCount(null);
    } finally {
      setCounting(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchCount(form.age_min, form.age_max, form.doc_type_filter);
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [form.age_min, form.age_max, form.doc_type_filter, fetchCount]);

  const hoursAhead = useMemo(() => {
    const t = new Date(form.scheduled_at).getTime();
    return (t - Date.now()) / 3600000;
  }, [form.scheduled_at]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.office_id) { toast.error("Selecciona oficina"); return; }
    if (form.num_leads_requested <= 0) { toast.error("Selecciona al menos un lead"); return; }
    if (form.age_min > form.age_max) { toast.error("Edad mínima no puede ser mayor que la máxima"); return; }
    if (hoursAhead < 12) { toast.error("La citación debe tener mínimo 12h de antelación"); return; }
    setSubmitting(true);
    try {
      const isoLocal = new Date(form.scheduled_at).toISOString();
      await api.post("/appointments", {
        office_id: form.office_id,
        scheduled_at: isoLocal,
        age_min: form.age_min,
        age_max: form.age_max,
        doc_type_filter: form.doc_type_filter,
        num_leads_requested: form.num_leads_requested,
      });
      toast.success("Citación creada");
      nav("/admin/appointments");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al crear");
    } finally {
      setSubmitting(false);
    }
  };

  const setNum = (k, v) => setForm((f) => ({ ...f, [k]: Math.max(0, parseInt(v || 0, 10)) }));

  return (
    <div className="space-y-4" data-testid="new-appointment-page">
      <button onClick={() => nav(-1)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
        <ArrowLeft size={14} /> Volver
      </button>
      <div>
        <span className="label-tiny">Nueva</span>
        <h1 className="font-display text-4xl font-bold uppercase leading-none mt-1">Citación</h1>
      </div>

      <form onSubmit={submit} className="brutal-card space-y-5">
        {/* Oficina */}
        <div>
          <span className="label-tiny">Oficina</span>
          <select data-testid="appt-office" className="brutal-input mt-1" value={form.office_id} onChange={(e) => setForm({ ...form, office_id: e.target.value })}>
            <option value="">— Selecciona oficina —</option>
            {offices.map((o) => (
              <option key={o.office_id} value={o.office_id}>{o.name} · {o.city}</option>
            ))}
          </select>
          {offices.length === 0 && <p className="text-xs text-[#FF3B30] mt-2">No hay oficinas abiertas. Abre una en Oficinas.</p>}
        </div>

        {/* Fecha y hora */}
        <div>
          <span className="label-tiny">Fecha y hora (mín. 12h de antelación)</span>
          <input data-testid="appt-datetime" type="datetime-local" className="brutal-input mt-1" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
          <p className={`text-xs mt-1 ${hoursAhead < 12 ? "text-[#FF3B30]" : "text-[#5A5A5A]"}`}>
            {hoursAhead < 12 ? `Faltan ${hoursAhead.toFixed(1)}h (mínimo 12h)` : `${hoursAhead.toFixed(1)}h por delante`}
          </p>
        </div>

        {/* Filtros de candidatos */}
        <div>
          <span className="label-tiny">Filtros de candidatos</span>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <span className="label-tiny">Edad mínima</span>
              <input
                data-testid="appt-age-min"
                type="number" min="16" max="99" className="brutal-input mt-1"
                value={form.age_min}
                onChange={(e) => setNum("age_min", e.target.value)}
              />
            </div>
            <div>
              <span className="label-tiny">Edad máxima</span>
              <input
                data-testid="appt-age-max"
                type="number" min="16" max="99" className="brutal-input mt-1"
                value={form.age_max}
                onChange={(e) => setNum("age_max", e.target.value)}
              />
            </div>
          </div>
          <div className="mt-3">
            <span className="label-tiny">Tipo de documento</span>
            <select
              data-testid="appt-doc-type"
              className="brutal-input mt-1"
              value={form.doc_type_filter}
              onChange={(e) => setForm({ ...form, doc_type_filter: e.target.value })}
            >
              <option value="AMBAS">AMBAS (DNI y NIE)</option>
              <option value="DNI">Solo DNI</option>
              <option value="NIE">Solo NIE</option>
            </select>
          </div>
        </div>

        {/* Contador en tiempo real */}
        <div className="border-2 border-black p-3 bg-[#F4F4F4] flex items-center gap-3" data-testid="available-counter">
          <Users size={20} strokeWidth={2.5} />
          <div>
            <span className="label-tiny block">Leads verificados disponibles</span>
            {counting ? (
              <span className="font-display text-2xl font-bold">…</span>
            ) : availableCount === null ? (
              <span className="text-sm text-[#5A5A5A]">—</span>
            ) : (
              <span className={`font-display text-2xl font-bold ${availableCount === 0 ? "text-[#FF3B30]" : "text-black"}`}>
                {availableCount}
              </span>
            )}
          </div>
          {availableCount !== null && availableCount === 0 && (
            <p className="text-xs text-[#FF3B30] ml-2">Ningún lead cumple los filtros actuales</p>
          )}
        </div>

        {/* Número de candidatos */}
        <div>
          <span className="label-tiny">Número de candidatos a citar</span>
          <input
            data-testid="appt-num-leads"
            type="number" min="1" className="brutal-input mt-1"
            value={form.num_leads_requested}
            onChange={(e) => setNum("num_leads_requested", e.target.value)}
          />
          {availableCount !== null && form.num_leads_requested > availableCount && (
            <p className="text-xs text-[#FF9500] mt-1">
              Solo hay {availableCount} leads disponibles — se citarán todos los que haya
            </p>
          )}
        </div>

        <button type="submit" disabled={submitting} className="btn-primary w-full" data-testid="submit-appointment">
          {submitting ? "Creando…" : "Crear citación"}
        </button>
      </form>
    </div>
  );
}
