import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutGrid, Users, Building2, CalendarClock, LogOut, Plus } from "lucide-react";
import api from "../lib/api";

const tabs = [
  { to: "/admin/dashboard", label: "Inicio", icon: LayoutGrid },
  { to: "/admin/leads", label: "Leads", icon: Users },
  { to: "/admin/appointments", label: "Citas", icon: CalendarClock },
  { to: "/admin/offices", label: "Oficinas", icon: Building2 },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    navigate("/login", { replace: true });
  };
  return (
    <div className="min-h-screen bg-[#F4F4F4] pb-24">
      <header className="sticky top-0 z-30 bg-white border-b-2 border-black">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="bg-[#f2e00f] border-2 border-black px-2 py-1 font-display font-bold text-lg leading-none">TOP</div>
            <div className="font-display font-bold text-lg leading-none">F2F</div>
          </div>
          <button
            data-testid="logout-btn"
            onClick={logout}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider border-2 border-black px-3 py-2 hover:bg-black hover:text-white transition-colors"
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black z-30" data-testid="admin-bottom-nav">
        <div className="max-w-3xl mx-auto grid grid-cols-4">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              data-testid={`nav-${t.label.toLowerCase()}`}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-bold uppercase tracking-wider border-r-2 border-black last:border-r-0 ${
                  isActive ? "bg-[#f2e00f] text-black" : "bg-white text-black hover:bg-gray-100"
                }`
              }
            >
              <t.icon size={20} strokeWidth={2.5} />
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

export function FloatingNew({ to, label = "Nueva" }) {
  return (
    <NavLink
      to={to}
      data-testid="fab-new"
      className="fixed bottom-24 right-4 z-40 flex items-center gap-2 bg-[#f2e00f] text-black border-2 border-black px-4 py-3 font-bold uppercase tracking-wider"
      style={{ boxShadow: "4px 4px 0 0 #0A0A0A" }}
    >
      <Plus size={18} strokeWidth={3} /> {label}
    </NavLink>
  );
}
