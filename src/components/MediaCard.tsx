import React, { useState } from 'react';
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
  Edit3
} from 'lucide-react';
import { MediaItem, WatchStatus } from '../types';
import { useMedia } from '../context/MediaContext';
import { RatingStars } from './RatingStars';

interface MediaCardProps {
  media: MediaItem;
  layout?: 'grid' | 'compact' | 'detailed';
}

export const MediaCard: React.FC<MediaCardProps> = ({ media, layout = 'grid' }) => {
  const { 
    setSelectedMediaId, 
    userReviews, 
    updateMediaStatus, 
    removeFromMyList,
    openTrailer
  } = useMedia();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const userReview = userReviews[media.id];

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
            Por ver
          </span>
        );
    }
  };

  return (
    <div
      id={`media-card-${media.id}`}
      onClick={() => setSelectedMediaId(media.id)}
      className="group relative bg-[#161618] hover:bg-[#1c1c20] border border-white/5 hover:border-rose-500/40 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl hover:shadow-rose-900/20 transition-all duration-300 flex flex-col cursor-pointer transform hover:-translate-y-1.5"
    >
      {/* Poster Media Box */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-black/50">
        <img
          src={media.posterUrl}
          alt={media.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />

        {/* Gradient shadow */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#161618] via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1 z-10">
          <span className="px-2 py-0.5 rounded-md bg-rose-600/90 text-white backdrop-blur-md text-[10px] font-bold uppercase tracking-wider shadow">
            {media.type}
          </span>

          <div className="flex items-center gap-1">
            {getStatusBadge()}
          </div>
        </div>

        {/* Quick Hover Overlay Actions */}
        <div className="absolute inset-0 bg-black/75 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3 z-20">
          <div className="flex justify-end">
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMenuOpen(!isMenuOpen);
                }}
                className="p-1.5 rounded-full bg-white/10 text-slate-200 hover:text-rose-400 hover:bg-white/20 border border-white/15 transition-colors"
                title="Opciones de estado"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Status Dropdown Menu */}
              {isMenuOpen && (
                <div 
                  className="absolute right-0 top-full mt-1 w-48 bg-[#161618] border border-white/10 rounded-xl p-1.5 shadow-2xl z-30 animate-in fade-in"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[10px] font-bold text-slate-400 uppercase px-2 py-1">
                    Cambiar estado
                  </div>
                  <button
                    onClick={(e) => handleStatusChange(e, 'pendiente')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/10 flex items-center gap-2"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-sky-400" />
                    Por ver / Lista
                  </button>
                  <button
                    onClick={(e) => handleStatusChange(e, 'en_proceso')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/10 flex items-center gap-2"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    En proceso
                  </button>
                  <button
                    onClick={(e) => handleStatusChange(e, 'terminada')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/10 flex items-center gap-2"
                  >
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    Terminada (Calificar)
                  </button>

                  {userReview && (
                    <div className="pt-1 mt-1 border-t border-white/10">
                      <button
                        onClick={handleRemove}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Quitar de mi lista
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
              {media.synopsis}
            </p>

            <div className="flex items-center gap-2 pt-1">
              {media.trailerYoutubeId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openTrailer(media.trailerYoutubeId);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-rose-600 text-black hover:text-white font-bold text-xs shadow-md transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Tráiler
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMediaId(media.id);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-rose-400" />
                Ficha
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Poster Info Overlay */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[11px] text-slate-300 font-medium border border-white/10">
            {media.defaultPlatform}
          </span>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[11px] font-bold text-amber-400 border border-white/10">
            <Star className="w-3 h-3 fill-amber-400" />
            {media.communityRating.toFixed(1)}
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
          {media.genres.slice(0, 2).map((g) => (
            <span
              key={g}
              className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 font-medium border border-white/5"
            >
              {g}
            </span>
          ))}
          {media.genres.length > 2 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-slate-400">
              +{media.genres.length - 2}
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
    </div>
  );
};
