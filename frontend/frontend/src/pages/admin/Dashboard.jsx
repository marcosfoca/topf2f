import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, ThermometerSun, Snowflake, Users, Building2, CalendarClock, ArrowRight } from "lucide-react";
import api from "../../lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get("/dashboard/stats"); setStats(data); }
      catch {}
    })();
  }, []);

  if (!stats) return <div className="brutal-card">Cargando…</div>;

  return (
    <div className="space-y-4" data-testid="admin-dashboard">
      <div>
        <span className="label-tiny">Panel</span>
        <h1 className="font-display text-4xl font-bold uppercase leading-none mt-1">Inicio</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Leads totales" value={stats.total_leads} icon={Users} testid="stat-total" />
        <Stat label="Pendientes" value={stats.pendientes} icon={Users} testid="stat-pending" />
      </div>

      <div className="brutal-card">
        <span className="label-tiny">Temperatura</span>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <TempBox label="Hot" value={stats.hot} icon={Flame} className="bg-[#FF3B30] text-white" />
          <TempBox label="Warm" value={stats.warm} icon={ThermometerSun} className="bg-[#FF9500] text-black" />
          <TempBox label="Cold" value={stats.cold} icon={Snowflake} className="bg-[#007AFF] text-white" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="Oficinas activas" value={`${stats.offices_open}/${stats.offices}`} icon={Building2} testid="stat-offices" />
        <Stat label="Citados hoy" value={stats.leads_citados_today} icon={CalendarClock} testid="stat-today" />
      </div>

      <div className="brutal-card">
        <div className="flex items-center justify-between">
          <span className="label-tiny">Próximas citas</span>
          <Link to="/admin/appointments" className="text-xs font-bold uppercase tracking-wider underline">Ver todo</Link>
        </div>
        <div className="mt-3 divide-y divide-black/15">
          {stats.upcoming_appointments?.length === 0 && (
            <p className="text-sm text-[#5A5A5A] py-3">Sin citas próximas.</p>
          )}
          {stats.upcoming_appointments?.map((a) => (
            <div key={a.appointment_id} className="py-3 flex items-center justify-between" data-testid={`upcoming-${a.appointment_id}`}>
              <div>
                <p className="font-bold uppercase text-sm">{a.office_name}</p>
                <p className="text-xs text-[#5A5A5A]">{new Date(a.scheduled_at).toLocaleString("es-ES")} · {a.lead_ids?.length || 0} leads</p>
              </div>
              <ArrowRight size={16} />
            </div>
          ))}
        </div>
      </div>

      <Link to="/admin/appointments/new" className="btn-primary w-full" data-testid="cta-new-appointment">
        Crear nueva citación <ArrowRight size={18} className="ml-2" strokeWidth={3} />
      </Link>
    </div>
  );
}

function Stat({ label, value, icon: Icon, testid }) {
  return (
    <div className="brutal-card" data-testid={testid}>
      <div className="flex items-center justify-between">
        <span className="label-tiny">{label}</span>
        <Icon size={16} strokeWidth={2.5} />
      </div>
      <p className="font-display text-4xl font-bold mt-1">{value}</p>
    </div>
  );
}

function TempBox({ label, value, icon: Icon, className }) {
  return (
    <div className={`border-2 border-black p-3 ${className}`}>
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
        <Icon size={12} strokeWidth={3} /> {label}
      </div>
      <p className="font-display text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
