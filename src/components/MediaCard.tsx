import React, { useState, useRef } from 'react';
import { 
  Star, 
  Plus, 
  Check, 
  Clock, 
  Play, 
  MoreVertical, 
  Bookmark, 
  Trash2, 
  Eye,
  Film,
  Edit3
} from 'lucide-react';
import { MediaItem, WatchStatus } from '../types';
import { useMedia } from '../context/MediaContext';
import { RatingStars } from './RatingStars';

interface MediaCardProps {
  media: MediaItem;
  layout?: 'grid' | 'compact' | 'detailed';
  parallax?: boolean;
}

export const MediaCard: React.FC<MediaCardProps> = ({ media, layout = 'grid', parallax = false }) => {
  const { 
    setSelectedMediaId, 
    userReviews, 
    updateMediaStatus, 
    removeFromMyList,
    openTrailer,
    currentUser,
    openEditMediaModal,
    deleteMediaItem
  } = useMedia();

  const cardRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showCardDeleteConfirm, setShowCardDeleteConfirm] = useState(false);
  const [tiltStyle, setTiltStyle] = useState({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    glareX: 50,
    glareY: 50,
    glareOpacity: 0,
    posterShiftX: 0,
    posterShiftY: 0
  });

  const userReview = userReviews[media.id];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!parallax || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Smooth tilt: up to 10 degrees along X and Y axes
    const rotateX = ((y - centerY) / centerY) * -10;
    const rotateY = ((x - centerX) / centerX) * 10;

    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.04, 1.04, 1.04)`,
      glareX: (x / rect.width) * 100,
      glareY: (y / rect.height) * 100,
      glareOpacity: 0.2,
      posterShiftX: rotateY * 0.45,
      posterShiftY: -rotateX * 0.45
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsMenuOpen(false);
    if (parallax) {
      setTiltStyle({
        transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
        glareX: 50,
        glareY: 50,
        glareOpacity: 0,
        posterShiftX: 0,
        posterShiftY: 0
      });
    }
  };

  const handleStatusChange = (e: React.MouseEvent, status: WatchStatus) => {
    e.stopPropagation();
    updateMediaStatus(media.id, status);
    setIsMenuOpen(false);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromMyList(media.id);
    setIsMenuOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setSelectedMediaId(media.id);
    }
  };

  const getStatusBadge = () => {
    if (!userReview) return null;
    switch (userReview.status) {
      case 'terminada':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold backdrop-blur-md">
            <Check className="w-3 h-3" />
            Terminada {userReview.stars > 0 && `• ${userReview.stars}★`}
          </span>
        );
      case 'en_proceso':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[11px] font-bold backdrop-blur-md">
            <Clock className="w-3 h-3" />
            En proceso
          </span>
        );
      case 'pendiente':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[11px] font-bold backdrop-blur-md">
            <Bookmark className="w-3 h-3" />
            Pendiente
          </span>
        );
    }
  };

  return (
    <div
      ref={cardRef}
      id={`media-card-${media.id}`}
      onClick={() => setSelectedMediaId(media.id)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      role="article"
      aria-label={`${media.title} (${media.year})`}
      tabIndex={0}
      style={{
        transform: parallax ? tiltStyle.transform : undefined,
        transformStyle: 'preserve-3d',
        transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.4s ease-out'
      }}
      className={`group relative bg-[#161618] hover:bg-[#1c1c20] focus-within:bg-[#1c1c20] border border-white/5 hover:border-rose-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-rose-950/40 transition-all duration-300 flex flex-col cursor-pointer ${
        !parallax ? 'transform hover:-translate-y-1.5 focus-within:-translate-y-1.5' : ''
      }`}
    >
      {/* Specular glare dynamic light reflection */}
      {parallax && isHovered && (
        <div 
          className="pointer-events-none absolute inset-0 rounded-2xl z-40 transition-opacity duration-200"
          style={{
            background: `radial-gradient(circle 240px at ${tiltStyle.glareX}% ${tiltStyle.glareY}%, rgba(255, 255, 255, ${tiltStyle.glareOpacity}), rgba(244, 63, 94, 0.1), transparent 70%)`
          }}
        />
      )}

      {/* Poster Media Box with 3D Depth */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-black/50">
        <img
          src={media.posterUrl}
          alt={media.title}
          loading="lazy"
          style={{
            transform: parallax && isHovered 
              ? `scale(1.08) translate3d(${tiltStyle.posterShiftX}px, ${tiltStyle.posterShiftY}px, 0)` 
              : 'scale(1)',
            transition: 'transform 0.3s ease-out'
          }}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />

        {/* Gradient shadow */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#161618] via-black/20 to-transparent opacity-80 group-hover:opacity-40 transition-opacity" />

        {/* Top Badges (visible when not hovered) */}
        <div className={`absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1 z-10 transition-opacity duration-200 ${
          isHovered ? 'opacity-0 pointer-events-none group-focus-within:opacity-0 group-focus-within:pointer-events-none' : 'opacity-100'
        }`}>
          <span className="px-2 py-0.5 rounded-md bg-rose-600/90 text-white backdrop-blur-md text-[10px] font-bold uppercase tracking-wider shadow">
            {media.type}
          </span>

          <div className="flex items-center gap-1">
            {currentUser?.role === 'admin' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openEditMediaModal(media);
                }}
                className="p-1 rounded-md bg-black/75 hover:bg-rose-600 text-slate-200 hover:text-white border border-white/10 transition-colors shadow"
                title="Editar título (Admin demon)"
                aria-label="Editar título (Admin)"
              >
                <Edit3 className="w-3 h-3" />
              </button>
            )}
            {getStatusBadge()}
          </div>
        </div>

        {/* Cinematic Parallax Overlay: Full Movie Synopsis & Quick Actions */}
        <div className={`absolute inset-0 z-20 flex flex-col justify-between p-3.5 bg-gradient-to-t from-[#0A0A0B]/98 via-[#161618]/95 to-black/85 backdrop-blur-sm transition-all duration-300 ${
          isHovered ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto'
        }`}>
          {/* Top of hover overlay: Platform / Category & Menu */}
          <div className="flex items-center justify-between gap-1.5">
            <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider shadow">
              {media.type} • {media.year}
            </span>

            <div className="flex items-center gap-1">
              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditMediaModal(media);
                  }}
                  className="p-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white border border-rose-400/40 shadow transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                  title="Editar catálogo (Admin demon)"
                  aria-label="Editar ficha (Admin)"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}

              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen(!isMenuOpen);
                  }}
                  className="p-1.5 rounded-full bg-white/10 text-slate-200 hover:text-rose-400 hover:bg-white/20 border border-white/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                  title="Opciones de estado"
                  aria-label="Opciones de estado en mi lista"
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

              {/* Status Dropdown Menu */}
              {isMenuOpen && (
                <div 
                  className="absolute right-0 top-full mt-1 w-48 bg-[#161618] border border-white/10 rounded-xl p-1.5 shadow-2xl z-30 animate-in fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1" role="presentation">
                    Cambiar estado
                  </div>
                  <button
                    onClick={(e) => handleStatusChange(e, 'pendiente')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none flex items-center gap-2"
                    role="menuitem"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-sky-400" />
                    Pendiente
                  </button>
                  <button
                    onClick={(e) => handleStatusChange(e, 'en_proceso')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none flex items-center gap-2"
                    role="menuitem"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    En proceso
                  </button>
                  <button
                    onClick={(e) => handleStatusChange(e, 'terminada')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none flex items-center gap-2"
                    role="menuitem"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Terminada (Calificar)
                  </button>

                  {userReview && (
                    <div className="pt-1 mt-1 border-t border-white/10" role="group">
                      <button
                        onClick={handleRemove}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 focus-visible:bg-rose-500/10 focus-visible:outline-none flex items-center gap-2"
                        role="menuitem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Quitar de mi lista
                      </button>
                    </div>
                  )}

                  {(currentUser?.role === 'admin' || currentUser?.role === 'owner') && (
                    <div className="pt-1 mt-1 border-t border-white/10 space-y-0.5" role="group">
                      <span className="text-[9px] uppercase font-bold text-rose-400 px-2.5 block tracking-wider" role="presentation">
                        Administrador
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          openEditMediaModal(media);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-amber-300 hover:bg-amber-500/10 focus-visible:bg-amber-500/10 focus-visible:outline-none flex items-center gap-2 font-medium"
                        role="menuitem"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                        Editar ficha
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          setShowCardDeleteConfirm(true);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 focus-visible:bg-rose-500/10 focus-visible:outline-none flex items-center gap-2 font-medium"
                        role="menuitem"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        Quitar del catálogo
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Center of hover overlay: Full & Clear Movie Synopsis */}
          <div className="my-auto py-1 space-y-1.5 text-left">
            {media.communityVotesCount > 0 ? (
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{media.communityRating.toFixed(1)}</span>
                <span className="text-[11px] text-slate-400 font-normal">({media.communityVotesCount} votos)</span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">Sin valoraciones</span>
            )}

            <p className="text-[11px] text-slate-300">
              <span className="text-rose-400 font-semibold">Director:</span> {media.director}
            </p>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Descripción / Sinopsis:
              </span>
              <p className="text-xs text-slate-200 leading-relaxed line-clamp-4 font-normal overflow-y-auto max-h-[88px] pr-1 scrollbar-thin scrollbar-thumb-white/20">
                {media.synopsis || 'Sin descripción registrada para este título.'}
              </p>
            </div>
          </div>

          {/* Bottom actions: Trailer & Ficha */}
          <div className="flex items-center gap-2 pt-2 border-t border-white/10">
            {media.trailerYoutubeId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openTrailer(media.trailerYoutubeId);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                title="Ver Tráiler"
                aria-label="Ver Tráiler"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Tráiler</span>
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMediaId(media.id);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-semibold text-xs border border-white/15 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              title="Ver Ficha y Evaluaciones"
              aria-label="Ver Ficha"
            >
              <Eye className="w-3.5 h-3.5 text-rose-400" />
              <span>Ficha</span>
            </button>
          </div>
        </div>

        {/* Bottom Poster Info Overlay (when not hovered) */}
        <div className={`absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between pointer-events-none transition-opacity duration-200 ${
          isHovered ? 'opacity-0 group-focus-within:opacity-0' : 'opacity-100'
        }`}>
          <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[11px] text-slate-300 font-medium border border-white/10">
            {media.defaultPlatform}
          </span>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[11px] font-bold text-amber-400 border border-white/10">
            <Star className="w-3 h-3 fill-amber-400" />
            {(Number(media.communityRating) || 5.0).toFixed(1)}
          </div>
        </div>
      </div>

      {/* Card Content Footer */}
      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
        <div>
          <h3 className="font-display font-bold text-white text-base leading-snug group-hover:text-rose-400 transition-colors line-clamp-1">
            {media.title}
          </h3>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
            <span>{media.year}</span>
            <span className="truncate max-w-[120px]">{media.director}</span>
          </div>
        </div>

        {/* Genre Tags */}
        <div className="flex flex-wrap gap-1 pt-1">
          {(media.genres || []).slice(0, 2).map((g) => (
            <span
              key={g}
              className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 font-medium border border-white/5"
            >
              {g}
            </span>
          ))}
          {(media.genres || []).length > 2 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400">
              +{(media.genres || []).length - 2}
            </span>
          )}
        </div>

        {/* User Review preview if finished */}
        {userReview && userReview.status === 'terminada' && (
          <div className="mt-1 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Mi nota:</span>
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              {userReview.stars} / 5
            </span>
          </div>
        )}
      </div>

      {/* Confirmation overlay for admin catalog deletion */}
      {showCardDeleteConfirm && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 z-30 bg-black/90 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in duration-150"
        >
          <div className="w-10 h-10 rounded-2xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-white font-bold leading-snug">
              ¿Eliminar "{media.title}"?
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Se quitará del catálogo para todos los usuarios.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full pt-1">
            <button
              onClick={() => setShowCardDeleteConfirm(false)}
              className="flex-1 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                await deleteMediaItem(media.id);
                setShowCardDeleteConfirm(false);
              }}
              className="flex-1 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/50 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
