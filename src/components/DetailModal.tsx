import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Star, 
  Play, 
  Calendar, 
  User, 
  Tv, 
  Clock, 
  Bookmark, 
  Check, 
  MessageSquare, 
  ThumbsUp, 
  Send, 
  Sliders, 
  Share2, 
  Edit3, 
  Sparkles,
  RotateCcw,
  Film,
  Award,
  Layers,
  Heart
} from 'lucide-react';
import { MediaItem, UserReview, WatchStatus, RewatchChoice, EvaluationTag } from '../types';
import { useMedia } from '../context/MediaContext';
import { RatingStars } from './RatingStars';
import { WatchProvidersTab } from './WatchProvidersTab';

const PLATFORM_OPTIONS = [
  'Netflix',
  'Max (HBO)',
  'Prime Video',
  'Disney+',
  'Apple TV+',
  'Star+',
  'Paramount+',
  'Crunchyroll',
  'Cine / Sala de Cine',
  'Blu-ray / Físico',
  'YouTube / Alquiler',
  'Otra'
];

const EVALUATION_PRESETS: EvaluationTag[] = [
  'Obra Maestra (10/10)',
  'Excelente (9/10)',
  'Muy Buena (8/10)',
  'Buena (7/10)',
  'Entretenida (6/10)',
  'Pasable / Regular (5/10)',
  'Mediocre (4/10)',
  'Mala (2-3/10)',
  'Pérdida de tiempo (1/10)'
];

const REWATCH_OPTIONS: { value: RewatchChoice; label: string; icon: string }[] = [
  { value: 'si_totalmente', label: '¡Sí, totalmente!', icon: '🤩' },
  { value: 'quizas', label: 'Quizás en el futuro', icon: '🤔' },
  { value: 'no_suficiente', label: 'No, una vez fue suficiente', icon: '👌' },
  { value: 'jamas', label: 'Jamás', icon: '🙅‍♂️' }
];

const STATUS_OPTIONS: {
  id: WatchStatus;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
  activeBorder: string;
  hoverColor: string;
}[] = [
  {
    id: 'pendiente',
    label: 'Pendiente',
    icon: Bookmark,
    activeClass: 'bg-sky-500 text-slate-950 shadow-md shadow-sky-500/25 font-bold',
    activeBorder: 'border-sky-400',
    hoverColor: 'hover:text-sky-300 hover:border-sky-500/40 hover:bg-sky-500/10'
  },
  {
    id: 'en_proceso',
    label: 'En proceso',
    icon: Clock,
    activeClass: 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 font-bold',
    activeBorder: 'border-amber-400',
    hoverColor: 'hover:text-amber-300 hover:border-amber-500/40 hover:bg-amber-500/10'
  },
  {
    id: 'terminada',
    label: 'Terminada',
    icon: Check,
    activeClass: 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/25 font-bold',
    activeBorder: 'border-emerald-400',
    hoverColor: 'hover:text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/10'
  }
];

export const DetailModal: React.FC = () => {
  const { 
    selectedMedia, 
    setSelectedMediaId, 
    userReviews, 
    updateUserReview, 
    updateMediaStatus, 
    removeFromMyList,
    addCommunityComment, 
    toggleCommentLike, 
    submitDetailedVote,
    openTrailer,
    currentUser,
    openEditMediaModal 
  } = useMedia();

  const [activeTab, setActiveTab] = useState<'info' | 'resena' | 'votaciones' | 'comentarios' | 'donde_ver'>('info');
  const [commentText, setCommentText] = useState('');
  const [commentRating, setCommentRating] = useState(5);
  const [copiedLink, setCopiedLink] = useState(false);

  // Tab scroll position preservation & body scroll-lock
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const tabScrollsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (selectedMedia) {
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      // Reset scroll for the new media modal
      tabScrollsRef.current = {};
      if (contentContainerRef.current) {
        contentContainerRef.current.scrollTop = 0;
      }

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [selectedMedia?.id]);

  const handleTabChange = (newTab: 'info' | 'resena' | 'votaciones' | 'comentarios' | 'donde_ver') => {
    if (contentContainerRef.current) {
      tabScrollsRef.current[activeTab] = contentContainerRef.current.scrollTop;
    }
    setActiveTab(newTab);
    // Restore saved scroll position without animations or page jumping
    setTimeout(() => {
      if (contentContainerRef.current) {
        const targetScroll = tabScrollsRef.current[newTab] || 0;
        contentContainerRef.current.scrollTop = targetScroll;
      }
    });
  };

  // Community detailed vote state
  const [userDetailedVote, setUserDetailedVote] = useState({
    script: 9,
    acting: 9,
    soundtrack: 9,
    visuals: 9,
    direction: 9
  });
  const [hasVotedDetailed, setHasVotedDetailed] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Smooth scroll handler with hysteresis to prevent jump/flicker
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const top = target.scrollTop;
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      if (top > 40 && !isScrolled) {
        setIsScrolled(true);
      } else if (top < 10 && isScrolled) {
        setIsScrolled(false);
      }
    scrollTimeoutRef.current = null; });
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedMediaId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSelectedMediaId]);

  // Personal Review Form State
  const currentReview = selectedMedia ? userReviews[selectedMedia.id] : undefined;
  const [isCustomPlatform, setIsCustomPlatform] = useState(false);
  const [customPlatformValue, setCustomPlatformValue] = useState('');

  const [reviewForm, setReviewForm] = useState<UserReview>({
    mediaId: '',
    status: 'pendiente',
    stars: 4.5,
    year: new Date().getFullYear(),
    genres: [],
    evaluation: 'Excelente (9/10)',
    critique: '',
    director: '',
    watchedDate: new Date().toISOString().split('T')[0],
    platform: 'Netflix',
    wouldRewatch: 'si_totalmente',
    favoriteMoment: '',
    updatedAt: new Date().toISOString()
  });

  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Synchronize reviewForm when a new media is selected (ONLY on selectedMedia?.id change)
  useEffect(() => {
    if (selectedMedia) {
      const existing = userReviews[selectedMedia.id];
      const initialPlatform = existing?.platform || selectedMedia.defaultPlatform || 'Netflix';
      const isPredefined = PLATFORM_OPTIONS.slice(0, -1).includes(initialPlatform);

      if (!isPredefined && initialPlatform) {
        setIsCustomPlatform(true);
        setCustomPlatformValue(initialPlatform === 'Otra' ? '' : initialPlatform);
      } else {
        setIsCustomPlatform(false);
        setCustomPlatformValue('');
      }

      if (existing) {
        setReviewForm({
          ...existing,
          genres: existing.genres || selectedMedia.genres || [],
          year: existing.year || selectedMedia.year || new Date().getFullYear(),
          director: existing.director || selectedMedia.director || '',
          platform: existing.platform || selectedMedia.defaultPlatform || 'Netflix'
        });
      } else {
        setReviewForm({
          mediaId: selectedMedia.id,
          status: 'pendiente',
          stars: 4.5,
          year: selectedMedia.year || new Date().getFullYear(),
          genres: selectedMedia.genres || [],
          evaluation: 'Excelente (9/10)',
          critique: '',
          director: selectedMedia.director || '',
          watchedDate: new Date().toISOString().split('T')[0],
          platform: selectedMedia.defaultPlatform || 'Netflix',
          wouldRewatch: 'si_totalmente',
          favoriteMoment: '',
          updatedAt: new Date().toISOString()
        });
      }
      setActiveTab('info');
      setHasVotedDetailed(false);
      setIsScrolled(false);
      if (contentContainerRef.current) {
        contentContainerRef.current.scrollTop = 0;
      }
    }
  }, [selectedMedia?.id]);

  if (!selectedMedia) return null;

  const handleStatusClick = (status: WatchStatus) => {
    if (currentReview?.status === status) {
      removeFromMyList(selectedMedia.id);
      setReviewForm((prev) => ({ ...prev, status: 'pendiente' }));
      return;
    }
    updateMediaStatus(selectedMedia.id, status);
    setReviewForm((prev) => ({ ...prev, status }));
    if (status === 'terminada') {
      setActiveTab('resena');
    }
  };

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPlatform = isCustomPlatform && customPlatformValue.trim()
      ? customPlatformValue.trim()
      : (reviewForm.platform || 'Otra');

    updateUserReview({
      ...reviewForm,
      platform: finalPlatform,
      mediaId: selectedMedia.id
    });
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      addCommunityComment(selectedMedia.id, commentText, commentRating);
      setCommentText('');
      setCommentRating(5);
    }
  };

  const handleSendDetailedVote = () => {
    submitDetailedVote(selectedMedia.id, userDetailedVote);
    setHasVotedDetailed(true);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/90  flex items-start sm:items-center justify-center p-1.5 sm:p-4 md:p-6 ">
      <div 
        id="detail-modal-container"
        className="relative w-full max-w-4xl bg-[#141416] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/90  text-slate-100 flex flex-col h-[92vh] sm:h-[88vh] md:h-[90vh]"
      >
        {/* Modal Header with Backdrop Image - Contracts smoothly on scroll */}
        <div 
          className={`relative w-full overflow-hidden flex-shrink-0 bg-[#0A0A0B] transition-none ease-in-out ${
            isScrolled ? 'h-28 sm:h-32' : 'h-48 sm:h-56 md:h-60'
          }`}
        >
          <img
            src={selectedMedia.backdropUrl || selectedMedia.posterUrl}
            alt={selectedMedia.title}
            className={`w-full h-full object-cover filter transition-none ease-out ${
              isScrolled ? 'brightness-40' : 'brightness-60'
            }`}
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141416] via-[#141416]/75 to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0B]/95 via-[#141416]/50 to-transparent pointer-events-none" />

          {/* Close & Share Buttons */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2 z-20">
            <button
              onClick={handleShare}
              className="p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-white/10 text-slate-200 border border-white/10  transition-colors"
              title="Copiar enlace"
            >
              <Share2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            {copiedLink && (
              <span className="absolute top-10 sm:top-12 right-0 bg-rose-600 text-white text-xs font-bold px-2 py-1 rounded shadow">
                ¡Copiado!
              </span>
            )}
            <button
              id="detail-modal-close-btn"
              onClick={() => setSelectedMediaId(null)}
              className="p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-rose-600 hover:text-white text-slate-200 border border-white/10  transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          {/* Banner Details (Poster + Title + Basic Info) */}
          <div className={`absolute left-4 right-4 sm:left-6 sm:right-6 flex items-end gap-3.5 sm:gap-5 z-10 transition-none ${
            isScrolled ? 'bottom-3 sm:bottom-3.5' : 'bottom-4 sm:bottom-5'
          }`}>
            <img
              src={selectedMedia.posterUrl}
              alt={selectedMedia.title}
              className={`aspect-[2/3] object-cover rounded-xl border-2 border-white/20 shadow-2xl flex-shrink-0 bg-black/50 transition-none ease-out hover:scale-105 hover:shadow-2xl hover:shadow-rose-950/80 hover:border-rose-500/50 cursor-pointer ${
                isScrolled ? 'w-12 sm:w-16' : 'w-20 sm:w-28 md:w-32'
              }`}
              referrerPolicy="no-referrer"
            />
            <div className="flex-1 min-w-0 pb-0.5">
              {!isScrolled && (
                <div className="flex flex-wrap items-center gap-2 mb-1.5 overflow-hidden transition-none">
                  <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow-sm">
                    {selectedMedia.type}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-300 text-xs font-medium border border-white/10">
                    {selectedMedia.defaultPlatform}
                  </span>
                  <span className="text-xs text-slate-300 font-semibold">{selectedMedia.year}</span>
                  {selectedMedia.duration && (
                    <span className="text-xs text-slate-400">• {selectedMedia.duration}</span>
                  )}
                </div>
              )}

              <h2 className={`font-display font-extrabold text-white truncate transition-none leading-tight ${
                isScrolled ? 'text-base sm:text-lg' : 'text-xl sm:text-2xl md:text-3xl'
              }`}>
                {selectedMedia.title}
              </h2>

              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-300 flex-wrap">
                <span className="whitespace-nowrap overflow-hidden">
                  Dir: <strong className="text-white">{selectedMedia.director}</strong>
                </span>
                {selectedMedia.communityVotesCount > 0 ? (
                  <div className="flex items-center gap-1 text-amber-400 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{selectedMedia.communityRating.toFixed(1)}</span>
                    {!isScrolled && (
                      <span className="text-slate-400 text-[11px] overflow-hidden whitespace-nowrap hidden sm:inline">
                        ({selectedMedia.communityVotesCount.toLocaleString()} votos)
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-slate-400 text-[11px] font-medium">Sin valoraciones</span>
                )}
              </div>

              {!isScrolled && (
                /* Status Action Selector integrated into movie header */
                <div 
                  id="detail-modal-status-selector"
                  className="mt-3 flex items-center gap-1.5 group/status transition-none"
                >
                  <span className="text-xs font-semibold text-slate-300 mr-1 hidden sm:inline select-none drop-shadow">
                    Tu estado:
                  </span>
                  {STATUS_OPTIONS.map((item) => {
                    const isSelected = currentReview?.status === item.id;
                    const hasSelected = Boolean(currentReview?.status);
                    const isShrunk = hasSelected && !isSelected;
                    const Icon = item.icon;
                    const displayLabel = isSelected && item.id === 'terminada' ? 'Terminada' : item.label;

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleStatusClick(item.id)}
                        title={
                          isSelected 
                            ? `${item.label} (activo • clic para desmarcar)` 
                            : `Marcar como ${item.label}`
                        }
                        className={`relative text-xs font-semibold rounded-lg flex items-center justify-center transition-none ease-out  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 ${
                          isSelected
                            ? `${item.activeClass} px-3 py-1.5 scale-100 z-10 border ${item.activeBorder}`
                            : isShrunk
                              ? `h-7 sm:h-8 px-2 py-1.5 text-slate-300 bg-black/60 border border-white/10 ${item.hoverColor} hover:px-3 hover:bg-black/80`
                              : `px-3 py-1.5 text-slate-200 bg-black/60 border border-white/15 ${item.hoverColor} hover:bg-black/80`
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${isSelected ? 'scale-110' : ''}`} />
                        <span
                          className={`whitespace-nowrap overflow-hidden transition-none ease-out ${
                            isSelected
                              ? 'max-w-[140px] opacity-100 ml-1.5'
                            : isShrunk
                              ? 'max-w-0 opacity-0 hover:max-w-[120px] hover:opacity-100 hover:ml-1.5'
                              : 'max-w-[120px] opacity-100 ml-1.5'
                          }`}
                        >
                          {displayLabel}
                        </span>
                        {isSelected && (
                          <span 
                            className="ml-1.5 text-[10px] opacity-70 hover:opacity-100 hover:text-black font-bold hidden sm:inline"
                            title="Desmarcar"
                          >
                            ×
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Dedicated Modal Navigation Tabs Menu - 100% visible, clean, unobstructed */}
        <div 
          id="detail-modal-tabs-menu"
          className="border-b border-white/10 bg-[#0E0E10] px-4 sm:px-6 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar select-none"
        >
          <button
            onClick={() => setActiveTab('info')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'info' 
                ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40 font-bold shadow-sm shadow-rose-950/40' 
                : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Film className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>Sinopsis</span>
          </button>

          <button
            onClick={() => setActiveTab('resena')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'resena' 
                ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40 font-bold shadow-sm shadow-rose-950/40' 
                : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Edit3 className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Mi Reseña</span>
            {currentReview?.status === 'terminada' && (
              <span className="text-amber-400 text-xs">⭐</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('votaciones')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'votaciones' 
                ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40 font-bold shadow-sm shadow-rose-950/40' 
                : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Sliders className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span>Votación Detallada</span>
          </button>

          <button
            id="watch-tab-btn"
            onClick={() => setActiveTab('donde_ver')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'donde_ver' 
                ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40 font-bold shadow-sm shadow-rose-950/40' 
                : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Tv className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Dónde Ver</span>
            {selectedMedia.watchProviders && selectedMedia.watchProviders.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('comentarios')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'comentarios' 
                ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40 font-bold shadow-sm shadow-rose-950/40' 
                : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <span>Comentarios</span>
            <span className="px-1.5 py-0.5 rounded-full text-[11px] bg-white/10 text-slate-300 font-bold">
              {selectedMedia.comments.length}
            </span>
          </button>
        </div>

        {/* Tab Body Content Area (Selector 2) */}
        <div 
          id="detail-modal-body-content"
          className="p-5 sm:p-7 overflow-y-auto flex-1 bg-[#141416] relative text-slate-100"
          onScroll={handleScroll}
        >
          
          {/* TAB 1: SINOPSIS & FICHA TÉCNICA */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* Trailer button */}
              {selectedMedia.trailerYoutubeId && (
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-rose-600/20 via-white/5 to-[#161618] border border-rose-500/30">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-rose-600 text-white font-bold">
                      <Play className="w-5 h-5 fill-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Ver Tráiler Oficial</h4>
                      <p className="text-xs text-slate-400">Reproduce el adelanto en alta definición</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openTrailer(selectedMedia.trailerYoutubeId)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-900/30 transition-colors"
                  >
                    Reproducir
                  </button>
                </div>
              )}

              {/* Synopsis */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Sinopsis
                </h4>
                <p className="text-sm sm:text-base text-slate-200 leading-relaxed font-light">
                  {selectedMedia.synopsis}
                </p>
              </div>

              {/* Genres */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Géneros
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMedia.genres.map((g) => (
                    <span
                      key={g}
                      className="px-3 py-1 rounded-lg bg-white/5 text-xs font-medium text-slate-200 border border-white/10"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>

              {/* Technical Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#0A0A0B] p-4 rounded-2xl border border-white/10">
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Director</span>
                  <p className="text-sm font-semibold text-white mt-0.5">{selectedMedia.director}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Año de Estreno</span>
                  <p className="text-sm font-semibold text-white mt-0.5">{selectedMedia.year}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Plataforma</span>
                  <p className="text-sm font-semibold text-white mt-0.5">{selectedMedia.defaultPlatform}</p>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">En listas</span>
                  <p className="text-sm font-semibold text-rose-400 mt-0.5">{selectedMedia.addedToListCount.toLocaleString()} cinéfilos</p>
                </div>
              </div>

              {/* Cast */}
              {selectedMedia.cast && selectedMedia.cast.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Reparto Principal
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMedia.cast.map((actor) => (
                      <span
                        key={actor}
                        className="px-3 py-1 rounded-full bg-white/5 text-xs text-slate-300 border border-white/10"
                      >
                        {actor}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MI RESEÑA PERSONAL (All requested fields) */}
          {activeTab === 'resena' && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-600/10 via-[#161618] to-[#161618] border border-rose-500/20 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <p className="font-bold text-white mb-0.5">Ficha de Evaluación y Clasificación Personal</p>
                  <p className="text-slate-400">
                    Registra tu crítica, calificación con estrellas, plataforma, fecha y si la volverías a ver cuando completes este título.
                  </p>
                </div>
              </div>

              {saveSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  ¡Tu reseña y clasificación se han guardado con éxito en Mi Lista!
                </div>
              )}

              <form onSubmit={handleSaveReview} className="space-y-5">
                
                {/* State selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Estado en tu lista
                    </label>
                    <select
                      value={reviewForm.status}
                      onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value as WatchStatus })}
                      className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                    >
                      <option value="pendiente">📌 Pendiente</option>
                      <option value="en_proceso">⏳ En proceso</option>
                      <option value="terminada">⭐ Terminada</option>
                    </select>
                  </div>

                  {/* Rating Stars */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Calificación (Estrellas 1 - 5)
                    </label>
                    <div className="flex items-center gap-3 bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2">
                      <RatingStars
                        rating={reviewForm.stars}
                        interactive={true}
                        size="lg"
                        precision={0.5}
                        onChange={(stars) => setReviewForm({ ...reviewForm, stars })}
                      />
                    </div>
                  </div>
                </div>

                {/* Evaluación Tag Preset */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Evaluación General
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {EVALUATION_PRESETS.map((evalPreset) => (
                      <button
                        type="button"
                        key={evalPreset}
                        onClick={() => setReviewForm({ ...reviewForm, evaluation: evalPreset })}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                          reviewForm.evaluation === evalPreset
                            ? 'bg-rose-600/20 text-rose-300 border-rose-500/50 font-bold'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {evalPreset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Crítica / Opinión */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Crítica / Opinión Personal
                  </label>
                  <textarea
                    rows={4}
                    value={reviewForm.critique}
                    onChange={(e) => setReviewForm({ ...reviewForm, critique: e.target.value })}
                    placeholder="Escribe tu análisis, qué te pareció el guión, actuaciones, fotografía o sensaciones que te dejó..."
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500/30 leading-relaxed"
                  />
                </div>

                {/* Submit user breakdown vote (Moved from Votaciones to Reseña) */}
                <div className="p-5 rounded-2xl bg-[#0A0A0B] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase">
                      Desglose Técnico y Calificación Detallada
                    </h4>
                    {hasVotedDetailed && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> ¡Voto registrado!
                        </span>
                        <button 
                          type="button"
                          onClick={() => setHasVotedDetailed(false)}
                          className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline"
                        >
                          Editar
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                      { key: 'script', label: 'Guión (1-10)' },
                      { key: 'acting', label: 'Actuaciones (1-10)' },
                      { key: 'soundtrack', label: 'Banda Sonora (1-10)' },
                      { key: 'visuals', label: 'Visuales (1-10)' },
                      { key: 'direction', label: 'Dirección (1-10)' }
                    ].map((field) => (
                      <div key={field.key} className="flex items-center justify-between gap-2">
                        <span className="text-slate-300">{field.label}</span>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          step="0.5"
                          disabled={hasVotedDetailed}
                          value={userDetailedVote[field.key as keyof typeof userDetailedVote]}
                          onChange={(e) =>
                            setUserDetailedVote({
                              ...userDetailedVote,
                              [field.key]: parseFloat(e.target.value)
                            })
                          }
                          className="w-32 accent-rose-500"
                        />
                        <span className="w-6 text-right font-bold text-rose-400">
                          {userDetailedVote[field.key as keyof typeof userDetailedVote]}
                        </span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={hasVotedDetailed}
                    onClick={handleSendDetailedVote}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                      hasVotedDetailed
                        ? 'bg-white/10 text-slate-500 cursor-not-allowed'
                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-900/30'
                    }`}
                  >
                    {hasVotedDetailed ? 'Voto Detallado Enviado' : 'Enviar Calificación Detallada'}
                  </button>
                </div>

                {/* Metadata Row: Año, Director, Fecha en que la vi */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Año
                    </label>
                    <input
                      type="number"
                      value={reviewForm.year}
                      onChange={(e) => setReviewForm({ ...reviewForm, year: parseInt(e.target.value) || 2024 })}
                      className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Director
                    </label>
                    <input
                      type="text"
                      value={reviewForm.director}
                      onChange={(e) => setReviewForm({ ...reviewForm, director: e.target.value })}
                      className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      Fecha en que la vi
                    </label>
                    <input
                      type="date"
                      value={reviewForm.watchedDate}
                      onChange={(e) => setReviewForm({ ...reviewForm, watchedDate: e.target.value })}
                      className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Dónde la vi (Plataforma) & ¿La volvería a ver? */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 flex items-center justify-between">
                      <span>Dónde la vi (Plataforma)</span>
                      {isCustomPlatform && (
                        <span className="text-[10px] text-rose-400 font-semibold lowercase">Sitio personalizado</span>
                      )}
                    </label>
                    <select
                      value={isCustomPlatform ? 'Otra' : reviewForm.platform}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Otra') {
                          setIsCustomPlatform(true);
                          setReviewForm((prev) => ({ 
                            ...prev, 
                            platform: customPlatformValue.trim() || 'Otra' 
                          }));
                        } else {
                          setIsCustomPlatform(false);
                          setReviewForm((prev) => ({ ...prev, platform: val }));
                        }
                      }}
                      className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none transition-colors"
                    >
                      {PLATFORM_OPTIONS.map((plat) => (
                        <option key={plat} value={plat}>
                          {plat}
                        </option>
                      ))}
                    </select>

                    {/* Casilla para especificar el sitio cuando la respuesta es "Otra" */}
                    {isCustomPlatform && (
                      <div className="mt-2.5 space-y-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="block text-[11px] font-semibold text-rose-300">
                          Especifica el sitio o plataforma donde la viste:
                        </label>
                        <input
                          type="text"
                          autoFocus
                          value={customPlatformValue}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomPlatformValue(val);
                            setReviewForm((prev) => ({ 
                              ...prev, 
                              platform: val.trim() || 'Otra' 
                            }));
                          }}
                          placeholder="Ej. Cine Renoir, Filmin, MUBI, Blu-ray prestado, etc."
                          className="w-full bg-[#0A0A0B] border border-rose-500/60 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all shadow-inner"
                        />
                        <p className="text-[11px] text-slate-400 leading-tight">
                          Este sitio quedará registrado en tu reseña y en los filtros de tu lista personal.
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                      ¿La volvería a ver?
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {REWATCH_OPTIONS.map((opt) => (
                        <button
                          type="button"
                          key={opt.value}
                          onClick={() => setReviewForm({ ...reviewForm, wouldRewatch: opt.value })}
                          className={`px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                            reviewForm.wouldRewatch === opt.value
                              ? 'bg-rose-600/20 text-rose-300 border-rose-500/50'
                              : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <span>{opt.icon}</span>
                          <span className="truncate">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Save review button */}
                <div className="pt-2 flex items-center justify-end gap-3">
                  {currentReview && (
                    <button
                      type="button"
                      onClick={() => removeFromMyList(selectedMedia.id)}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-rose-400 text-xs font-bold border border-white/10 transition-colors"
                    >
                      Quitar de mi lista
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-sm shadow-lg shadow-rose-900/30 active:scale-95 transition-all"
                  >
                    Guardar Clasificación y Reseña
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: VOTACIONES DETALLADAS DE LA COMUNIDAD */}
          {activeTab === 'votaciones' && (
            <div className="space-y-6">
              {selectedMedia.communityVotesCount > 0 ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-[#0A0A0B] border border-white/10">
                  <div className="text-center sm:text-left">
                    <span className="text-xs text-slate-400 uppercase font-semibold">Promedio Global</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-4xl font-display font-black text-rose-500">
                        {selectedMedia.communityRating.toFixed(1)}
                      </span>
                      <RatingStars rating={selectedMedia.communityRating} size="lg" showNumber={false} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Basado en {selectedMedia.communityVotesCount.toLocaleString()} votos de la comunidad
                    </p>
                  </div>

                  {/* Rating bars */}
                  <div className="w-full sm:w-64 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((starVal) => {
                      const count = selectedMedia.detailedVotes.ratingDistribution[starVal] || 0;
                      const percent = Math.min(100, Math.round((count / selectedMedia.communityVotesCount) * 100));
                      return (
                        <div key={starVal} className="flex items-center gap-2 text-xs text-slate-400">
                          <span className="w-3 text-right">{starVal}</span>
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-rose-500 to-amber-400 rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                          <span className="w-8 text-right text-[11px]">{percent}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-[#0A0A0B] p-8 text-center space-y-2">
                  <Star className="w-8 h-8 mx-auto text-slate-600" />
                  <h4 className="text-sm font-bold text-white">Sin valoraciones todavía</h4>
                  <p className="text-xs text-slate-400">
                    Sé la primera persona en puntuar este título y compartir tu análisis.
                  </p>
                </div>
              )}

              {/* Detailed Breakdown Dimensions */}
              {selectedMedia.communityVotesCount > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Desglose Técnico de la Comunidad (Escala 1 - 10)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'Guión & Narrativa', score: selectedMedia.detailedVotes.script, icon: '📜' },
                    { label: 'Actuaciones & Elenco', score: selectedMedia.detailedVotes.acting, icon: '🎭' },
                    { label: 'Banda Sonora & Audio', score: selectedMedia.detailedVotes.soundtrack, icon: '🎵' },
                    { label: 'Efectos Visuales & Foto', score: selectedMedia.detailedVotes.visuals, icon: '🎨' },
                    { label: 'Dirección & Ritmo', score: selectedMedia.detailedVotes.direction, icon: '🎬' }
                  ].map((dim) => (
                    <div key={dim.label} className="p-3.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{dim.icon}</span>
                        <div>
                          <p className="text-xs font-bold text-white">{dim.label}</p>
                          <div className="w-28 sm:w-36 h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-rose-500 to-amber-400 rounded-full"
                              style={{ width: `${(dim.score / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <span className="text-base font-extrabold text-rose-400 font-display">
                        {dim.score.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>
          )}

          {/* TAB 4: COMENTARIOS DE LA COMUNIDAD */}
          {activeTab === 'comentarios' && (
            <div className="space-y-6">
              {/* Add comment form */}
              <form onSubmit={handleAddComment} className="p-4 rounded-2xl bg-[#0A0A0B] border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase">
                    Deja tu comentario sobre este título
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Tu calificación:</span>
                    <RatingStars
                      rating={commentRating}
                      interactive={true}
                      size="sm"
                      precision={1}
                      onChange={(r) => setCommentRating(r)}
                    />
                  </div>
                </div>

                <textarea
                  rows={3}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Comparte tu opinión, teorías, qué te sorprendió..."
                  className="w-full bg-[#161618] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!commentText.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-rose-900/30 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Publicar Comentario
                  </button>
                </div>
              </form>

              {/* Comment list */}
              <div className="space-y-3">
                {selectedMedia.comments.map((com) => (
                  <div
                    key={com.id}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={com.avatar}
                          alt={com.author}
                          className="w-8 h-8 rounded-full object-cover border border-white/10"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <h5 className="text-xs font-bold text-white">{com.author}</h5>
                          <span className="text-[10px] text-slate-400">{com.date}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{com.rating}★</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed font-light pl-10">
                      {com.comment}
                    </p>

                    <div className="flex justify-end pl-10 pt-1">
                      <button
                        onClick={() => toggleCommentLike(selectedMedia.id, com.id)}
                        className={`flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                          com.isUserLiked
                            ? 'bg-rose-600/20 text-rose-400 border-rose-500/40'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                        }`}
                      >
                        <ThumbsUp className={`w-3 h-3 ${com.isUserLiked ? 'fill-rose-400 text-rose-400' : ''}`} />
                        <span>{com.likes}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: DÓNDE VER (PLATAFORMAS LEGALES & OFICIALES) */}
          {activeTab === 'donde_ver' && (
            <WatchProvidersTab media={selectedMedia} />
          )}

        </div>
      </div>
    </div>
  );
};
