import React from 'react';
import { 
  Clapperboard, 
  Film, 
  Star, 
  Bookmark, 
  SlidersHorizontal, 
  ArrowRight, 
  UserCheck, 
  Play, 
  Layers, 
  Compass,
  ChevronRight,
  Tv
} from 'lucide-react';
import { motion } from 'motion/react';
import { useMedia } from '../context/MediaContext';
import { FeaturesShowcase } from './FeaturesShowcase';
import { UserTestimonialsSection } from './UserTestimonialsSection';
import { ContactSection } from './ContactSection';

export const LandingPublicView: React.FC = () => {
  const { 
    setActiveTab, 
    openAuthModal, 
    currentUser, 
    mediaList, 
    openTrailer,
    setSelectedMediaId 
  } = useMedia();

  // Show up to 5 featured titles for a balanced 2->5 columns mobile-first responsive grid
  const previewItems = mediaList.slice(0, 5);

  return (
    <div id="landing-public-view" className="space-y-20 pb-24">
      
      {/* 1. HERO DE BIENVENIDA & PRESENTACIÓN CINEMATOGRÁFICA DE SCREENLOG */}
      <section className="relative overflow-hidden rounded-3xl bg-[#161618] border border-white/10 p-8 sm:p-14 lg:p-16 shadow-2xl shadow-rose-950/30">
        
        {/* Cinematic Multi-Layer Ambient Lighting & Spotlights */}
        <div className="absolute -top-36 left-1/2 -translate-x-1/2 w-[650px] h-[400px] bg-rose-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-36 -right-20 w-[450px] h-[400px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute top-1/2 -left-32 -translate-y-1/2 w-[350px] h-[350px] bg-purple-600/10 rounded-full blur-[90px] pointer-events-none" />
        
        {/* Top Rim Light Accent Line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-7">
          {/* Main Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-display font-extrabold text-white tracking-tight leading-[1.12]"
          >
            Tu Bitácora y Comunidad Definitiva para el{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-rose-300 to-amber-400 drop-shadow-[0_2px_14px_rgba(225,29,72,0.35)]">
              Cine y las Series
            </span>
          </motion.h1>

          {/* Description */}
          <motion.p 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto"
          >
            ScreenLog es la plataforma integral diseñada para cinéfilos: organiza tu lista de pendientes, clasifica con un sistema de 5 estrellas y evaluación técnica en 5 ejes, redacta críticas y comparte tu pasión con la comunidad.
          </motion.p>

          {/* Action CTAs */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3.5 pt-3"
          >
            {/* Primary Cine CTA */}
            <button
              id="landing-enter-system-btn"
              onClick={() => setActiveTab('sistema')}
              className="group relative inline-flex items-center justify-center gap-2.5 px-7 py-3.5 sm:px-8 sm:py-4 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 hover:from-rose-500 hover:to-rose-600 text-white font-bold text-sm sm:text-base shadow-xl shadow-rose-950/60 hover:shadow-2xl hover:shadow-rose-900/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#161618] focus-visible:outline-none"
            >
              <Clapperboard className="w-5 h-5 transition-transform duration-200 group-hover:rotate-6" aria-hidden="true" />
              <span>Entrar al Sistema Cinéfilo</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
            </button>

            {/* Auth / Watchlist CTA */}
            {!currentUser ? (
              <button
                id="landing-register-btn"
                onClick={() => openAuthModal('register')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-white font-semibold text-sm sm:text-base border border-white/10 hover:border-white/20 backdrop-blur-md shadow-lg shadow-black/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#161618] focus-visible:outline-none"
              >
                <UserCheck className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span>Crear Cuenta Gratis</span>
              </button>
            ) : (
              <button
                onClick={() => setActiveTab('mi_lista')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] text-white font-semibold text-sm sm:text-base border border-white/10 hover:border-white/20 backdrop-blur-md shadow-lg shadow-black/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#161618] focus-visible:outline-none"
              >
                <Bookmark className="w-4 h-4 text-rose-400" aria-hidden="true" />
                <span>Ir a Mi Cuaderno de Lista</span>
              </button>
            )}

            {/* Explore Catalog Secondary Action */}
            <button
              onClick={() => setActiveTab('explorar')}
              className="group inline-flex items-center justify-center gap-2 px-5 py-3.5 sm:py-4 rounded-xl bg-transparent hover:bg-white/5 text-slate-300 hover:text-white text-sm sm:text-base font-medium border border-transparent hover:border-white/10 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#161618] focus-visible:outline-none"
            >
              <Compass className="w-4 h-4 text-slate-400 group-hover:text-rose-400 transition-colors" aria-hidden="true" />
              <span>Explorar Catálogo</span>
            </button>
          </motion.div>

          {/* Quick Pillars (4 Feature Highlights with Glassmorphic Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-10 border-t border-white/[0.08] text-left">
            
            {/* 1. Catálogo Vivo */}
            <div className="group p-4 rounded-2xl bg-[#0A0A0B]/40 hover:bg-[#0A0A0B]/80 border border-white/5 hover:border-rose-500/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 shadow-md">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-105 transition-transform">
                  <Film className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <h3 className="font-display font-bold text-sm text-white group-hover:text-rose-300 transition-colors">
                  Catálogo Vivo
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Películas, series, animes y títulos propios.
              </p>
            </div>

            {/* 2. Calificación Pro */}
            <div className="group p-4 rounded-2xl bg-[#0A0A0B]/40 hover:bg-[#0A0A0B]/80 border border-white/5 hover:border-amber-500/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 shadow-md">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Star className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <h3 className="font-display font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                  Calificación Pro
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Escala de 1 a 5 estrellas con rewatch y notas.
              </p>
            </div>

            {/* 3. 5 Dimensiones */}
            <div className="group p-4 rounded-2xl bg-[#0A0A0B]/40 hover:bg-[#0A0A0B]/80 border border-white/5 hover:border-purple-500/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 shadow-md">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <h3 className="font-display font-bold text-sm text-white group-hover:text-purple-300 transition-colors">
                  5 Dimensiones
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Votación en guión, actuación, dirección y más.
              </p>
            </div>

            {/* 4. Mi Lista */}
            <div className="group p-4 rounded-2xl bg-[#0A0A0B]/40 hover:bg-[#0A0A0B]/80 border border-white/5 hover:border-emerald-500/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 shadow-md">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Bookmark className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <h3 className="font-display font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                  Mi Lista
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Bitácora organizada: pendientes, viendo y vistas.
              </p>
            </div>

          </div>

        </div>

      </section>

      {/* 2. INTERACTIVE PREVIEW: ¿CÓMO LUCE EL SISTEMA POR DENTRO? (GRID RESPONSIVE 2 -> 5 COLUMNAS) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/5 pb-4">
          <div className="space-y-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-rose-400" aria-hidden="true" /> 
              <span>Muestra del Catálogo</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">
              Vistazo Rápido al Sistema Cinéfilo
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Haz clic en cualquier título para ver su ficha técnica o entra directamente al sistema completo.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('sistema')}
            className="group inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 text-xs font-bold text-rose-400 hover:text-rose-300 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
          >
            <span>Ver todo en el sistema</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </div>

        {/* Responsive Mobile-First Grid: 2 -> 5 columns */}
        {previewItems.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4 lg:gap-5">
            {previewItems.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                aria-label={`Ver detalles de ${item.title}`}
                onClick={() => setSelectedMediaId(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedMediaId(item.id);
                  }
                }}
                className="group relative cursor-pointer bg-[#161618] border border-white/10 hover:border-rose-500/50 rounded-2xl overflow-hidden shadow-xl shadow-black/40 hover:shadow-2xl hover:shadow-rose-950/40 transition-all duration-300 hover:-translate-y-1.5 flex flex-col focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none"
              >
                {/* Poster Frame with Aspect Ratio 2/3 */}
                <div className="relative aspect-[2/3] overflow-hidden bg-slate-950">
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    referrerPolicy="no-referrer"
                  />
                  
                  {/* Subtle Deep Cinematic Scrim Vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#161618] via-black/20 to-transparent opacity-90" />
                  
                  {/* Media Type Tag (Película / Serie) */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[10px] font-semibold text-slate-300 uppercase tracking-wider">
                    {item.type === 'pelicula' ? (
                      <>
                        <Film className="w-2.5 h-2.5 text-rose-400" aria-hidden="true" />
                        <span>Película</span>
                      </>
                    ) : (
                      <>
                        <Tv className="w-2.5 h-2.5 text-amber-400" aria-hidden="true" />
                        <span>Serie</span>
                      </>
                    )}
                  </div>

                  {/* Rating Badge */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-amber-400/25 text-amber-400 text-xs font-bold shadow-md">
                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                    <span>{item.communityRating.toFixed(1)}</span>
                  </div>

                  {/* Play Trailer Quick Action Button */}
                  <button
                    type="button"
                    aria-label={`Ver tráiler de ${item.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openTrailer(item.trailerYoutubeId);
                    }}
                    className="absolute bottom-2.5 left-2.5 p-2.5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white shadow-xl shadow-rose-950/80 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                    title="Ver Tráiler"
                  >
                    <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" aria-hidden="true" />
                  </button>
                </div>

                {/* Card Content & Metadata */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-display text-xs sm:text-sm font-bold text-white group-hover:text-rose-400 transition-colors line-clamp-1 leading-snug">
                      {item.title}
                    </h4>
                    
                    {/* Unboxed Metadata with Typographic Separator */}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1 truncate">
                      <span>{item.year}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="truncate">{item.genres[0]}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="truncate text-slate-400">{item.defaultPlatform}</span>
                    <span className="text-rose-400 font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      <span>Ficha</span>
                      <ChevronRight className="w-3 h-3" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="p-12 text-center rounded-2xl bg-[#161618] border border-white/5 text-slate-400 space-y-3">
            <Film className="w-10 h-10 mx-auto text-slate-600" aria-hidden="true" />
            <h3 className="text-base font-semibold text-slate-200">No hay títulos disponibles</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Actualmente el catálogo está actualizándose o no se encontraron películas en la lista inicial.
            </p>
          </div>
        )}
      </section>

      {/* 3. ¿QUÉ OFRECEMOS EN SCREENLOG? Y ¿CÓMO LO HACEMOS? */}
      <FeaturesShowcase />

      {/* 4. DEJA TU OPINIÓN SOBRE SCREENLOG (Comentarios de la web) */}
      <UserTestimonialsSection />

      {/* 5. CONTÁCTANOS Y SOPORTE (Formulario de tickets y contacto) */}
      <ContactSection />

      {/* 6. BOTTOM BANNER DE CONVERSIÓN CINEMATOGRÁFICA */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-rose-950/40 via-[#161618] to-purple-950/30 border border-rose-500/30 p-8 sm:p-12 text-center space-y-5 shadow-2xl shadow-rose-950/30">
        
        {/* Glow ambient */}
        <div className="absolute top-0 right-1/4 w-80 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-xl mx-auto space-y-3.5">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-600 text-white font-extrabold text-[11px] uppercase tracking-wider shadow-md shadow-rose-950/50">
            ¡Comienza Ahora Mismo!
          </span>
          <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
            ¿Listo para Transformar tu Experiencia Cinéfila?
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
            Únete a cientos de cinéfilos que ya clasifican, guardan y debaten sus películas y series favoritas en ScreenLog.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => setActiveTab('sistema')}
              className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 hover:shadow-rose-600/50 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-none"
            >
              <Clapperboard className="w-4 h-4" aria-hidden="true" />
              <span>Ingresar al Sistema</span>
            </button>
            <button
              onClick={() => {
                document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/10 hover:border-white/20 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            >
              Hacer una Pregunta
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
