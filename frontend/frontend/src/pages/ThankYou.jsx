import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function ThankYou() {
  return (
    <div className="min-h-screen bg-[#F4F4F4] flex items-center justify-center px-4">
      <div className="brutal-card max-w-lg w-full" style={{ boxShadow: "6px 6px 0 0 #0A0A0A" }} data-testid="thankyou-card">
        <div className="bg-[#f2e00f] border-2 border-black inline-flex items-center gap-2 px-3 py-2">
          <CheckCircle2 size={20} strokeWidth={3} />
          <span className="font-bold uppercase text-sm tracking-wider">Recibido</span>
        </div>
        <h1 className="font-display text-4xl sm:text-5xl font-bold uppercase mt-4 leading-none">¡Perfecto!</h1>
        <p className="mt-4 text-base">
          Hemos recibido tu solicitud. Te avisaremos por WhatsApp cuando abramos nuevas entrevistas en tu zona.
        </p>
        <p className="mt-2 text-[#5A5A5A] text-sm">Mientras tanto, atento al teléfono. Suele ir rápido.</p>
        <Link to="/" className="btn-dark mt-6 inline-flex" data-testid="back-home-btn">Volver al inicio</Link>
      </div>
    </div>
  );
}
