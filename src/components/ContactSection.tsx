import React, { useState } from 'react';
import { 
  Mail, 
  Send, 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  HelpCircle, 
  Film, 
  Sparkles, 
  PhoneCall, 
  Globe, 
  Headphones,
  FileQuestion,
  Lightbulb
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useMedia } from '../context/MediaContext';

export const ContactSection: React.FC = () => {
  const { currentUser } = useMedia();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('sugerencia_pelicula');
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState<'normal' | 'alta'>('normal');
  const [submittedTicket, setSubmittedTicket] = useState<{ id: string; email: string; subjectName: string } | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Auto-fill if user is logged in
  React.useEffect(() => {
    if (currentUser) {
      if (!name) setName(currentUser.name);
      if (!email) setEmail(currentUser.email);
    }
  }, [currentUser]);

  const subjectOptions = [
    { value: 'sugerencia_pelicula', label: '🎬 Sugerir una Película o Serie para el Catálogo' },
    { value: 'reportar_error', label: '🛠️ Reportar un Error, Carátula o Enlace' },
    { value: 'feedback_funcion', label: '💡 Sugerencia de Nueva Función o Mejora' },
    { value: 'cuenta_soporte', label: '👤 Asistencia con Mi Cuenta o Mi Lista' },
    { value: 'prensa_colab', label: '🤝 Colaboraciones, Críticos y Alianzas' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !email.trim()) return;

    setIsSending(true);

    const ticketNumber = `SL-${Math.floor(10000 + Math.random() * 90000)}`;
    const subjectName = subjectOptions.find(o => o.value === subject)?.label || 'Consulta General';

    // Persist ticket to PostgreSQL
    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser?.id,
        name: name.trim(),
        email: email.trim(),
        subject: subjectName,
        message: message.trim(),
        urgency
      })
    }).catch(() => {});

    setTimeout(() => {
      setIsSending(false);
      setSubmittedTicket({
        id: ticketNumber,
        email: email.trim(),
        subjectName
      });

      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
    }, 400);
  };

  const handleReset = () => {
    setMessage('');
    setSubmittedTicket(null);
  };

  return (
    <section id="contact-section" className="space-y-8 pt-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/10 border border-rose-500/25 text-rose-400 text-xs font-bold uppercase tracking-wider">
            <Headphones className="w-3.5 h-3.5" />
            Atención al Cinéfilo & Soporte
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
            Contáctanos en ScreenLog
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-light">
            ¿Tienes sugerencias de títulos para añadir, encontraste algún detalle técnico o quieres proponernos una idea? Escríbenos directamente y te responderemos en breve.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#161618] border border-white/10 px-3.5 py-2 rounded-2xl">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Respuesta promedio: <strong className="text-white font-semibold">&lt; 24 horas</strong></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Contact Form / Confirmation */}
        <div className="lg:col-span-7">
          <div className="bg-[#161618] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            
            {submittedTicket ? (
              <div className="text-center py-8 px-4 space-y-5 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <h3 className="text-xl font-display font-bold text-white">
                    ¡Mensaje Recibido con Éxito!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300">
                    Hemos registrado tu consulta con el ticket <span className="font-mono text-rose-400 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/10">{submittedTicket.id}</span>.
                  </p>
                  <p className="text-xs text-slate-400">
                    Te enviaremos una respuesta y seguimiento a <strong>{submittedTicket.email}</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left text-xs space-y-1.5 max-w-md mx-auto">
                  <div className="text-slate-400">Motivo: <span className="text-white font-medium">{submittedTicket.subjectName}</span></div>
                  <div className="text-slate-400">Estado: <span className="text-emerald-400 font-semibold">En cola de revisión</span></div>
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/10 transition-colors"
                >
                  Enviar Otro Mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase block">
                      Nombre o Usuario
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre o alias"
                      required
                      className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 uppercase block">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ej: correo@ejemplo.com"
                      required
                      className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Subject Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase block">
                    Motivo de Contacto
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-rose-500 focus:outline-none transition-colors"
                  >
                    {subjectOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#161618]">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase block">
                    Mensaje o Detalle
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Describe tu sugerencia, título que te gustaría ver en ScreenLog o detalle de tu consulta..."
                    required
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none resize-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                    <input type="checkbox" defaultChecked className="rounded accent-rose-600" />
                    <span>Deseo recibir confirmación al correo</span>
                  </label>
                </div>

                <button
                  id="contact-submit-btn"
                  type="submit"
                  disabled={isSending}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-sm shadow-xl shadow-rose-900/40 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSending ? 'Enviando Mensaje...' : 'Enviar Mensaje a ScreenLog'}
                </button>
              </form>
            )}

          </div>
        </div>

        {/* RIGHT COLUMN: Direct Info Cards & FAQ */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Card 1: Direct Support Email */}
          <div className="bg-[#161618] border border-white/10 rounded-3xl p-6 shadow-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-600/15 text-rose-400 border border-rose-500/25">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Canal de Correo Oficial</h4>
                <p className="text-xs text-slate-400">Atención personalizada y sugerencias</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-[#0A0A0B] border border-white/5 font-mono text-xs text-rose-300 flex items-center justify-between">
              <span>contacto@screenlog.app</span>
              <span className="text-[10px] text-slate-400 font-sans">Oficial</span>
            </div>
          </div>

          {/* Card 2: Cinema Community & Suggestions */}
          <div className="bg-[#161618] border border-white/10 rounded-3xl p-6 shadow-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Buzón de Nuevos Estrenos</h4>
                <p className="text-xs text-slate-400">Actualización continua del catálogo</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-light">
              Revisamos diariamente las propuestas enviadas para catalogar películas clásicas, producciones de festivales internacionales y estrenos en streaming.
            </p>
          </div>

          {/* Card 3: Security & Privacy Guarantee */}
          <div className="bg-[#161618] border border-white/10 rounded-3xl p-6 shadow-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Privacidad y Sin Spam</h4>
                <p className="text-xs text-slate-400">Tus datos nunca son compartidos</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 font-light">
              No enviamos correos comerciales. Tu correo solo se usará para responder a la consulta que hayas realizado.
            </p>
          </div>

        </div>

      </div>

    </section>
  );
};
