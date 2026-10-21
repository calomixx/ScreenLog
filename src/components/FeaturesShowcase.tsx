import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Sparkles, 
  Film, 
  Star, 
  CheckCircle2, 
  Tv, 
  SlidersHorizontal, 
  MessageSquare, 
  Play, 
  Bookmark, 
  Layers, 
  Trophy, 
  Share2, 
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  UserCheck,
  BarChart3,
  ListPlus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMedia } from '../context/MediaContext';

export const FeaturesShowcase: React.FC = () => {
  const { openAuthModal, setActiveTab, currentUser, setIsAddModalOpen } = useMedia();

  const offerings = [
    {
      icon: Film,
      title: 'Catálogo Cinemático Completo',
      desc: 'Películas de autor, estrenos de taquilla, series de culto y animes con información de directores, elenco, plataformas de streaming y años.',
      badge: 'Multiformato',
      accent: 'from-rose-500/20 to-rose-600/5 text-rose-400 border-rose-500/30'
    },
    {
      icon: Star,
      title: 'Clasificación y Reseñas Pro',
      desc: 'Sistema de 1 a 5 estrellas con medios puntos, etiquetas cualitativas ("Obra Maestra", "Excelente"), fecha de visionado y opción de rewatch.',
      badge: 'Criterio Crítico',
      accent: 'from-amber-500/20 to-amber-600/5 text-amber-400 border-amber-500/30'
    },
    {
      icon: SlidersHorizontal,
      title: 'Votación Técnica por Dimensiones',
      desc: 'Desglose evaluativo de 1 a 10 en Guión, Actuación, Banda Sonora, Efectos Visuales y Dirección para análisis cinematográfico profundo.',
      badge: 'Análisis Fílmico',
      accent: 'from-purple-500/20 to-purple-600/5 text-purple-400 border-purple-500/30'
    },
    {
      icon: Bookmark,
      title: 'Mi Lista & Cuaderno Personal',
      desc: 'Organiza tus obras en "Pendientes", "En Proceso" y "Terminadas". Visualiza tu progreso en cuadrícula, tabla detallada o notas.',
      badge: 'Seguimiento Total',
      accent: 'from-emerald-500/20 to-emerald-600/5 text-emerald-400 border-emerald-500/30'
    },
    {
      icon: MessageSquare,
      title: 'Comunidad Viva & Debates',
      desc: 'Lee críticas de otros espectadores, participa con comentarios directos, vota las opiniones más acertadas y descubre joyas ocultas.',
      badge: 'Social & Cinefilia',
      accent: 'from-blue-500/20 to-blue-600/5 text-blue-400 border-blue-500/30'
    },
    {
      icon: ListPlus,
      title: 'Añade Tus Propios Títulos',
      desc: 'Libertad total: sube cualquier película o serie con carátula personalizada, enlace de tráiler en YouTube y datos del creador.',
      badge: '100% Personalizable',
      accent: 'from-pink-500/20 to-pink-600/5 text-pink-400 border-pink-500/30'
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Explora o Registra',
      desc: 'Busca entre nuestros títulos destacados o añade cualquier producción de tu preferencia con un par de clics.'
    },
    {
      number: '02',
      title: 'Organiza en Tu Lista',
      desc: 'Marca tu estado de visionado: Pendiente, En proceso o Terminada para construir tu bitácora personal.'
    },
    {
      number: '03',
      title: 'Evalúa con Criterio',
      desc: 'Puntúa con estrellas, redacta tu crítica sincera y desglosa el guión, actuaciones y apartado técnico.'
    },
    {
      number: '04',
      title: 'Comparte e Inspírate',
      desc: 'Compara tus notas con el consenso de la comunidad cinéfila y exporta tus listas cuando lo desees.'
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [itemsPerView, setItemsPerView] = useState(1);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate items per view based on screen width
  useEffect(() => {
    const updateItemsPerView = () => {
      const width = window.innerWidth;
      if (width >= 1024) setItemsPerView(3); // lg: 3 items
      else if (width >= 768) setItemsPerView(2); // md: 2 items
      else setItemsPerView(1); // mobile: 1 item
    };
    updateItemsPerView();
    window.addEventListener('resize', updateItemsPerView);
    return () => window.removeEventListener('resize', updateItemsPerView);
  }, []);

  // Auto-play logic
  const startAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
    if (!autoPlay) return;
    autoPlayRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % offerings.length);
    }, 6000);
  }, [autoPlay]);

  const stopAutoPlay = useCallback(() => {
    if (autoPlayRef.current) clearTimeout(autoPlayRef.current);
  }, []);

  useEffect(() => {
    startAutoPlay();
    return stopAutoPlay;
  }, [currentIndex, autoPlay, startAutoPlay, stopAutoPlay]);

  // Pause auto-play on hover/focus/visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) stopAutoPlay();
      else startAutoPlay();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [startAutoPlay, stopAutoPlay]);

  const nextSlide = () => {
    stopAutoPlay();
    setCurrentIndex((prev) => (prev + 1) % offerings.length);
    if (autoPlay) startAutoPlay();
  };

  const prevSlide = () => {
    stopAutoPlay();
    setCurrentIndex((prev) => (prev - 1 + offerings.length) % offerings.length);
    if (autoPlay) startAutoPlay();
  };

  const goToSlide = (index: number) => {
    stopAutoPlay();
    setCurrentIndex(index);
    if (autoPlay) startAutoPlay();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide]);

  // Touch/swipe support
  const touchStartRef = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartRef.current === null) return;
    const diff = touchStartRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
    touchStartRef.current = null;
  };

  const maxIndex = offerings.length - 1;

  return (
    <div id="features-showcase-section" className="space-y-16 py-6">
      
      {/* SECTION 1: QUÉ OFRECEMOS */}
      <section id="features-section" className="space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-600/10 border border-rose-500/25 text-rose-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Nuestra Propuesta de Valor
          </div>
          <h2 className="text-2xl sm:text-4xl font-display font-black text-white tracking-tight leading-tight">
            ¿Qué Ofrecemos en ScreenLog?
          </h2>
          <p className="text-sm sm:text-base text-slate-400 font-light">
            Todo lo que un verdadero apasionado del cine y las series necesita para catalogar, calificar y debatir sus obras favoritas en un solo lugar.
          </p>
        </div>

        {/* Offerings Carousel */}
        <div 
          id="offerings-carousel"
          className="relative"
          onMouseEnter={() => setAutoPlay(false)}
          onMouseLeave={() => setAutoPlay(true)}
          onFocus={() => setAutoPlay(false)}
          onBlur={() => setAutoPlay(true)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className="overflow-hidden"
            role="region"
            aria-roledescription="carrusel"
            aria-label="Características de ScreenLog Pro"
          >
            <motion.div
              className="flex gap-6"
              style={{ 
                transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
                transition: 'transform 0.5s ease-out'
              }}
              animate={{ x: -currentIndex * (100 / itemsPerView) }}
              transition={{ type: 'spring', stiffness: 100, damping: 30 }}
            >
              {offerings.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.div
                    key={index}
                    id={`offering-slide-${index}`}
                    className="flex-shrink-0"
                    style={{ width: `${100 / itemsPerView}%`, paddingRight: '1.5rem' }}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    role="group"
                    aria-roledescription="diapositiva"
                    aria-label={`${item.title}, diapositiva ${index + 1} de ${offerings.length}`}
                    aria-current={index === currentIndex ? 'true' : 'false'}
                  >
                    <div className="group relative bg-[#161618] hover:bg-[#1c1c20] border border-white/10 hover:border-white/20 rounded-3xl p-6 sm:p-7 shadow-xl transition-all duration-300 flex flex-col justify-between h-full">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className={`p-3 rounded-2xl bg-gradient-to-br ${item.accent} border shadow-inner`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/5 text-slate-300 border border-white/10">
                            {item.badge}
                          </span>
                        </div>

                        <h3 className="text-lg font-display font-bold text-white group-hover:text-rose-400 transition-colors">
                          {item.title}
                        </h3>

                        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
                          {item.desc}
                        </p>
                      </div>

                      <div className="pt-5 mt-4 border-t border-white/5 flex items-center gap-2 text-xs font-semibold text-slate-400 group-hover:text-white transition-colors">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Disponible para todos los usuarios</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>

          {/* Navigation Arrows */}
          <div className="absolute inset-y-0 left-0 right-0 pointer-events-none flex items-center justify-between px-2 sm:px-4 -ml-2 -mr-2">
            <button
              onClick={prevSlide}
              disabled={false}
              aria-label="Diapositiva anterior"
              className="pointer-events-auto inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextSlide}
              disabled={false}
              aria-label="Diapositiva siguiente"
              className="pointer-events-auto inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Dots Indicators */}
          <div className="flex items-center justify-center gap-2 mt-6" role="tablist" aria-label="Indicadores de diapositivas">
            {offerings.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                role="tab"
                aria-selected={index === currentIndex}
                aria-label={`Ir a diapositiva ${index + 1}: ${offerings[index].title}`}
                aria-current={index === currentIndex ? 'true' : 'false'}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  index === currentIndex
                    ? 'bg-rose-400 w-8 shadow-md shadow-rose-500/30'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              />
            ))}
          </div>

          {/* Auto-play toggle */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoPlay}
                onChange={(e) => setAutoPlay(e.target.checked)}
                className="rounded accent-rose-600"
              />
              <span>Reproducción automática</span>
            </label>
          </div>
        </div>
      </section>

      {/* SECTION 2: CÓMO LO HACEMOS (Workflow / Step-by-Step) */}
      <section id="how-it-works-section" className="relative overflow-hidden rounded-3xl bg-[#111113] border border-white/10 p-8 sm:p-12 shadow-2xl">
        <div className="relative z-10 space-y-10">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Flujo Simple y Potente
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-black text-white tracking-tight">
                ¿Cómo lo Hacemos?
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Así es como transformas tu experiencia de ver películas en una bitácora cinéfila organizada:
              </p>
            </div>

            <div className="flex items-center gap-3">
              {!currentUser ? (
                <button
                  onClick={() => openAuthModal('register')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/30 active:scale-95 transition-all"
                >
                  <UserCheck className="w-4 h-4" />
                  Crear Cuenta Gratis
                </button>
              ) : (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/30 active:scale-95 transition-all"
                >
                  <ListPlus className="w-4 h-4" />
                  Añadir Mi Primera Película
                </button>
              )}
            </div>
          </div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((st, i) => (
              <div 
                key={st.number}
                className="relative p-6 rounded-2xl bg-[#161618] border border-white/10 hover:border-rose-500/40 transition-colors space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-400">
                    {st.number}
                  </span>
                  <span className="w-2 h-2 rounded-full bg-rose-500/60" />
                </div>
                <h4 className="text-base font-bold text-white">
                  {st.title}
                </h4>
                <p className="text-xs text-slate-400 font-light leading-relaxed">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Live Platform Stats Counter */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/5">
            <div className="text-center p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="block text-xl sm:text-2xl font-display font-black text-rose-400">+100%</span>
              <span className="text-[11px] text-slate-400">Sin publicidad invasiva</span>
            </div>
            <div className="text-center p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="block text-xl sm:text-2xl font-display font-black text-amber-400">1 - 5 ⭐</span>
              <span className="text-[11px] text-slate-400">Escala de estrellas con medias</span>
            </div>
            <div className="text-center p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="block text-xl sm:text-2xl font-display font-black text-purple-400">5 Ejes</span>
              <span className="text-[11px] text-slate-400">Métricas técnicas de análisis</span>
            </div>
            <div className="text-center p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="block text-xl sm:text-2xl font-display font-black text-emerald-400">100% Libre</span>
              <span className="text-[11px] text-slate-400">Acceso a todas las funciones</span>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
};