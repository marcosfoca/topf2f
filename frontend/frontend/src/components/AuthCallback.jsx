import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash || "";
    const m = hash.match(/session_id=([^&]+)/);
    const sessionId = m ? m[1] : null;
    if (!sessionId) {
      navigate("/login", { replace: true });
      return;
    }
    (async () => {
      try {
        const { data } = await api.post("/auth/session", { session_id: sessionId });
        window.history.replaceState({}, "", "/admin/dashboard");
        navigate("/admin/dashboard", { replace: true, state: { user: data } });
      } catch (e) {
        navigate("/login", { replace: true, state: { error: "No autorizado o sesión inválida" } });
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F4F4]">
      <div className="brutal-card">
        <p className="font-display text-2xl uppercase">Entrando…</p>
      </div>
    </div>
  );
}
