import React, { useEffect } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clapperboard,
  Compass,
  Film,
  LogIn,
  Play,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tv,
  UserPlus,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useMedia } from '../context/MediaContext';
import { useAuth } from '../context/AuthContext';
import { FeaturesShowcase } from './FeaturesShowcase';
import { UserTestimonialsSection } from './UserTestimonialsSection';
import { ContactSection } from './ContactSection';
import { LogoLockup } from './Logo';

export const LandingPublicView: React.FC = () => {
  const { mediaList, openTrailer, setSelectedMediaId, toastMessage } = useMedia();
  const { requestLogin, enterGuestWorkspace, justLoggedOut, clearLogoutNotice } = useAuth();

  useEffect(() => {
    if (justLoggedOut) {
      const timer = setTimeout(() => {
        clearLogoutNotice();
      }, 9000);
      return () => clearTimeout(timer);
    }
  }, [justLoggedOut, clearLogoutNotice]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Pick posters for the theatrical background collage wall & preview grid
  const collagePosters = mediaList.slice(0, 12);
  const previewItems = mediaList.slice(0, 5);

  return (
    <div id="landing-public-portal" className="min-h-dvh bg-[#070709] text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white overflow-x-hidden">
      {/* ===================================================================== */}
      {/* 1. HEADER EXCLUSIVO DE PORTADA PÚBLICA (TOTALMENTE DISTINTO A LA APP) */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-40 w-full bg-[#070709]/80 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center shrink-0 focus:outline-none group"
          >
            <LogoLockup size={38} showTagline={false} />
          </button>

          {/* Minimalist Storefront Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold tracking-wide text-slate-300" aria-label="Navegación de portada">
            <button
              type="button"
              onClick={() => scrollToSection('public-inside-preview')}
              className="hover:text-white transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 hover:after:w-full after:h-0.5 after:bg-rose-500 after:transition-all"
            >
              La Experiencia
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('public-showcase-grid')}
              className="hover:text-white transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 hover:after:w-full after:h-0.5 after:bg-rose-500 after:transition-all"
            >
              Cartelera
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('user-testimonials-section')}
              className="hover:text-white transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 hover:after:w-full after:h-0.5 after:bg-rose-500 after:transition-all"
            >
              Comunidad
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('contact-section')}
              className="hover:text-white transition-colors relative py-1 after:absolute after:bottom-0 after:left-0 after:w-0 hover:after:w-full after:h-0.5 after:bg-rose-500 after:transition-all"
            >
              Soporte
            </button>
          </nav>

          {/* Clean Auth Doorways */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => requestLogin('login')}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] text-xs sm:text-sm font-semibold text-slate-200 border border-white/10 transition-all"
            >
              <LogIn className="w-3.5 h-3.5 text-rose-400" />
              <span>Entrar</span>
            </button>
            <button
              type="button"
              onClick={() => requestLogin('register')}
              className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-xs sm:text-sm font-bold text-white shadow-lg shadow-rose-950/50 transition-all active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Crear Cuenta</span>
            </button>
          </div>
        </div>
      </header>

      {/* Safe Logout Confirmation Strip (When thrown outside from inside) */}
      <AnimatePresence>
        {justLoggedOut && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="bg-emerald-950/60 border-b border-emerald-500/30 backdrop-blur-xl px-4 py-3"
          >
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5 text-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Has salido del sistema de forma segura.</strong> Estás en el portal público de ScreenLog Pro.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => requestLogin('login')}
                  className="px-3 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 font-semibold border border-emerald-400/30 transition-colors"
                >
                  Volver a iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={clearLogoutNotice}
                  aria-label="Cerrar aviso"
                  className="text-emerald-300/70 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification on Public Portal */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-[#161618] border border-white/15 text-xs sm:text-sm font-semibold text-white shadow-2xl">
          {toastMessage.text}
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. HERO TEATRAL INMERSIVO CON MURAL DE PÓSTERS ANIMADO (FULL-BLEED)   */}
      {/* ===================================================================== */}
      <section className="relative overflow-hidden border-b border-white/[0.06] py-16 sm:py-24 lg:py-28">
        {/* Background Slanted Poster Wall (Visual Storytelling distinct from Dashboard) */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <div className="absolute -inset-24 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 -rotate-6 scale-110 opacity-[0.17]">
            {collagePosters.map((item, idx) => (
              <div
                key={`wall-${item.id}-${idx}`}
                className="aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
              >
                <img
                  src={item.posterUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
          {/* Vignettes & Projector Spotlights */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#070709] via-[#070709]/80 to-[#070709]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#070709] via-transparent to-[#070709]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[780px] h-[420px] bg-rose-600/20 rounded-full blur-[140px]" />
          <div className="absolute bottom-0 right-1/4 w-[480px] h-[360px] bg-amber-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/10 backdrop-blur-md text-xs font-bold uppercase tracking-widest text-rose-300"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Portal Cinéfilo · Cine, Series y Anime</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-display font-black text-white tracking-tight leading-[1.05]"
          >
            Cada Historia Merece{' '}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-rose-300 to-amber-400 drop-shadow-[0_4px_24px_rgba(244,63,94,0.35)]">
              Su Propia Sala Privada.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.16 }}
            className="text-base sm:text-xl text-slate-300 font-normal leading-relaxed max-w-2xl mx-auto"
          >
            Lleva el diario definitivo de todo lo que ves, puntúa con crítica técnica en 5 dimensiones y deja que nuestra IA visual te recomiende tu próxima obra maestra.
          </motion.p>

          {/* Primary Doorway Buttons (Leads into Auth / Login) */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2"
          >
            <button
              id="landing-enter-system-btn"
              type="button"
              onClick={() => requestLogin('login')}
              className="w-full sm:w-auto group inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-base shadow-2xl shadow-rose-950/60 hover:-translate-y-0.5 transition-all"
            >
              <Clapperboard className="w-5 h-5 group-hover:rotate-6 transition-transform" />
              <span>Entrar al Sistema</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              id="landing-register-btn"
              type="button"
              onClick={() => requestLogin('register')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-semibold text-base border border-white/15 backdrop-blur-md hover:-translate-y-0.5 transition-all"
            >
              <UserPlus className="w-4 h-4 text-amber-400" />
              <span>Crear Cuenta Gratis</span>
            </button>
          </motion.div>

          {/* Discreet Demo Preview Link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="pt-1"
          >
            <button
              type="button"
              onClick={enterGuestWorkspace}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-300 transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-rose-400"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>¿Solo quieres mirar antes de registrarte? Entrar como invitado de prueba</span>
            </button>
          </motion.div>

          {/* Live Platform Trust Indicators */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-white/10">
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-display font-black text-white">{mediaList.length}+</div>
              <div className="text-[11px] text-slate-400">Obras Catalogadas</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-display font-black text-rose-400">5 Ejes</div>
              <div className="text-[11px] text-slate-400">Evaluación Técnica</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-display font-black text-amber-400">CineMatch</div>
              <div className="text-[11px] text-slate-400">IA Visual Multimodal</div>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-display font-black text-emerald-400">100%</div>
              <div className="text-[11px] text-slate-400">Bitácora Privada</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. VITRINA: QUÉ HAY ADENTRO DEL SISTEMA (BENTO SHOWCASE VISUAL)       */}
      {/* ===================================================================== */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">
        <section id="public-inside-preview" className="space-y-8 scroll-mt-24">
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-widest text-rose-400">
              Tu Espacio de Trabajo Privado
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight">
              Todo lo que Desbloqueas al Entrar
            </h2>
            <p className="text-sm text-slate-400">
              Al iniciar sesión entras a tu sala personal de ScreenLog, diseñada específicamente para registrar, analizar y descubrir cine sin distracciones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-gradient-to-b from-[#151519] to-[#0E0E11] border border-white/10 space-y-4">
              <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-display font-bold text-white">Bitácora & Estados Reales</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Clasifica tus películas y series en Pendientes, En Proceso o Terminadas. Registra en qué plataforma la viste y si la volverías a ver.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-gradient-to-b from-[#171324] to-[#0E0E11] border border-violet-500/25 space-y-4">
              <div className="w-11 h-11 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-display font-bold text-white">CineMatch AI por Fotos</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                ¿Te gustó la fotografía o atmósfera de una imagen? Sube cualquier foto adentro del sistema y recibe recomendaciones cinematográficas exactas.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-gradient-to-b from-[#191510] to-[#0E0E11] border border-amber-500/25 space-y-4">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-display font-bold text-white">Estadísticas de tu Gusto</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Visualiza gráficas interactivas con tus géneros favoritos, promedio de puntuación en guion, dirección, fotografía y banda sonora.
              </p>
            </div>
          </div>
        </section>

        {/* ===================================================================== */}
        {/* 4. MUESTRA LIMITADA DE CARTELERA (SOLO TRAILER Y FICHA DE LECTURA)    */}
        {/* ===================================================================== */}
        <section id="public-showcase-grid" className="space-y-6 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.07] pb-4">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" /> Muestra del Catálogo
              </span>
              <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
                Destacadas en Cartelera
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Haz clic en cualquier obra para ver su tráiler o sinopsis. Inicia sesión para añadir títulos a tu lista y votar.
              </p>
            </div>

            <button
              type="button"
              onClick={() => requestLogin('login')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 border border-rose-500/30 text-xs font-bold text-rose-300 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar al catálogo completo</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {previewItems.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedMediaId(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedMediaId(item.id);
                  }
                }}
                className="group cursor-pointer bg-[#111114] border border-white/10 hover:border-rose-500/50 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col"
              >
                <div className="relative aspect-[2/3] overflow-hidden bg-slate-950">
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111114] via-black/20 to-transparent" />
                  <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 border border-white/10 text-[10px] font-bold text-slate-200 flex items-center gap-1">
                    {item.type === 'pelicula' ? <Film className="w-2.5 h-2.5 text-rose-400" /> : <Tv className="w-2.5 h-2.5 text-amber-400" />}
                    <span className="capitalize">{item.type}</span>
                  </div>
                  {item.communityVotesCount > 0 && (
                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 border border-white/15 text-[10px] font-bold text-amber-400 flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-amber-400" />
                      {item.communityRating.toFixed(1)}
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label={`Ver tráiler de ${item.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      openTrailer(item.trailerYoutubeId);
                    }}
                    className="absolute bottom-2.5 left-2.5 p-2 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Ver Tráiler"
                  >
                    <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                  </button>
                </div>
                <div className="p-3.5 space-y-1 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-display text-sm font-bold text-white group-hover:text-rose-400 transition-colors line-clamp-1">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {item.year} · {item.genres[0]}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-rose-400 font-semibold">
                    <span>{item.defaultPlatform}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. CARACTERÍSTICAS DETALLADAS */}
        <FeaturesShowcase />

        {/* 6. TESTIMONIOS DE LA COMUNIDAD */}
        <UserTestimonialsSection />

        {/* 7. SOPORTE Y CONTACTO */}
        <ContactSection />
      </main>

      {/* ===================================================================== */}
      {/* 8. FOOTER EDITORIAL AMPLIO DE PORTADA PÚBLICA (DISTINTO AL INTERNO)   */}
      {/* ===================================================================== */}
      <footer className="border-t border-white/[0.08] bg-[#0B0B0F] text-slate-400 pt-14 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-white/5">
            <div className="md:col-span-5 space-y-4">
              <LogoLockup size={42} showTagline />
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
                Tu bitácora personal y comunidad cinematográfica. Organiza películas, series y anime con precisión profesional y descubre nuevas obras con IA.
              </p>
              <div className="inline-flex items-center gap-2 text-[11px] text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Plataforma activa · {mediaList.length} títulos disponibles</span>
              </div>
            </div>

            <div className="md:col-span-3 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-white">Explorar Portada</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button type="button" onClick={() => scrollToSection('public-inside-preview')} className="hover:text-white transition-colors">
                    La Experiencia por Dentro
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('public-showcase-grid')} className="hover:text-white transition-colors">
                    Cartelera Destacada
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('user-testimonials-section')} className="hover:text-white transition-colors">
                    Opiniones de Cinéfilos
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => scrollToSection('contact-section')} className="hover:text-white transition-colors">
                    Soporte y Contacto
                  </button>
                </li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-white">Acceso al Sistema</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                ¿Ya tienes una cuenta en ScreenLog Pro o deseas crear tu espacio privado hoy?
              </p>
              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => requestLogin('login')}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white border border-white/10 transition-colors"
                >
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => requestLogin('register')}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg shadow-rose-950/50 transition-colors"
                >
                  Crear Cuenta
                </button>
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <span>© {new Date().getFullYear()} ScreenLog Pro. Todos los derechos reservados.</span>
            <span>Portal Público Oficial • Acceso Verificado</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
