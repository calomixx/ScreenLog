import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  Image as ImageIcon,
  Check,
  Film,
  Play,
  Bookmark,
  Info,
  RotateCcw,
  SlidersHorizontal,
  Flame,
  Brain,
  Zap,
  CloudRain,
  Eye,
  Heart,
  Compass,
  Layers,
  ChevronRight,
  ExternalLink,
  Copy,
  Tv
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { CineMatchItem, CineMatchResponse } from '../types';

interface PresetCard {
  id: string;
  name: string;
  tagline: string;
  colors: string[];
  sampleImage: string;
}

const VISUAL_PRESETS: PresetCard[] = [
  {
    id: 'cyberpunk_neon',
    name: 'Cyberpunk & Neo-Noir',
    tagline: 'Neón cian y magenta, lluvia, asfalto y soledad en metrópolis futuristas',
    colors: ['#00F0FF', '#FF007F', '#7928CA', '#0A0A12'],
    sampleImage: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'desert_dune',
    name: 'Épica Desértica & Brutalismo',
    tagline: 'Arenas doradas, sol abrasador, escala colosal y misticismo monolítico',
    colors: ['#D4A373', '#E9C46A', '#BC6C25', '#264653'],
    sampleImage: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'anime_ghibli',
    name: 'Acuarela Ghibli & Nostalgia',
    tagline: 'Verdes exuberantes, cielos azul celeste y magia cotidiana pintada a mano',
    colors: ['#588157', '#90E0EF', '#FAEDCD', '#E76F51'],
    sampleImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'gothic_dark',
    name: 'Gótico Urbano & Claroscuro',
    tagline: 'Sombras profundas, piedra húmeda, bibliotecas sombrías y tensión cerebral',
    colors: ['#0D1B2A', '#1B263B', '#415A77', '#E0E1DD'],
    sampleImage: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'wes_anderson',
    name: 'Pastel Simétrico & Wes Anderson',
    tagline: 'Encuadres centrados milimétricos, tonos pastel vintage y encanto nostálgico',
    colors: ['#F4A261', '#E76F51', '#2A9D8F', '#E9C46A'],
    sampleImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'noir_thriller',
    name: 'Thriller 90s & Tensión Nocturna',
    tagline: 'Luces de vapor de sodio, asfalto mojado, intriga moral y grano analógico',
    colors: ['#14213D', '#000000', '#FCA311', '#E5E5E5'],
    sampleImage: 'https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=800&q=80'
  }
];

const VIBE_OPTIONS = [
  { id: 'plot_twist', label: 'Plot Twist Inolvidable', icon: Brain, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  { id: 'adrenaline', label: 'Adrenalina & Ritmo Implacable', icon: Zap, color: 'text-rose-400 bg-rose-400/10 border-rose-400/30' },
  { id: 'melancholy', label: 'Melancolía & Reflexión Profunda', icon: CloudRain, color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  { id: 'existential_scifi', label: 'Ciencia Ficción Existencial', icon: Compass, color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  { id: 'pure_fun', label: 'Cine Palomitero & Diversión', icon: Flame, color: 'text-orange-400 bg-orange-400/10 border-orange-400/30' },
  { id: 'mystery', label: 'Misterio a Fuego Lento', icon: Eye, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' },
  { id: 'emotional_comfort', label: 'Confort Emocional & Calidez', icon: Heart, color: 'text-pink-400 bg-pink-400/10 border-pink-400/30' },
  { id: 'epic', label: 'Épica Monumental', icon: Layers, color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' }
];

export const CineMatchView: React.FC = () => {
  const {
    setSelectedMediaId,
    openTrailer,
    updateMediaStatus,
    addCustomMedia,
    userReviews,
    myListEntries,
    showToast,
    mediaList,
    currentUser
  } = useMedia();

  // Mode: 'photos' | 'vibe' | 'favorites'
  const [activeMode, setActiveMode] = useState<'photos' | 'vibe' | 'favorites'>('photos');

  // Photo mode states
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>('cyberpunk_neon');

  // Vibe mode state
  const [selectedVibe, setSelectedVibe] = useState<string>('plot_twist');

  // Optional filters
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'pelicula' | 'serie' | 'anime'>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [customNote, setCustomNote] = useState('');

  // Results & Loading
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [results, setResults] = useState<CineMatchResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Initial auto-recommendation on mount if empty
  useEffect(() => {
    if (!results) {
      handleGenerateRecommendations(false);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP).', 'warning');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast('La imagen supera el límite de 8MB. Por favor sube una imagen más ligera.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUploadedImage(base64);
      showToast('¡Foto cargada! La IA analizará su estética visual.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setUploadedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerateRecommendations = async (scrollToResults = true) => {
    setIsLoading(true);
    setLoadingStep('Analizando composición y paleta estética...');

    const timer1 = setTimeout(() => {
      setLoadingStep('Buscando afinidades en el catálogo cinematográfico...');
    }, 600);

    const timer2 = setTimeout(() => {
      setLoadingStep('Calculando porcentajes de afinidad visual y temática...');
    }, 1200);

    try {
      // Gather user's top-rated items for context
      const topFavorites = myListEntries
        .filter((entry) => (userReviews[entry.id]?.stars || 0) >= 4)
        .map((entry) => entry.title)
        .slice(0, 5);

      const payload = {
        image: activeMode === 'photos' ? uploadedImage : undefined,
        visualPreset: activeMode === 'photos' && !uploadedImage ? selectedPreset : undefined,
        vibe: activeMode === 'vibe' ? selectedVibe : undefined,
        mediaType: mediaTypeFilter,
        platform: platformFilter,
        userFavorites: topFavorites,
        queryText: customNote.trim()
      };

      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: CineMatchResponse = await response.json();
      setResults(data);

      if (scrollToResults) {
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    } catch (err) {
      console.error('Error generating recommendations:', err);
      showToast('No se pudieron obtener las recomendaciones en este momento.', 'warning');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setIsLoading(false);
    }
  };

  const handleCopyColor = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 1800);
  };

  const handleAddMedia = (item: CineMatchItem) => {
    // Check if item already exists in catalog
    const existing = mediaList.find(
      (m) =>
        m.id === item.id ||
        m.title.toLowerCase().trim() === item.title.toLowerCase().trim()
    );

    if (existing) {
      updateMediaStatus(existing.id, 'pendiente');
      showToast(`"${existing.title}" se añadió a Mi Lista como pendiente.`, 'success');
      return;
    }

    // Add new media to catalog & list seamlessly
    addCustomMedia({
      title: item.title,
      originalTitle: item.originalTitle || item.title,
      type: item.type,
      year: item.year,
      director: item.director,
      genres: item.genres,
      synopsis: item.synopsis,
      posterUrl: item.posterUrl,
      backdropUrl: item.backdropUrl,
      trailerYoutubeId: item.trailerYoutubeId,
      defaultPlatform: item.defaultPlatform,
      streamingPlatforms: [item.defaultPlatform]
    });
    showToast(`"${item.title}" se añadió a tu lista con éxito.`, 'success');
  };

  const isItemInList = (item: CineMatchItem) => {
    const existing = mediaList.find(
      (m) =>
        m.id === item.id ||
        m.title.toLowerCase().trim() === item.title.toLowerCase().trim()
    );
    return existing ? Boolean(userReviews[existing.id]) : Boolean(userReviews[item.id]);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-slate-100 pt-6 pb-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Hero Header */}
        <div className="relative rounded-3xl overflow-hidden border border-rose-500/20 bg-gradient-to-br from-[#16141F] via-[#121118] to-[#0A0A0C] p-6 sm:p-10 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>CineMatch AI Multimodal</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white leading-tight">
              Dime qué fotos o vibra te gustan,{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-rose-500 to-amber-400">
                te diré qué película ver
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              El primer recomendador que analiza la <strong>estética visual</strong> de tus imágenes: 
              paleta de color, iluminación, encuadres cinematográficos y estado de ánimo para emparejarte con tu próxima obra maestra.
            </p>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
          <button
            onClick={() => setActiveMode('photos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 ${
              activeMode === 'photos'
                ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-900/30 border border-rose-500/40'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            <Camera className="w-4 h-4 text-amber-400" />
            <span>Por Fotos & Estética Visual</span>
          </button>

          <button
            onClick={() => setActiveMode('vibe')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 ${
              activeMode === 'vibe'
                ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-900/30 border border-rose-500/40'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Por Estado de Ánimo / Vibe</span>
          </button>

          <button
            onClick={() => setActiveMode('favorites')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-200 ${
              activeMode === 'favorites'
                ? 'bg-gradient-to-r from-rose-600 to-rose-700 text-white shadow-lg shadow-rose-900/30 border border-rose-500/40'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            <Bookmark className="w-4 h-4 text-amber-400" />
            <span>Basado en Mis Favoritos (5★)</span>
          </button>
        </div>

        {/* MODE 1: PHOTOS & VISUAL AESTHETIC */}
        {activeMode === 'photos' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Upload Zone */}
            <div className="bg-[#121118] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2 font-display">
                    <Upload className="w-5 h-5 text-rose-500" />
                    Sube tu foto, captura o moodboard
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Formatos JPG, PNG o WEBP. Gemini analizará la luz, saturación, grano y sombras de la escena.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="cinematch-file-upload"
                />

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all active:scale-95 shadow-md"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{uploadedImage ? 'Cambiar Foto' : 'Seleccionar Foto'}</span>
                  </button>

                  {uploadedImage && (
                    <button
                      onClick={handleClearImage}
                      className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 text-xs transition-colors"
                      title="Quitar foto"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>

              {/* Upload Preview or Dropzone placeholder */}
              {uploadedImage ? (
                <div className="relative rounded-2xl overflow-hidden border border-rose-500/40 max-h-80 bg-black/40 flex items-center justify-center group">
                  <img
                    src={uploadedImage}
                    alt="Foto subida para análisis"
                    className="max-h-80 w-auto object-contain mx-auto transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-medium text-slate-200 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Foto lista para análisis estético</span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/15 hover:border-rose-500/50 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-colors bg-white/[0.02] hover:bg-white/[0.04]"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-slate-400 mb-3 group-hover:text-rose-400 transition-colors">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-white">Haz clic aquí para subir una imagen</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    O arrastra una fotografía de paisajes, atardeceres, arquitectura, anime o capturas de tu película favorita.
                  </p>
                </div>
              )}
            </div>

            {/* Curated Aesthetic Presets */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    O explora 6 estéticas cinematográficas curadas:
                  </h4>
                  <p className="text-xs text-slate-400">
                    Selecciona una paleta de referencia si no tienes una foto a mano.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {VISUAL_PRESETS.map((preset) => {
                  const isSelected = !uploadedImage && selectedPreset === preset.id;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => {
                        setUploadedImage(null);
                        setSelectedPreset(preset.id);
                      }}
                      className={`relative rounded-2xl p-4 cursor-pointer transition-all duration-300 border overflow-hidden ${
                        isSelected
                          ? 'border-rose-500 bg-rose-500/10 shadow-lg shadow-rose-950/40 scale-[1.02]'
                          : 'border-white/10 bg-[#121118]/80 hover:bg-[#161422] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h5 className="font-extrabold text-sm text-white font-display">
                          {preset.name}
                        </h5>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-2 mb-3">
                        {preset.tagline}
                      </p>

                      {/* Color Palette Chips */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-white/5">
                        <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Paleta:</span>
                        {preset.colors.map((c, i) => (
                          <span
                            key={i}
                            className="w-4 h-4 rounded-full border border-black/30 shadow-sm"
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: VIBE / MOOD */}
        {activeMode === 'vibe' && (
          <div className="bg-[#121118] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 animate-in fade-in duration-300">
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2 font-display">
                <Zap className="w-5 h-5 text-amber-400" />
                ¿Qué tipo de emoción buscas sentir hoy?
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Elige una vibra emocional y ScreenLog seleccionará historias con el tono, ritmo y clímax idóneos.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {VIBE_OPTIONS.map((vibe) => {
                const IconComponent = vibe.icon;
                const isSelected = selectedVibe === vibe.id;
                return (
                  <button
                    key={vibe.id}
                    onClick={() => setSelectedVibe(vibe.id)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all duration-200 ${
                      isSelected
                        ? 'border-rose-500 bg-rose-500/15 text-white shadow-md shadow-rose-950/40 scale-[1.02]'
                        : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <div className={`p-2 rounded-xl border ${vibe.color}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">{vibe.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* MODE 3: FAVORITES (MY LIST) */}
        {activeMode === 'favorites' && (
          <div className="bg-[#121118] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4 animate-in fade-in duration-300">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2 font-display">
              <Bookmark className="w-5 h-5 text-amber-400" />
              Recomendaciones inspiradas en tu colección personal
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              CineMatch analizará las películas que has calificado con 4★ o 5★ en tu lista de seguimiento, 
              detectando directores predilectos, temas recurrentes y géneros para descubrir joyas ocultas.
            </p>

            <div className="pt-2">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Tus títulos mejor valorados en ScreenLog:
              </div>
              <div className="flex flex-wrap gap-2">
                {myListEntries.filter((e) => (userReviews[e.id]?.stars || 0) >= 4).length > 0 ? (
                  myListEntries
                    .filter((e) => (userReviews[e.id]?.stars || 0) >= 4)
                    .map((item) => (
                      <span
                        key={item.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>{item.title}</span>
                        <span className="text-amber-400 font-bold">★{userReviews[item.id]?.stars}</span>
                      </span>
                    ))
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Aún no tienes títulos de 4 o 5 estrellas guardados en tu lista. CineMatch usará las mejores obras maestras del catálogo como base.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Additional Filters Bar */}
        <div className="bg-[#111116] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
            <SlidersHorizontal className="w-4 h-4 text-rose-500" />
            <span>Filtros:</span>
          </div>

          {/* Type filter */}
          <div className="flex items-center gap-1 bg-[#18181E] p-1 rounded-xl border border-white/5 text-xs">
            {(['all', 'pelicula', 'serie', 'anime'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setMediaTypeFilter(t)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  mediaTypeFilter === t
                    ? 'bg-rose-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'all' ? 'Todos' : t === 'pelicula' ? 'Películas' : t === 'serie' ? 'Series' : 'Anime'}
              </button>
            ))}
          </div>

          {/* Platform filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">Plataforma:</label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="bg-[#18181E] border border-white/10 rounded-xl px-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              <option value="all">Cualquiera</option>
              <option value="Netflix">Netflix</option>
              <option value="Max">Max (HBO)</option>
              <option value="Prime Video">Prime Video</option>
              <option value="Disney+">Disney+</option>
              <option value="Apple TV+">Apple TV+</option>
              <option value="Crunchyroll">Crunchyroll</option>
            </select>
          </div>

          {/* Custom Note Input */}
          <div className="flex-1 min-w-[240px]">
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Detalle extra (ej: 'con lluvia constante', 'de menos de 2 horas')..."
              className="w-full bg-[#18181E] border border-white/10 rounded-xl px-3.5 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Generate Button CTA */}
        <div className="flex justify-center pt-2">
          <button
            onClick={() => handleGenerateRecommendations(true)}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-sm sm:text-base shadow-xl shadow-rose-950/50 hover:shadow-rose-900/60 transition-all duration-300 active:scale-95 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
          >
            {isLoading ? (
              <>
                <Sparkles className="w-5 h-5 animate-spin text-amber-300" />
                <span>{loadingStep || 'Generando recomendaciones...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>Generar Mis Recomendaciones CineMatch</span>
              </>
            )}
          </button>
        </div>

        {/* RESULTS SECTION */}
        <div ref={resultsRef} className="pt-8 space-y-6">
          {results && (
            <>
              {/* Aesthetic Analysis Summary Card */}
              <div className="bg-gradient-to-r from-[#171520] via-[#14131A] to-[#0E0D12] border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  
                  <div className="space-y-3 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                        Análisis Estético Detectado
                      </span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-white font-display">
                      {results.aestheticAnalysis.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {results.aestheticAnalysis.summary}
                    </p>

                    {/* Keywords */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {results.aestheticAnalysis.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Palette Swatches */}
                  <div className="bg-black/40 border border-white/10 rounded-2xl p-4 flex flex-col items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Paleta Cromática
                    </span>
                    <div className="flex items-center gap-2">
                      {results.aestheticAnalysis.palette.map((color, i) => (
                        <button
                          key={i}
                          onClick={() => handleCopyColor(color)}
                          className="group relative flex flex-col items-center"
                          title={`Copiar color ${color}`}
                        >
                          <span
                            className="w-8 h-8 rounded-xl border border-white/20 shadow-md transition-transform duration-200 group-hover:scale-110 active:scale-95"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-[9px] font-mono text-slate-400 mt-1 opacity-80 group-hover:opacity-100">
                            {copiedColor === color ? '✓' : color}
                          </span>
                        </button>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 italic">
                      {copiedColor ? '¡Color copiado al portapapeles!' : 'Haz clic en un swatch para copiar hex'}
                    </span>
                  </div>

                </div>
              </div>

              {/* Grid of Recommended Movies */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-white font-display flex items-center gap-2">
                    <Film className="w-5 h-5 text-rose-500" />
                    Obras Seleccionadas ({results.recommendations.length})
                  </h3>
                  <span className="text-xs text-slate-400">
                    Ordenadas por coincidencia estética y cinematográfica
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.recommendations.map((item) => {
                    const inList = isItemInList(item);
                    return (
                      <div
                        key={item.id}
                        className="group bg-[#121118] border border-white/10 hover:border-rose-500/50 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-rose-950/30 transition-all duration-300 flex flex-col"
                      >
                        {/* Poster Header */}
                        <div className="relative aspect-[16/10] overflow-hidden bg-black/60">
                          <img
                            src={item.backdropUrl || item.posterUrl}
                            alt={item.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#121118] via-transparent to-black/40" />

                          {/* Match Badge */}
                          <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-rose-500/40 text-amber-300 text-xs font-black shadow-lg flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            <span>{item.matchPercentage}% Match</span>
                          </div>

                          {/* Platform Badge */}
                          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 text-slate-200 text-[11px] font-bold flex items-center gap-1">
                            <Tv className="w-3 h-3 text-rose-400" />
                            <span>{item.defaultPlatform}</span>
                          </div>

                          {/* Vibe Tag */}
                          <div className="absolute bottom-2 left-3 right-3">
                            <span className="inline-block px-2.5 py-0.5 rounded-lg bg-rose-600/80 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider">
                              {item.vibeTag}
                            </span>
                          </div>
                        </div>

                        {/* Content Body */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4
                                  onClick={() => setSelectedMediaId(item.id)}
                                  className="font-display font-extrabold text-white text-base hover:text-rose-400 cursor-pointer transition-colors line-clamp-1"
                                >
                                  {item.title}
                                </h4>
                                <p className="text-xs text-slate-400">
                                  {item.year} • Dir. {item.director}
                                  {item.duration ? ` • ${item.duration}` : ''}
                                </p>
                              </div>

                              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold uppercase text-slate-300 flex-shrink-0">
                                {item.type}
                              </span>
                            </div>

                            {/* Genres */}
                            <div className="flex flex-wrap gap-1">
                              {item.genres.slice(0, 3).map((g, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] text-slate-400 font-medium"
                                >
                                  {g}
                                </span>
                              ))}
                            </div>

                            {/* Match Reason (Why you'll like it) */}
                            <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                ¿Por qué coincide?
                              </span>
                              <p className="text-xs text-slate-300 leading-relaxed italic">
                                "{item.matchReason}"
                              </p>
                            </div>

                            {/* Synopsis */}
                            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                              {item.synopsis}
                            </p>
                          </div>

                          {/* Action Buttons */}
                          <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                            <button
                              onClick={() => handleAddMedia(item)}
                              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                                inList
                                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950/40'
                              }`}
                            >
                              {inList ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>En Mi Lista</span>
                                </>
                              ) : (
                                <>
                                  <Bookmark className="w-3.5 h-3.5" />
                                  <span>Añadir a Mi Lista</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => setSelectedMediaId(item.id)}
                              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs transition-colors"
                              title="Ver Ficha Completa"
                            >
                              <Info className="w-4 h-4" />
                            </button>

                            {item.trailerYoutubeId && (
                              <button
                                onClick={() => openTrailer(item.trailerYoutubeId)}
                                className="p-2 rounded-xl bg-white/5 hover:bg-rose-600/20 text-rose-400 hover:text-rose-300 border border-white/10 text-xs transition-colors"
                                title="Ver Tráiler"
                              >
                                <Play className="w-4 h-4 fill-current" />
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
