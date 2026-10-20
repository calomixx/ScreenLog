import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Tv, 
  ExternalLink, 
  Globe, 
  Film, 
  ShoppingBag, 
  Tag, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Send,
  Ticket,
  PlayCircle
} from 'lucide-react';
import { MediaItem, WatchProvider, WatchProviderType } from '../types';

interface WatchProvidersTabProps {
  media: MediaItem;
}

interface RegionOption {
  code: string;
  name: string;
  flag: string;
}

const REGIONS: RegionOption[] = [
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'US', name: 'EE.UU.', flag: '🇺🇸' }
];

interface ProviderGroupConfig {
  type: WatchProviderType;
  title: string;
  description: string;
  badgeColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const GROUP_CONFIGS: ProviderGroupConfig[] = [
  {
    type: 'suscripcion',
    title: 'Incluido en tu suscripción',
    description: 'Disponible sin costo adicional con tu membresía activa',
    badgeColor: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    borderColor: 'hover:border-emerald-500/40',
    icon: <PlayCircle className="w-4 h-4 text-emerald-400" />
  },
  {
    type: 'alquiler',
    title: 'Alquilar',
    description: 'Acceso temporal durante 48 horas tras iniciar la reproducción',
    badgeColor: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    borderColor: 'hover:border-amber-500/40',
    icon: <Tag className="w-4 h-4 text-amber-400" />
  },
  {
    type: 'compra',
    title: 'Comprar',
    description: 'Adquiere la versión digital permanente en tu biblioteca',
    badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    borderColor: 'hover:border-sky-500/40',
    icon: <ShoppingBag className="w-4 h-4 text-sky-400" />
  },
  {
    type: 'gratis',
    title: 'Gratis con anuncios',
    description: 'Transmisión legal y gratuita con publicidad periódica',
    badgeColor: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    borderColor: 'hover:border-slate-400/40',
    icon: <Film className="w-4 h-4 text-slate-300" />
  },
  {
    type: 'cines',
    title: 'En cines / Cartelera',
    description: 'Actualmente en exhibición en salas de cine oficiales',
    badgeColor: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    borderColor: 'hover:border-rose-500/40',
    icon: <Ticket className="w-4 h-4 text-rose-400" />
  }
];

export const WatchProvidersTab: React.FC<WatchProvidersTabProps> = ({ media }) => {
  const [selectedRegion, setSelectedRegion] = useState<string>(() => {
    try {
      return localStorage.getItem('screenlog_preferred_region') || 'ES';
    } catch {
      return 'ES';
    }
  });

  const [suggestModalOpen, setSuggestModalOpen] = useState(false);
  const [suggestPlatformName, setSuggestPlatformName] = useState('');
  const [suggestSuccess, setSuggestSuccess] = useState(false);

  const handleRegionChange = (code: string) => {
    setSelectedRegion(code);
    try {
      localStorage.setItem('screenlog_preferred_region', code);
    } catch {}
  };

  // Filter providers for the selected region
  const regionProviders = useMemo(() => {
    if (!media.watchProviders || media.watchProviders.length === 0) {
      return [];
    }
    return media.watchProviders.filter(
      (p) => p.region.toUpperCase() === selectedRegion.toUpperCase()
    );
  }, [media.watchProviders, selectedRegion]);

  // Group providers by type
  const groupedProviders = useMemo(() => {
    const groups: { [K in WatchProviderType]?: WatchProvider[] } = {};
    regionProviders.forEach((p) => {
      if (!groups[p.type]) {
        groups[p.type] = [];
      }
      groups[p.type]!.push(p);
    });
    return groups;
  }, [regionProviders]);

  const handleSuggestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestPlatformName.trim()) return;
    setSuggestSuccess(true);
    setTimeout(() => {
      setSuggestSuccess(false);
      setSuggestModalOpen(false);
      setSuggestPlatformName('');
    }, 2800);
  };

  const getPlatformMonogram = (name: string) => {
    const trimmed = name.trim();
    if (trimmed.length <= 3) return trimmed;
    const words = trimmed.split(' ');
    if (words.length > 1) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return trimmed.substring(0, 2).toUpperCase();
  };

  const currentRegionName = REGIONS.find((r) => r.code === selectedRegion)?.name || selectedRegion;

  return (
    <div id="watch-providers-container" className="space-y-6 pt-2">
      
      {/* Region Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Región de Transmisión
            </h4>
            <p className="text-[11px] text-slate-400">
              Plataformas y precios verificados para <strong className="text-slate-200">{currentRegionName}</strong>
            </p>
          </div>
        </div>

        {/* Region Pills */}
        <div 
          id="watch-region-selector"
          className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none"
          role="radiogroup"
          aria-label="Seleccionar país o región"
        >
          {REGIONS.map((r) => {
            const isSelected = r.code === selectedRegion;
            return (
              <button
                key={r.code}
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleRegionChange(r.code)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 flex-shrink-0 ${
                  isSelected
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-950/60 font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5 hover:border-white/15'
                }`}
                title={`Ver catálogo disponible en ${r.name}`}
              >
                <span>{r.flag}</span>
                <span>{r.code}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Providers Section */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedRegion}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {regionProviders.length > 0 ? (
            GROUP_CONFIGS.map((config) => {
              const providers = groupedProviders[config.type];
              if (!providers || providers.length === 0) return null;

              return (
                <div 
                  key={config.type} 
                  id={`watch-section-${config.type}`}
                  className="space-y-3"
                >
                  {/* Category Header */}
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${config.badgeColor}`}>
                        {config.icon}
                        <span>{config.title}</span>
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        ({providers.length})
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      {config.description}
                    </span>
                  </div>

                  {/* Provider Cards Grid: 1 col on mobile, 2 or 3 cols on desktop */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {providers.map((p, idx) => (
                      <div
                        key={`${p.name}-${p.type}-${idx}`}
                        id={`watch-provider-card-${p.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                        className={`group relative p-3.5 rounded-2xl bg-[#161618] hover:bg-[#1a1a1d] border border-white/10 ${config.borderColor} transition-all duration-200 hover:-translate-y-0.5 shadow-lg flex flex-col justify-between gap-3`}
                      >
                        {/* Top: Logo & Platform Details */}
                        <div className="flex items-start gap-3">
                          {/* Platform Logo Box */}
                          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center p-1.5 shadow-md flex-shrink-0 overflow-hidden border border-white/20">
                            {p.logoUrl ? (
                              <img
                                src={p.logoUrl}
                                alt={p.name}
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="font-display font-extrabold text-slate-900 text-sm tracking-tight">
                                {getPlatformMonogram(p.name)}
                              </span>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h5 className="font-display font-bold text-white text-sm sm:text-base group-hover:text-rose-300 transition-colors truncate">
                                {p.name}
                              </h5>
                              {p.quality && (
                                <span className="px-1.5 py-0.2 rounded bg-black/60 border border-white/20 text-[10px] font-extrabold text-amber-300">
                                  {p.quality}
                                </span>
                              )}
                            </div>

                            {/* Additional metadata: Seasons, Price, Quality */}
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 flex-wrap">
                              {p.price && (
                                <span className="font-semibold text-slate-200 bg-white/5 px-2 py-0.5 rounded border border-white/10 text-[11px]">
                                  {p.price}
                                </span>
                              )}
                              {p.seasons && (
                                <span className="text-rose-400 font-medium text-[11px]">
                                  {p.seasons}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Bottom CTA Action Button */}
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Ver ${media.title} en ${p.name} (se abre en una nueva pestaña)`}
                          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-rose-600 text-slate-200 hover:text-white font-semibold text-xs border border-white/10 hover:border-rose-500 transition-all duration-200 active:scale-95 shadow-sm group/btn"
                        >
                          <span>Ver en {p.name}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover/btn:text-white transition-colors" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            /* Empty State */
            <div 
              id="watch-empty-state"
              className="p-8 sm:p-10 rounded-2xl bg-white/[0.02] border border-white/10 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <Tv className="w-6 h-6" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="font-display font-bold text-white text-base">
                  Aún no tenemos información de disponibilidad para {currentRegionName}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Los derechos de distribución pueden estar negociándose, o el título podría estar disponible en cines selectos o formato físico.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  id="watch-suggest-platform-btn"
                  onClick={() => setSuggestModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white font-semibold text-xs border border-white/15 transition-all duration-200 active:scale-95 shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sugerir plataforma o reporte</span>
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Suggestion / Report Modal (Inline) */}
      {suggestModalOpen && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#161618] border border-rose-500/30 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Sugerir disponibilidad en {currentRegionName}</span>
            </h5>
            <button
              onClick={() => setSuggestModalOpen(false)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cerrar
            </button>
          </div>

          {suggestSuccess ? (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>¡Gracias por tu aporte! Notificaremos a los editores para revisar la disponibilidad de <strong>{media.title}</strong> en {currentRegionName}.</span>
            </div>
          ) : (
            <form onSubmit={handleSuggestSubmit} className="space-y-3">
              <p className="text-xs text-slate-400">
                ¿Viste que <strong>{media.title}</strong> ya está disponible en alguna plataforma legal en tu país? Indícanos el nombre:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={suggestPlatformName}
                  onChange={(e) => setSuggestPlatformName(e.target.value)}
                  placeholder="Ej: Max, Prime Video, Filmin, Cine Colombia..."
                  className="flex-1 bg-black/40 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Legal & Reliability Disclaimer */}
      <div 
        id="watch-disclaimer" 
        className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 flex items-center gap-2.5"
      >
        <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <p className="leading-relaxed">
          La disponibilidad puede variar por región y fecha. Enlaces exclusivos a sitios oficiales y legales. ScreenLog no aloja contenido audiovisual pirata.
        </p>
      </div>

    </div>
  );
};
