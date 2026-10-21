import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Plus, 
  Check, 
  Star, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Film, 
  Clock, 
  Award,
  Layers,
  Info,
  Tv,
  Flame,
  Trophy,
  TrendingUp,
  SlidersHorizontal
} from 'lucide-react';
import { MediaItem, WatchStatus } from '../types';
import { useMedia } from '../context/MediaContext';
import { RatingStars } from './RatingStars';

export type HeroApartado = 'todos' | 'pelicula' | 'serie' | 'anime' | 'top_rated' | 'tendencias';

interface HeroSliderProps {
  items: MediaItem[];
}

export const HeroSlider: React.FC<HeroSliderProps> = ({ items }) => {
  const { 
    setSelectedMediaId, 
    userReviews, 
    updateMediaStatus, 
    openTrailer 
  } = useMedia();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [apartado, setApartado] = useState<HeroApartado>('todos');
  const [isPaused, setIsPaused] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const filmstripRef = useRef<HTMLDivElement>(null);
  const activeThumbRef = useRef<HTMLButtonElement>(null);

  // Helper to detect OVAs
  const isOvaItem = (item: MediaItem) => {
    return (
      item.duration?.toLowerCase().includes('ova') ||
      item.title.toLowerCase().includes('ova') ||
      item.originalTitle?.toLowerCase().includes('ova') ||
      item.genres?.some(g => g.toLowerCase() === 'ova')
    );
  };

  // Helper for type badges
  const getItemBadge = (item: MediaItem) => {
    if (isOvaItem(item)) {
      return { 
        text: 'OVA', 
        bg: 'bg-purple-600/90 text-purple-100 border-purple-400/40 shadow-purple-900/40' 
      };
    }
    if (item.type === 'anime') {
      return { 
        text: 'ANIME', 
        bg: 'bg-pink-600/90 text-pink-100 border-pink-400/40 shadow-pink-900/40' 
      };
    }
    if (item.type === 'serie') {
      return { 
        text: 'SERIE', 
        bg: 'bg-emerald-600/90 text-emerald-100 border-emerald-400/40 shadow-emerald-900/40' 
      };
    }
    if (item.type === 'documental') {
      return { 
        text: 'DOC', 
        bg: 'bg-cyan-600/90 text-cyan-100 border-cyan-400/40 shadow-cyan-900/40' 
      };
    }
    return { 
      text: 'PELÍCULA', 
      bg: 'bg-rose-600/90 text-rose-100 border-rose-400/40 shadow-rose-900/40' 
    };
  };

  // Filter items by Apartado
  const displayList = useMemo(() => {
    if (!items || items.length === 0) return [];
    switch (apartado) {
      case 'pelicula':
        return items.filter((m) => m.type === 'pelicula');
      case 'serie':
        return items.filter((m) => m.type === 'serie');
      case 'anime':
        return items.filter((m) => 
          m.type === 'anime' || 
          m.genres?.some((g) => g.toLowerCase().includes('anime')) ||
          isOvaItem(m)
        );
      case 'top_rated':
        return [...items].sort((a, b) => {
          const ratingA = a.communityVotesCount > 0 ? a.communityRating : 0;
          const ratingB = b.communityVotesCount > 0 ? b.communityRating : 0;
          return ratingB - ratingA;
        });
      case 'tendencias':
        return items.filter((m) => m.isTrending || m.addedToListCount > 0);
      default:
        return items;
    }
  }, [items, apartado]);

  // Counts for each apartado badge
  const counts = useMemo(() => {
    return {
      todos: items.length,
      pelicula: items.filter((m) => m.type === 'pelicula').length,
      serie: items.filter((m) => m.type === 'serie').length,
      anime: items.filter((m) => m.type === 'anime' || isOvaItem(m) || m.genres?.some(g => g.toLowerCase().includes('anime'))).length,
      top_rated: items.filter((m) => m.isTopClassified || (m.communityRating && m.communityRating >= 4.5)).length,
      tendencias: items.filter((m) => m.isTrending).length,
    };
  }, [items]);

  // Ensure index is valid
  useEffect(() => {
    if (currentIndex >= displayList.length) {
      setCurrentIndex(0);
    }
  }, [displayList.length, currentIndex]);

  const activeMedia = displayList[currentIndex] || displayList[0] || items[0];
  const userReview = activeMedia ? userReviews[activeMedia.id] : undefined;
  const activeBadge = activeMedia ? getItemBadge(activeMedia) : { text: 'TÍTULO', bg: 'bg-rose-600 text-white border-rose-400/30' };

  // Auto slide every 7 seconds
  useEffect(() => {
    if (displayList.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayList.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [displayList.length, isPaused]);

  // Scroll active thumbnail smoothly into view
  useEffect(() => {
    if (activeThumbRef.current && filmstripRef.current) {
      activeThumbRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [currentIndex, apartado]);

  if (!activeMedia) return null;

  const handlePrev = () => {
    if (displayList.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + displayList.length) % displayList.length);
  };

  const handleNext = () => {
    if (displayList.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % displayList.length);
  };

  const handleSelectApartado = (newApartado: HeroApartado) => {
    setApartado(newApartado);
    setCurrentIndex(0);
  };

  const scrollFilmstrip = (direction: 'left' | 'right') => {
    if (filmstripRef.current) {
      const amount = direction === 'left' ? -360 : 360;
      filmstripRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const handleStatusSelect = (status: WatchStatus) => {
    updateMediaStatus(activeMedia.id, status);
    setShowStatusMenu(false);
  };

  return (
    <section 
      id="hero-cinematic-slider"
      className="relative w-full min-h-[600px] lg:min-h-[700px] overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0B] shadow-2xl my-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Dynamic Animated Backdrop with Cross-Fade and Ken Burns zoom */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeMedia.id}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 z-0 overflow-hidden"
        >
          {/* Animated Background Image */}
          <img
            src={activeMedia.backdropUrl || activeMedia.posterUrl}
            alt={activeMedia.title}
            className="w-full h-full object-cover object-center filter brightness-65 saturate-125 animate-ken-burns"
            referrerPolicy="no-referrer"
          />

          {/* Cinematic Vignette, Color Grading & Gradient Grids */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0B] via-[#0A0A0B]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0B] via-[#0A0A0B]/85 to-transparent w-full md:w-3/4" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-600/15 via-transparent to-transparent" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
        </motion.div>
      </AnimatePresence>

      {/* Hero Content Layer */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-10 lg:py-14 flex flex-col justify-between min-h-[600px] lg:min-h-[700px]">
        
        {/* Top Badges & Category */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white shadow-lg shadow-rose-900/30 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Destacado en Cartelera
            </span>
            <span className={`px-3 py-1 rounded-full backdrop-blur-md text-xs font-black uppercase tracking-wider border shadow-sm ${activeBadge.bg}`}>
              {activeBadge.text}
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-slate-200 text-xs font-medium border border-white/10">
              {activeMedia.defaultPlatform}
            </span>
            {activeMedia.duration && (
              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-slate-300 text-xs font-medium border border-white/10">
                <Clock className="w-3 h-3 text-slate-400" />
                {activeMedia.duration}
              </span>
            )}
          </div>

          {/* Quick Carousel Controls */}
          <div className="flex items-center gap-2">
            <button
              id="hero-prev-btn"
              onClick={handlePrev}
              className="p-2.5 rounded-full bg-white/10 hover:bg-rose-600 hover:text-white text-slate-200 border border-white/10 transition-all shadow-lg active:scale-95"
              aria-label="Anterior película"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-400 px-1 hidden sm:inline-block">
              {currentIndex + 1} / {displayList.length}
            </span>
            <button
              id="hero-next-btn"
              onClick={handleNext}
              className="p-2.5 rounded-full bg-white/10 hover:bg-rose-600 hover:text-white text-slate-200 border border-white/10 transition-all shadow-lg active:scale-95"
              aria-label="Siguiente película"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Central Info Details */}
        <div className="max-w-2xl mt-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeMedia.id}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="space-y-4"
            >
              {/* Title & Metadata */}
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight leading-tight drop-shadow-md">
                  {activeMedia.title}
                </h1>
                {activeMedia.originalTitle && activeMedia.originalTitle !== activeMedia.title && (
                  <p className="text-sm text-slate-400 mt-1 italic">
                    Original: {activeMedia.originalTitle}
                  </p>
                )}
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-sm text-slate-300">
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-xl border border-white/10">
                  {activeMedia.communityVotesCount > 0 ? (
                    <>
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="font-bold text-amber-400">{activeMedia.communityRating.toFixed(1)}</span>
                      <span className="text-xs text-slate-400">({activeMedia.communityVotesCount.toLocaleString()} votos)</span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">Nuevo en catálogo</span>
                  )}
                </div>

                <span className="font-semibold text-slate-200">{activeMedia.year}</span>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {activeMedia.duration || 'Duración variable'}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="text-slate-300 font-medium">Dir: {activeMedia.director}</span>
              </div>

              {/* Genre Pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {activeMedia.genres.map((genre) => (
                  <span
                    key={genre}
                    className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 font-medium"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              {/* Synopsis */}
              <p className="text-sm sm:text-base text-slate-300/90 line-clamp-3 leading-relaxed max-w-xl font-light">
                {activeMedia.synopsis}
              </p>

              {/* Call to Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                {/* Watch Trailer Button */}
                {activeMedia.trailerYoutubeId && (
                  <button
                    id="hero-play-trailer-btn"
                    onClick={() => openTrailer(activeMedia.trailerYoutubeId)}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-rose-600 text-black hover:text-white font-bold text-sm shadow-xl shadow-rose-900/20 active:scale-95 transition-all duration-300"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Ver Tráiler
                  </button>
                )}

                {/* Open Full Detail Modal */}
                <button
                  id="hero-view-details-btn"
                  onClick={() => setSelectedMediaId(activeMedia.id)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/10 shadow-lg active:scale-95 transition-all"
                >
                  <Info className="w-4 h-4 text-rose-400" />
                  Ver Ficha & Votaciones
                </button>

                {/* Add to My List Dropdown */}
                <div className="relative">
                  <button
                    id="hero-add-list-btn"
                    onClick={() => setShowStatusMenu(!showStatusMenu)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                      userReview
                        ? 'bg-rose-600/20 text-rose-300 border-rose-500/40'
                        : 'bg-white/10 hover:bg-white/15 text-slate-200 border-white/10'
                    }`}
                  >
                    {userReview ? (
                      <>
                        <Check className="w-4 h-4 text-rose-400" />
                        <span>
                          {userReview.status === 'terminada' ? 'Terminada' : userReview.status === 'en_proceso' ? 'En Proceso' : 'En Mi Lista'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Añadir a Mi Lista</span>
                      </>
                    )}
                  </button>

                  {/* Status popup menu */}
                  {showStatusMenu && (
                    <div className="absolute left-0 bottom-full mb-2 w-52 bg-[#161618] border border-white/10 rounded-2xl p-1.5 shadow-2xl z-30 animate-in fade-in zoom-in-95">
                      <div className="text-[11px] font-bold text-slate-400 uppercase px-2.5 py-1">
                        Estado en Mi Lista
                      </div>
                      <button
                        onClick={() => handleStatusSelect('pendiente')}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 flex items-center justify-between"
                      >
                        <span>📌 Pendiente</span>
                        {userReview?.status === 'pendiente' && <Check className="w-3.5 h-3.5 text-rose-400" />}
                      </button>
                      <button
                        onClick={() => handleStatusSelect('en_proceso')}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 flex items-center justify-between"
                      >
                        <span>⏳ En proceso</span>
                        {userReview?.status === 'en_proceso' && <Check className="w-3.5 h-3.5 text-rose-400" />}
                      </button>
                      <button
                        onClick={() => handleStatusSelect('terminada')}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 flex items-center justify-between"
                      >
                        <span>⭐ Terminada (Calificar)</span>
                        {userReview?.status === 'terminada' && <Check className="w-3.5 h-3.5 text-rose-400" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Filmstrip Thumbnails & Apartados Controls */}
        <div className="pt-6 border-t border-white/10 mt-6">
          <div className="flex flex-col gap-3.5 sm:gap-4 p-3.5 sm:p-4 rounded-2xl bg-[#161618]/90 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/60">
            
            {/* Filmstrip thumbnails (Child div:nth-of-type(1) - exact selector target) */}
            <div 
              ref={filmstripRef}
              className="flex items-center gap-3 overflow-x-auto py-2 px-1.5 max-w-full scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent scroll-smooth focus-visible:outline-none"
              tabIndex={0}
              aria-label="Carrusel de películas de todos los apartados"
            >
              {displayList.map((item, idx) => {
                const isActive = idx === currentIndex;
                const badge = getItemBadge(item);
                return (
                  <button
                    key={item.id}
                    ref={isActive ? activeThumbRef : null}
                    onClick={() => setCurrentIndex(idx)}
                    title={`${item.title} (${item.year}) - ${badge.text}`}
                    className={`group relative flex-shrink-0 rounded-xl overflow-hidden transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                      isActive
                        ? 'ring-2 ring-rose-500 scale-105 shadow-2xl shadow-rose-950/90 -translate-y-1 z-10'
                        : 'opacity-70 hover:opacity-100 hover:scale-102 hover:-translate-y-0.5 border border-white/10'
                    }`}
                  >
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-16 h-24 sm:w-20 sm:h-28 object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                    />

                    {/* Section / Format Badge */}
                    <div className="absolute top-1.5 left-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider border shadow-md ${badge.bg}`}>
                        {badge.text}
                      </span>
                    </div>

                    {/* Star Rating Badge */}
                    {item.communityRating > 0 && (
                      <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded bg-black/75 backdrop-blur-sm border border-white/10 text-[9px] font-bold text-amber-300">
                        <Star className="w-2.5 h-2.5 fill-amber-300" />
                        <span>{item.communityRating.toFixed(1)}</span>
                      </div>
                    )}

                    {/* Bottom Title Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent flex flex-col justify-end p-2">
                      <span className={`text-[11px] font-bold line-clamp-1 w-full text-left transition-colors ${
                        isActive ? 'text-rose-300' : 'text-slate-200 group-hover:text-white'
                      }`}>
                        {item.title}
                      </span>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                        <span>{item.year}</span>
                        {isActive && (
                          <span className="text-[9px] font-semibold text-rose-400 flex items-center gap-0.5">
                            ● Activo
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Apartados Selector & Filmstrip Controls (Child div:nth-of-type(2)) */}
            <div 
              id="hero-slider-apartados-controls"
              className="flex flex-col lg:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10"
            >
              {/* Apartados Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
                  Apartado:
                </span>

                <button
                  onClick={() => handleSelectApartado('todos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    apartado === 'todos'
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40 ring-1 ring-rose-400'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Todos</span>
                  <span className="text-[10px] opacity-75 font-mono">({counts.todos})</span>
                </button>

                <button
                  onClick={() => handleSelectApartado('pelicula')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    apartado === 'pelicula'
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40 ring-1 ring-rose-400'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  <Film className="w-3 h-3" />
                  <span>Películas</span>
                  <span className="text-[10px] opacity-75 font-mono">({counts.pelicula})</span>
                </button>

                <button
                  onClick={() => handleSelectApartado('serie')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    apartado === 'serie'
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40 ring-1 ring-rose-400'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  <Tv className="w-3 h-3" />
                  <span>Series</span>
                  <span className="text-[10px] opacity-75 font-mono">({counts.serie})</span>
                </button>

                <button
                  onClick={() => handleSelectApartado('anime')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    apartado === 'anime'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40 ring-1 ring-purple-400'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  <Flame className="w-3 h-3 text-pink-400" />
                  <span>Anime & OVAs</span>
                  <span className="text-[10px] opacity-75 font-mono">({counts.anime})</span>
                </button>

                <button
                  onClick={() => handleSelectApartado('top_rated')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    apartado === 'top_rated'
                      ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40 ring-1 ring-amber-400'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  <Trophy className="w-3 h-3 text-amber-300" />
                  <span>Más Clasificadas</span>
                </button>

                <button
                  onClick={() => handleSelectApartado('tendencias')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    apartado === 'tendencias'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 ring-1 ring-emerald-400'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  <TrendingUp className="w-3 h-3 text-emerald-300" />
                  <span>Tendencias</span>
                </button>
              </div>

              {/* Filmstrip scroll buttons & active count */}
              <div className="flex items-center gap-2 self-end lg:self-auto flex-shrink-0">
                <span className="text-[11px] font-mono text-slate-400 bg-black/50 px-2.5 py-1 rounded-lg border border-white/10">
                  <span className="text-rose-400 font-bold">{currentIndex + 1}</span> de <span className="text-white font-bold">{displayList.length}</span> títulos
                </span>

                <button
                  onClick={() => scrollFilmstrip('left')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-all active:scale-95"
                  title="Desplazar miniaturas hacia la izquierda"
                  aria-label="Desplazar miniaturas a la izquierda"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scrollFilmstrip('right')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-all active:scale-95"
                  title="Desplazar miniaturas hacia la derecha"
                  aria-label="Desplazar miniaturas a la derecha"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
