import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowRight, Clock, Users, Zap, Sparkles } from "lucide-react";
import api from "../lib/api";

const HERO_IMG = "https://static.prod-images.emergentagent.com/jobs/13585cec-3ae5-47fc-b984-19005d3e4627/images/f0bef99c48dda54785864c70fc6ce166763dbf449542aa9d8bec881960d0e154.png";

const PERKS = [
  { icon: Clock, text: "Horarios flexibles" },
  { icon: Sparkles, text: "Compatible con estudios" },
  { icon: Users, text: "Equipo joven y buen rollo" },
  { icon: Zap, text: "Incentivos" },
];

export default function Landing() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    age: "",
    phone: "",
    city: "",
    time_preference: "tardes",
    id_doc_type: "DNI",
    likes_public: "yes",
    is_social: "yes",
    wants_flexible: "yes",
    consent: false,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.consent) { toast.error("Necesitas aceptar el consentimiento"); return; }
    if (!form.name || !form.phone || !form.city || !form.age) { toast.error("Completa los campos básicos"); return; }
    setSubmitting(true);
    try {
      await api.post("/leads", {
        name: form.name,
        age: parseInt(form.age, 10),
        phone: form.phone,
        city: form.city,
        time_preference: form.time_preference,
        id_doc_type: form.id_doc_type,
        likes_public: form.likes_public === "yes",
        is_social: form.is_social === "yes",
        wants_flexible: form.wants_flexible === "yes",
        consent: form.consent,
      });
      navigate("/gracias");
    } catch (err) {
      toast.error("No se pudo enviar. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F4F4] text-black">
      {/* Top bar */}
      <header className="border-b-2 border-black bg-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#f2e00f] border-2 border-black px-2 py-1 font-display font-bold text-lg leading-none">TOP</div>
            <div className="font-display font-bold text-lg leading-none">F2F</div>
          </div>
          <span className="label-tiny hidden sm:inline">Trabajo · Madrid</span>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b-2 border-black">
        <img src={HERO_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/55" />
        <div className="relative max-w-5xl mx-auto px-4 py-14 sm:py-24">
          <span className="badge badge-accent" data-testid="hero-tag">PLAZAS ABIERTAS</span>
          <h1 className="font-display mt-4 text-white text-4xl sm:text-6xl lg:text-7xl font-bold uppercase leading-[0.95] tracking-tight">
            Gana dinero.<br/>Conoce gente.<br/><span className="text-[#f2e00f]">Empieza ya.</span>
          </h1>
          <p className="mt-5 max-w-xl text-white/85 text-base sm:text-lg">
            Trabajo F2F para ONGs. Buen rollo, horarios flexibles e incentivos que suben con tus resultados. Sin experiencia previa.
          </p>
          <a href="#form" className="btn-primary mt-7" data-testid="cta-scroll-to-form">
            Apuntarme <ArrowRight size={18} className="ml-2" strokeWidth={3} />
          </a>
        </div>
      </section>

      {/* Marquee */}
      <div className="bg-[#f2e00f] border-b-2 border-black overflow-hidden">
        <div className="marquee py-3">
          <div className="marquee__track font-display font-bold uppercase text-2xl sm:text-3xl">
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={i} className="flex gap-8">
                <span>Empieza rápido</span><span>·</span>
                <span>Horarios flexibles</span><span>·</span>
                <span>Gente joven</span><span>·</span>
                <span>Buen rollo</span><span>·</span>
                <span>Incentivos</span><span>·</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Perks */}
      <section className="max-w-5xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PERKS.map((p) => (
            <div key={p.text} className="brutal-card flex items-start gap-3" data-testid={`perk-${p.text}`}>
              <p.icon size={22} strokeWidth={2.5} />
              <p className="font-bold uppercase text-sm leading-snug">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form */}
      <section id="form" className="max-w-3xl mx-auto px-4 pb-16">
        <div className="brutal-card" style={{ boxShadow: "6px 6px 0 0 #0A0A0A" }}>
          <span className="badge badge-dark">Formulario · 30 segundos</span>
          <h2 className="font-display text-3xl sm:text-4xl font-bold uppercase mt-3">Apúntate</h2>
          <p className="text-[#5A5A5A] mt-1">Sin CV. Sin vueltas. Solo lo esencial.</p>

          <form onSubmit={submit} className="mt-6 space-y-5" data-testid="application-form">
            <Question label="¿Te gusta tratar con gente cara a cara?" value={form.likes_public} onChange={(v) => set("likes_public", v)} testid="q-likes_public" />
            <Question label="¿Te consideras sociable?" value={form.is_social} onChange={(v) => set("is_social", v)} testid="q-is_social" />
            <Question label="¿Buscas un trabajo flexible?" value={form.wants_flexible} onChange={(v) => set("wants_flexible", v)} testid="q-wants_flexible" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Nombre">
                <input data-testid="input-name" className="brutal-input" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Tu nombre" />
              </Field>
              <Field label="Edad">
                <input data-testid="input-age" type="number" min="16" max="65" className="brutal-input" value={form.age} onChange={(e) => set("age", e.target.value)} placeholder="22" />
              </Field>
              <Field label="Teléfono">
                <input data-testid="input-phone" className="brutal-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+34 ..." />
              </Field>
              <Field label="Ciudad">
                <input data-testid="input-city" className="brutal-input" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Madrid" />
              </Field>
              <Field label="Preferencia horaria">
                <select data-testid="input-time_preference" className="brutal-input" value={form.time_preference} onChange={(e) => set("time_preference", e.target.value)}>
                  <option value="mañanas">Mañanas</option>
                  <option value="tardes">Tardes</option>
                  <option value="indiferente">Indiferente</option>
                </select>
              </Field>
              <Field label="Tipo de documento de identificación">
                <select data-testid="input-docs" className="brutal-input" value={form.id_doc_type} onChange={(e) => set("id_doc_type", e.target.value)}>
                  <option value="DNI">DNI</option>
                  <option value="NIE">NIE</option>
                  <option value="AMBAS">AMBAS (DNI y NIE)</option>
                </select>
              </Field>
            </div>

            <label className="flex items-start gap-3 text-sm">
              <input data-testid="input-consent" type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-1 w-5 h-5 accent-black" />
              <span>Acepto que TOP F2F me contacte por WhatsApp/teléfono para concertar una entrevista. Mis datos se tratan según RGPD.</span>
            </label>

            <button data-testid="submit-form-btn" type="submit" disabled={submitting} className="btn-primary w-full disabled:opacity-60">
              {submitting ? "Enviando…" : "Enviar y reservar mi sitio"}
              {!submitting && <ArrowRight className="ml-2" size={18} strokeWidth={3} />}
            </button>
          </form>
        </div>
      </section>

      <footer className="border-t-2 border-black bg-white">
        <div className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-between text-xs uppercase tracking-wider">
          <span>© TOP F2F</span>
          <a href="/login" className="underline font-bold" data-testid="admin-login-link">Admin</a>
        </div>
      </footer>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label-tiny block mb-1">{label}</span>
      {children}
    </label>
  );
}

function Question({ label, value, onChange, testid }) {
  return (
    <div data-testid={testid}>
      <span className="label-tiny block mb-2">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        {[["yes", "Sí"], ["no", "No"]].map(([v, l]) => (
          <button
            key={v}
            type="button"
            data-testid={`${testid}-${v}`}
            onClick={() => onChange(v)}
            className={`border-2 border-black px-4 py-3 text-sm font-bold uppercase tracking-wider transition-colors ${
              value === v ? "bg-[#f2e00f] text-black" : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
