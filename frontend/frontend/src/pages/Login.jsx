import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { LogIn, Shield } from "lucide-react";
import api from "../lib/api";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.error) toast.error(location.state.error);
    (async () => {
      try {
        await api.get("/auth/me");
        navigate("/admin/dashboard", { replace: true });
      } catch {}
    })();
  }, [navigate, location.state]);

  const startGoogle = () => {
    const redirectUrl = window.location.origin + "/admin/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#F4F4F4] flex items-center justify-center px-4">
      <div className="brutal-card max-w-md w-full" style={{ boxShadow: "6px 6px 0 0 #0A0A0A" }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-[#f2e00f] border-2 border-black px-2 py-1 font-display font-bold text-lg leading-none">TOP</div>
          <div className="font-display font-bold text-lg leading-none">F2F · ADMIN</div>
        </div>
        <h1 className="font-display text-4xl font-bold uppercase leading-none">Acceso privado</h1>
        <p className="mt-3 text-[#5A5A5A]">Solo administradores. Inicia sesión con Google.</p>
        <button onClick={startGoogle} className="btn-primary w-full mt-6" data-testid="google-login-btn">
          <LogIn size={18} strokeWidth={3} className="mr-2" /> Continuar con Google
        </button>
        <div className="mt-4 flex items-center gap-2 text-xs text-[#5A5A5A]">
          <Shield size={14} /> Cookies seguras · expira en 7 días
        </div>
      </div>
    </div>
  );
}
