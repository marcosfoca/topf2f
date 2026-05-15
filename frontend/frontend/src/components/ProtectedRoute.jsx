import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../lib/api";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState(location.state?.user ? "ok" : "checking");

  useEffect(() => {
    if (state === "ok") return;
    if (window.location.hash?.includes("session_id=")) return;
    (async () => {
      try {
        await api.get("/auth/me");
        setState("ok");
      } catch (e) {
        setState("nope");
        navigate("/login", { replace: true });
      }
    })();
  }, [state, navigate]);

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="brutal-card">
          <p className="font-display text-xl uppercase">Cargando…</p>
        </div>
      </div>
    );
  }
  if (state !== "ok") return null;
  return children;
}
