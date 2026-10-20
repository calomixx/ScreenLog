import React, { useState, useEffect } from 'react';
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
  Info
} from 'lucide-react';
import { MediaItem, WatchStatus } from '../types';
import { useMedia } from '../context/MediaContext';
import { RatingStars } from './RatingStars';

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
  const [isPaused, setIsPaused] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const activeMedia = items[currentIndex] || items[0];
  const userReview = activeMedia ? userReviews[activeMedia.id] : undefined;

  // Auto slide every 6 seconds
  useEffect(() => {
    if (items.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 6500);
    return () => clearInterval(interval);
  }, [items.length, isPaused]);

  if (!activeMedia) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const handleStatusSelect = (status: WatchStatus) => {
    updateMediaStatus(activeMedia.id, status);
    setShowStatusMenu(false);
  };

  return (
    <section 
      id="hero-cinematic-slider"
      className="relative w-full min-h-[580px] lg:min-h-[660px] overflow-hidden rounded-3xl border border-white/10 bg-[#0A0A0B] shadow-2xl my-4"
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
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-12 lg:py-16 flex flex-col justify-between min-h-[580px] lg:min-h-[660px]">
        
        {/* Top Badges & Category */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-600 text-white shadow-lg shadow-rose-900/30 text-xs font-bold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Título Destacado
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-slate-200 text-xs font-semibold uppercase tracking-wider border border-white/10">
              {activeMedia.type}
            </span>
            <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-slate-200 text-xs font-medium border border-white/10">
              {activeMedia.defaultPlatform}
            </span>
          </div>

          {/* Quick Carousel Controls */}
          <div className="flex items-center gap-2">
            <button
              id="hero-prev-btn"
              onClick={handlePrev}
              className="p-2.5 rounded-full bg-white/10 hover:bg-rose-600 hover:text-white text-slate-200 border border-white/10 transition-all shadow-lg active:scale-95"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              id="hero-next-btn"
              onClick={handleNext}
              className="p-2.5 rounded-full bg-white/10 hover:bg-rose-600 hover:text-white text-slate-200 border border-white/10 transition-all shadow-lg active:scale-95"
              aria-label="Siguiente"
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
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight leading-none drop-shadow-md">
                  {activeMedia.title}
                </h1>
                {activeMedia.originalTitle && activeMedia.originalTitle !== activeMedia.title && (
                  <p className="text-sm text-slate-400 mt-1 italic">
                    Original: {activeMedia.originalTitle}
                  </p>
                )}
              </div>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-xl border border-white/10">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-bold text-amber-400">{activeMedia.communityRating.toFixed(1)}</span>
                  <span className="text-xs text-slate-400">({activeMedia.communityVotesCount.toLocaleString()} votos)</span>
                </div>

                <span className="font-medium text-slate-300">{activeMedia.year}</span>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {activeMedia.duration}
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

        {/* Bottom Filmstrip Thumbnails & Progress bar */}
        <div className="pt-6 border-t border-white/10 mt-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-3.5 sm:p-4 rounded-2xl bg-[#161618]/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/60">
            
            {/* Filmstrip thumbnails with generous padding so active scale-105 pops out smoothly */}
            <div className="flex items-center gap-3 overflow-x-auto py-2 px-1.5 max-w-full scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {items.slice(0, 5).map((item, idx) => {
                const isActive = idx === currentIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`group relative flex-shrink-0 rounded-xl overflow-hidden transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                      isActive
                        ? 'ring-2 ring-rose-500 scale-105 shadow-xl shadow-rose-950/80 -translate-y-1 z-10'
                        : 'opacity-60 hover:opacity-100 hover:scale-102 hover:-translate-y-0.5 border border-white/10'
                    }`}
                  >
                    <img
                      src={item.posterUrl}
                      alt={item.title}
                      className="w-14 h-20 sm:w-16 sm:h-24 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex items-end p-1.5">
                      <span className={`text-[10px] font-bold truncate w-full text-left transition-colors ${
                        isActive ? 'text-rose-300' : 'text-slate-300 group-hover:text-white'
                      }`}>
                        {item.title}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Slide Dot Indicators (visible on all screens, showing active element & count) */}
            <div 
              id="hero-slider-dots-container"
              className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/70 backdrop-blur-md border border-white/15 shadow-xl"
              role="tablist"
              aria-label="Indicadores de películas destacadas"
            >
              {/* Numeric indicator: current / total */}
              <span className="text-[11px] font-mono font-bold text-slate-300 pr-1 select-none flex items-center gap-0.5">
                <span className="text-rose-400">{currentIndex + 1}</span>
                <span className="text-slate-600">/</span>
                <span className="text-slate-400">{items.length}</span>
              </span>

              {/* Dot Indicators */}
              <div className="flex items-center gap-1.5">
                {items.map((item, i) => {
                  const isActive = i === currentIndex;
                  return (
                    <button
                      key={item.id || i}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      aria-label={`Diapositiva ${i + 1} de ${items.length}: ${item.title}`}
                      title={`${i + 1}. ${item.title}`}
                      onClick={() => setCurrentIndex(i)}
                      className={`relative rounded-full transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0A0A0B] ${
                        isActive
                          ? 'w-7 h-2.5 bg-gradient-to-r from-rose-500 via-rose-400 to-amber-400 shadow-md shadow-rose-500/50 scale-105'
                          : 'w-2.5 h-2.5 bg-white/25 hover:bg-white/60 hover:scale-125'
                      }`}
                    >
                      <span className="sr-only">
                        {item.title} {isActive ? '(Activo)' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
