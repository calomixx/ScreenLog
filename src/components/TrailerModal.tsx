import React from 'react';
import { X, Film, ExternalLink } from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { useModalA11y } from '../hooks/useModalA11y';
import { extractYouTubeId } from '../lib/validation';

export const TrailerModal: React.FC = () => {
  const { isTrailerModalOpen, closeTrailer, activeTrailerUrl } = useMedia();
  const dialogRef = useModalA11y<HTMLDivElement>(closeTrailer, {
    enabled: isTrailerModalOpen && Boolean(activeTrailerUrl),
  });

  if (!isTrailerModalOpen || !activeTrailerUrl) return null;

  // Format youtube embed URL using robust helper
  const cleanId = extractYouTubeId(activeTrailerUrl);
  const embedUrl = cleanId
    ? `https://www.youtube-nocookie.com/embed/${cleanId}?autoplay=1&rel=0&modestbranding=1`
    : activeTrailerUrl.startsWith('http')
      ? activeTrailerUrl
      : `https://www.youtube-nocookie.com/embed/${activeTrailerUrl}?autoplay=1&rel=0`;

  const externalWatchUrl = cleanId
    ? `https://www.youtube.com/watch?v=${cleanId}`
    : activeTrailerUrl.startsWith('http')
      ? activeTrailerUrl
      : `https://www.youtube.com/watch?v=${activeTrailerUrl}`;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Tráiler"
        tabIndex={-1}
        className="relative w-full max-w-4xl bg-[#161618] border border-white/15 rounded-3xl overflow-hidden shadow-2xl shadow-black/90 outline-none"
      >
        {/* Header bar */}
        <div className="px-5 py-3.5 bg-[#0A0A0B] border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
            <Film className="w-4 h-4" />
            <span>Reproductor de Tráiler Cinemático</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={externalWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-full bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
              title="Abrir en YouTube"
              aria-label="Abrir tráiler en YouTube"
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
            <button
              type="button"
              onClick={closeTrailer}
              aria-label="Cerrar tráiler"
              className="p-1.5 rounded-full bg-white/5 hover:bg-rose-600 hover:text-white text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Video Embed */}
        <div className="relative aspect-video w-full bg-black">
          <iframe
            src={embedUrl}
            title="Tráiler"
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
};
