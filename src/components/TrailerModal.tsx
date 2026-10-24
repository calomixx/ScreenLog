import React from 'react';
import { X, Film } from 'lucide-react';
import { useMedia } from '../context/MediaContext';

export const TrailerModal: React.FC = () => {
  const { isTrailerModalOpen, closeTrailer, activeTrailerUrl } = useMedia();

  if (!isTrailerModalOpen || !activeTrailerUrl) return null;

  // Format youtube embed URL
  let embedUrl = activeTrailerUrl;
  if (!activeTrailerUrl.startsWith('http')) {
    embedUrl = `https://www.youtube.com/embed/${activeTrailerUrl}?autoplay=1&rel=0`;
  } else if (activeTrailerUrl.includes('watch?v=')) {
    const id = activeTrailerUrl.split('v=')[1]?.split('&')[0];
    embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
  } else if (activeTrailerUrl.includes('youtu.be/')) {
    const id = activeTrailerUrl.split('youtu.be/')[1]?.split('?')[0];
    embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-lg flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-[#161618] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header bar */}
        <div className="px-5 py-3.5 bg-[#0A0A0B] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
            <Film className="w-4 h-4" />
            <span>Reproductor de Tráiler Cinemático</span>
          </div>

          <button
            onClick={closeTrailer}
            aria-label="Cerrar reproductor de tráiler"
            title="Cerrar tráiler"
            className="p-1.5 rounded-full bg-white/5 hover:bg-rose-600 hover:text-white text-slate-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Video Embed */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={embedUrl}
            title="Tráiler"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
};
