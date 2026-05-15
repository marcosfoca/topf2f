import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Phone, CheckCircle, Clock } from "lucide-react";
import api from "../../lib/api";

const STATUSES = ["Nuevo", "Pendiente", "Citado", "Confirmado", "No respondió", "No asistió", "Contratado", "Descartado"];

export default function LeadDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [lead, setLead] = useState(null);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/leads/${id}`);
        setLead(data); setNotes(data.notes || ""); setStatus(data.status);
      } catch { toast.error("No se pudo cargar"); }
    })();
  }, [id]);

  const save = async () => {
    try {
      const { data } = await api.patch(`/leads/${id}`, { status, notes });
      setLead(data);
      toast.success("Guardado");
    } catch { toast.error("Error al guardar"); }
  };

  if (!lead) return <div className="brutal-card">Cargando…</div>;

  return (
    <div className="space-y-4" data-testid="lead-detail">
      <button onClick={() => nav(-1)} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" data-testid="back-btn">
        <ArrowLeft size={14} /> Volver
      </button>

      <div className="brutal-card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="label-tiny">Lead</span>
            <h1 className="font-display text-3xl font-bold uppercase leading-none mt-1">{lead.name}</h1>
            <p className="text-sm text-[#5A5A5A] mt-2">
              {lead.city} · {lead.age}a · {lead.time_preference || lead.availability}
            </p>
            <p className="text-xs text-[#5A5A5A]">Creado: {new Date(lead.created_at).toLocaleString("es-ES")}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`badge badge-${lead.temperature}`}>{lead.temperature}</span>
            <span className="badge badge-dark">{lead.status}</span>
            {lead.verified ? (
              <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-green-700 bg-green-100 border-2 border-green-700 px-2 py-0.5">
                <CheckCircle size={12} /> Verificado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 border-2 border-gray-400 px-2 py-0.5">
                <Clock size={12} /> Sin verificar
              </span>
            )}
          </div>
        </div>
        <a href={`tel:${lead.phone}`} className="btn-dark w-full mt-4" data-testid="call-btn">
          <Phone size={16} className="mr-2" /> Llamar {lead.phone}
        </a>
      </div>

      <div className="brutal-card">
        <span className="label-tiny">Datos del candidato</span>
        <ul className="mt-2 text-sm space-y-1">
          <li>Edad: <b>{lead.age}</b></li>
          <li>Teléfono: <b>{lead.phone}</b></li>
          <li>Ciudad: <b>{lead.city}</b></li>
          <li>Preferencia horaria: <b>{lead.time_preference || lead.availability || "—"}</b></li>
          <li>Documento: <b>{lead.id_doc_type || lead.id_document_type || "—"}</b></li>
          <li>
            WhatsApp verificado:{" "}
            <b>{lead.verified ? `Sí (${lead.verified_at ? new Date(lead.verified_at).toLocaleString("es-ES") : "—"})` : "No"}</b>
          </li>
        </ul>
      </div>

      <div className="brutal-card">
        <span className="label-tiny">Actitud</span>
        <ul className="mt-2 text-sm space-y-1">
          <li>Cara al público: <b>{lead.likes_public ? "Sí" : "No"}</b></li>
          <li>Sociable: <b>{lead.is_social ? "Sí" : "No"}</b></li>
          <li>Busca flexible: <b>{lead.wants_flexible ? "Sí" : "No"}</b></li>
        </ul>
      </div>

      <div className="brutal-card space-y-3">
        <span className="label-tiny">Estado</span>
        <div className="grid grid-cols-2 gap-2">
          {STATUSES.map((s) => (
            <button
              key={s}
              data-testid={`status-${s}`}
              onClick={() => setStatus(s)}
              className={`border-2 border-black px-3 py-2 text-xs font-bold uppercase tracking-wider ${
                status === s ? "bg-[#f2e00f] text-black" : "bg-white text-black hover:bg-gray-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="label-tiny">Notas</span>
        <textarea data-testid="notes-input" className="brutal-input" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <button data-testid="save-lead-btn" onClick={save} className="btn-primary w-full">Guardar cambios</button>
      </div>
    </div>
  );
}
