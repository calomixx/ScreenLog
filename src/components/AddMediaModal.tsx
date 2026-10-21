import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Image as ImageIcon, 
  Film, 
  Sparkles, 
  Check, 
  Link as LinkIcon,
  Tv,
  Calendar,
  User,
  Clock,
  Play,
  Loader2,
  AlertCircle,
  Info
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { MediaType } from '../types';
import { apiRequest } from '../lib/api';

const SAMPLE_POSTER_PRESETS = [
  { name: 'Cyberpunk Neon', url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80' },
  { name: 'Cosmic Cinema', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80' },
  { name: 'Noir Drama', url: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=800&q=80' },
  { name: 'Epic Desert', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80' },
  { name: 'Nature Wild', url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80' }
];

const AVAILABLE_GENRES = [
  'Acción', 'Aventura', 'Animación', 'Anime', 'Shonen', 'Seinen', 'Mecha', 'Ciencia Ficción', 'Comedia', 
  'Crimen', 'Documental', 'Drama', 'Fantasía', 'Historia', 
  'Misterio', 'Romance', 'Suspense', 'Terror', 'Biografía'
];

export const AddMediaModal: React.FC = () => {
  const { 
    isAddModalOpen, 
    setIsAddModalOpen, 
    addCustomMedia, 
    setSelectedMediaId 
  } = useMedia();

  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [type, setType] = useState<MediaType>('pelicula');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [director, setDirector] = useState('');
  const [castInput, setCastInput] = useState('');
  const [duration, setDuration] = useState('2h 15m');
  const [defaultPlatform, setDefaultPlatform] = useState('Netflix');
  const [synopsis, setSynopsis] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Drama']);
  const [customGenre, setCustomGenre] = useState('');
  const [posterUrl, setPosterUrl] = useState('https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80');
  const [backdropUrl, setBackdropUrl] = useState('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [imageTab, setImageTab] = useState<'url' | 'upload' | 'presets'>('url');

  // Gemini AI Autofill States
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillSuccess, setAutofillSuccess] = useState<string | null>(null);
  const [autofillWarning, setAutofillWarning] = useState<string | null>(null);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const [hasAutofilled, setHasAutofilled] = useState(false);
  const [animeInfo, setAnimeInfo] = useState<{ format?: string; episodes?: string } | null>(null);

  const handleAutofill = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length < 2 || isAutofilling) return;

    setIsAutofilling(true);
    setAutofillError(null);
    setAutofillWarning(null);
    setAutofillSuccess(null);

    try {
      const result = await apiRequest<{ success: boolean; data: any }>('/api/autofill', {
        method: 'POST',
        body: JSON.stringify({ title: trimmedTitle }),
      });

      const data = result.data;

      // Autocomplete all form fields
      if (data.title && typeof data.title === 'string') {
        setTitle(data.title);
      }
      if (data.originalTitle && typeof data.originalTitle === 'string') {
        setOriginalTitle(data.originalTitle);
      }
      if (data.type && ['pelicula', 'serie', 'anime', 'documental'].includes(data.type)) {
        setType(data.type as MediaType);
      }
      if (data.year && !isNaN(Number(data.year))) {
        setYear(Number(data.year));
      }
      if (data.director && typeof data.director === 'string') {
        setDirector(data.director);
      }
      if (Array.isArray(data.cast) && data.cast.length > 0) {
        setCastInput(data.cast.join(', '));
      }
      if (data.duration && typeof data.duration === 'string') {
        setDuration(data.duration);
      }
      if (data.defaultPlatform && typeof data.defaultPlatform === 'string') {
        setDefaultPlatform(data.defaultPlatform);
      }
      if (data.synopsis && typeof data.synopsis === 'string') {
        setSynopsis(data.synopsis);
      }
      if (data.trailerYoutubeId && typeof data.trailerYoutubeId === 'string') {
        setTrailerUrl(data.trailerYoutubeId);
      }
      if (Array.isArray(data.genres) && data.genres.length > 0) {
        setSelectedGenres(data.genres);
      }

      const isAnime = data.type === 'anime' || (data.genres && data.genres.includes('Animación') && data.originalTitle?.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/));
      const isOva = data.animeFormat === 'OVA' || (typeof data.duration === 'string' && data.duration.toLowerCase().includes('ova'));
      
      if (isAnime) {
        setType('anime');
        setAnimeInfo({
          format: isOva ? 'OVA' : data.animeFormat || 'Anime',
          episodes: data.episodesCount && data.episodesCount !== 'No aplica' ? data.episodesCount : undefined
        });
      } else {
        setAnimeInfo(null);
      }

      setHasAutofilled(true);

      const confidence = typeof data.confidence === 'number' ? data.confidence : 1.0;
      if (isAnime) {
        const episodeText = data.episodesCount && data.episodesCount !== 'No aplica' ? ` • ${data.episodesCount}` : '';
        const badgeText = isOva ? `🎬 ¡Anime OVA detectado! (${data.duration || 'OVA'}${episodeText})` : `🎌 ¡Anime detectado! (${data.animeFormat || 'Serie'}${episodeText})`;
        setAutofillSuccess(`${badgeText}. Datos técnicos y capítulos completados con éxito.`);
      } else if (confidence < 0.5) {
        setAutofillWarning(`Se completaron los datos con baja confianza (${Math.round(confidence * 100)}%), por favor revisa los campos.`);
      } else {
        setAutofillSuccess(`¡Ficha autocompletada por Gemini! (${Math.round(confidence * 100)}% de confianza). Puedes editar cualquier campo.`);
      }
    } catch (err: any) {
      console.warn('Autofill error:', err);
      setAutofillError(err.message || 'No fue posible autocompletar la ficha automáticamente. Puedes rellenar los datos manualmente.');
    } finally {
      setIsAutofilling(false);
    }
  };

  if (!isAddModalOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'poster' | 'backdrop') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (target === 'poster') {
            setPosterUrl(reader.result);
          } else {
            setBackdropUrl(reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      if (selectedGenres.length > 1) {
        setSelectedGenres(selectedGenres.filter((g) => g !== genre));
      }
    } else {
      setSelectedGenres([...selectedGenres, genre]);
    }
  };

  const handleAddCustomGenre = (e: React.FormEvent) => {
    e.preventDefault();
    if (customGenre.trim() && !selectedGenres.includes(customGenre.trim())) {
      setSelectedGenres([...selectedGenres, customGenre.trim()]);
      setCustomGenre('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Parse youtube ID if full URL
    let ytid = trailerUrl.trim();
    if (ytid.includes('v=')) {
      ytid = ytid.split('v=')[1].split('&')[0];
    } else if (ytid.includes('youtu.be/')) {
      ytid = ytid.split('youtu.be/')[1].split('?')[0];
    }

    const castArray = castInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const newId = addCustomMedia({
      title: title.trim(),
      originalTitle: originalTitle.trim() || title.trim(),
      type,
      year: Number(year) || new Date().getFullYear(),
      director: director.trim() || 'Director Desconocido',
      cast: castArray.length > 0 ? castArray : ['Elenco principal'],
      synopsis: synopsis.trim() || 'Película / Serie registrada por la comunidad.',
      duration: duration.trim() || '2h 00m',
      defaultPlatform,
      genres: selectedGenres,
      posterUrl,
      backdropUrl: backdropUrl || posterUrl,
      trailerYoutubeId: ytid
    });

    setIsAddModalOpen(false);
    setSelectedMediaId(newId);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        id="add-media-modal-container"
        className="relative w-full max-w-3xl bg-[#161618] border border-white/10 rounded-3xl overflow-hidden shadow-2xl my-auto text-slate-100 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 bg-[#0A0A0B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white font-bold">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-display font-bold text-white">
                Añadir Título al Catálogo
              </h2>
              <p className="text-xs text-slate-400">
                Como usuario o admin, incluye películas, series, animes o documentales con su carátula
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddModalOpen(false)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Main Info with AI Autofill */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase">
                  Título de la Película / Serie *
                </label>
                <button
                  type="button"
                  onClick={handleAutofill}
                  disabled={isAutofilling || title.trim().length < 2}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-rose-600/20 border border-amber-500/30 text-amber-300 hover:text-white hover:from-amber-500/30 hover:to-rose-600/30 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-all active:scale-95 shadow-sm"
                  title="Rellenar ficha técnica automáticamente con IA Gemini"
                >
                  {isAutofilling ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      <span>Buscando ficha con Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>✨ Autocompletar con IA</span>
                    </>
                  )}
                </button>
              </div>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isAutofilling && title.trim().length >= 2 && !hasAutofilled) {
                    e.preventDefault();
                    handleAutofill();
                  }
                }}
                placeholder="ej: Rurouni Kenshin Tsuiokuhen, FLCL, Hellsing..."
                className={`w-full bg-[#0A0A0B] border rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none transition-all ${
                  isAutofilling 
                    ? 'border-amber-500/60 ring-2 ring-amber-500/20 animate-pulse' 
                    : hasAutofilled
                    ? 'border-emerald-500/50 focus:border-rose-500'
                    : 'border-white/10 focus:border-rose-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Título Original (Opcional)
              </label>
              <input
                type="text"
                value={originalTitle}
                onChange={(e) => setOriginalTitle(e.target.value)}
                placeholder="ej: るろうに剣心 追憶編"
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* AI Status / Feedback Banners */}
          {isAutofilling && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-bold">Gemini AI:</span> Analizando ficha técnica, formato (OVA/Serie/Película), capítulos, director/estudio, duración y géneros para "{title.trim()}"...
              </div>
            </div>
          )}

          {autofillSuccess && !isAutofilling && (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span>{autofillSuccess}</span>
              </div>
              <button
                type="button"
                onClick={() => setAutofillSuccess(null)}
                className="text-emerald-400 hover:text-white p-1 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {autofillWarning && !isAutofilling && (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{autofillWarning}</span>
              </div>
              <button
                type="button"
                onClick={() => setAutofillWarning(null)}
                className="text-amber-400 hover:text-white p-1 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {autofillError && !isAutofilling && (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{autofillError}</span>
              </div>
              <button
                type="button"
                onClick={() => setAutofillError(null)}
                className="text-rose-400 hover:text-white p-1 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {title.trim().length >= 3 && !hasAutofilled && !isAutofilling && !autofillError && !autofillSuccess && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/5 text-[11px] text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>
                Consejo cinéfilo: Pulsa <strong className="text-amber-300">"✨ Autocompletar con IA"</strong> para que Gemini rellene automáticamente el director, actores, duración, géneros y sinopsis.
              </span>
            </div>
          )}

          {/* Type, Year, Platform, Duration */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Tipo
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MediaType)}
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none capitalize"
              >
                <option value="pelicula">Película</option>
                <option value="serie">Serie de TV</option>
                <option value="anime">Anime</option>
                <option value="documental">Documental</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Año
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || 2024)}
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Plataforma
              </label>
              <select
                value={defaultPlatform}
                onChange={(e) => setDefaultPlatform(e.target.value)}
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              >
                <option value="Netflix">Netflix</option>
                <option value="Max (HBO)">Max (HBO)</option>
                <option value="Prime Video">Prime Video</option>
                <option value="Disney+">Disney+</option>
                <option value="Apple TV+">Apple TV+</option>
                <option value="Crunchyroll">Crunchyroll</option>
                <option value="Cine / Sala de Cine">Cine / Sala</option>
                <option value="Otra">Otra</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Duración / Episodios
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder={type === 'anime' ? 'ej: OVA (6 eps) o 1 Temporada (12 eps)' : type === 'serie' ? 'ej: 3 Temporadas (24 eps)' : 'ej: 2h 15m'}
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Anime Format and Episode Detection Banner */}
          {type === 'anime' && (
            <div className="flex items-center flex-wrap gap-2 px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-300 animate-in fade-in duration-150">
              <span className="font-bold flex items-center gap-1.5">
                🎌 Formato Anime:
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-200 font-bold text-[11px] border border-purple-500/30">
                {animeInfo?.format || (duration.toLowerCase().includes('ova') ? 'OVA (Original Video Animation)' : 'Serie TV / Película')}
              </span>
              {animeInfo?.episodes && (
                <span className="px-2.5 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 font-semibold text-[11px]">
                  Capítulos: {animeInfo.episodes}
                </span>
              )}
              <span className="text-[11px] text-purple-300/80">
                • Detectado automáticamente (OVA, capítulos y estudio)
              </span>
            </div>
          )}

          {/* Director and Cast */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Director *
              </label>
              <input
                type="text"
                required
                value={director}
                onChange={(e) => setDirector(e.target.value)}
                placeholder="ej: Christopher Nolan, Denis Villeneuve..."
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                Reparto / Actores (separados por coma)
              </label>
              <input
                type="text"
                value={castInput}
                onChange={(e) => setCastInput(e.target.value)}
                placeholder="ej: Cillian Murphy, Emily Blunt, Matt Damon"
                className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Genres selection */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-2">
              Géneros (Selecciona al menos uno)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {Array.from(new Set([...AVAILABLE_GENRES, ...selectedGenres])).map((genre) => (
                <button
                  type="button"
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                    selectedGenres.includes(genre)
                      ? 'bg-rose-600 text-white border-rose-500 font-bold'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            {/* Add custom genre */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                value={customGenre}
                onChange={(e) => setCustomGenre(e.target.value)}
                placeholder="Añadir otro género personalizado..."
                className="bg-[#0A0A0B] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-rose-500 focus:outline-none w-64"
              />
              <button
                type="button"
                onClick={handleAddCustomGenre}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-rose-400 text-xs font-bold rounded-lg border border-white/10"
              >
                + Añadir
              </button>
            </div>
          </div>

          {/* Synopsis */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
              Sinopsis / Resumen de la trama
            </label>
            <textarea
              rows={3}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Describe brevemente de qué trata la historia..."
              className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
            />
          </div>

          {/* Carátula / Poster Image Section (User requested: poner la imgen de la caturla) */}
          <div className="p-4 rounded-2xl bg-[#0A0A0B] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-rose-400" />
                <span className="text-xs font-bold text-white uppercase">
                  Carátula / Poster & Fondo Cinemático
                </span>
              </div>

              {/* Tabs for Image upload methods */}
              <div className="flex items-center gap-1 bg-[#161618] p-0.5 rounded-lg border border-white/10 text-[11px]">
                <button
                  type="button"
                  onClick={() => setImageTab('url')}
                  className={`px-2 py-1 rounded-md ${imageTab === 'url' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400'}`}
                >
                  Enlace URL
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('upload')}
                  className={`px-2 py-1 rounded-md ${imageTab === 'upload' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400'}`}
                >
                  Subir Imagen
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('presets')}
                  className={`px-2 py-1 rounded-md ${imageTab === 'presets' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400'}`}
                >
                  Predefinidas
                </button>
              </div>
            </div>

            {/* Poster Preview and Inputs */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {/* Preview Box */}
              <div className="relative w-24 sm:w-28 aspect-[2/3] rounded-xl overflow-hidden bg-black/40 border-2 border-white/10 shadow-md flex-shrink-0">
                <img
                  src={posterUrl}
                  alt="Vista previa carátula"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Dynamic Image Input Mode */}
              <div className="flex-1 space-y-3 w-full">
                {imageTab === 'url' && (
                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        URL de la Carátula / Poster
                      </label>
                      <input
                        type="url"
                        value={posterUrl}
                        onChange={(e) => setPosterUrl(e.target.value)}
                        placeholder="https://ejemplo.com/poster.jpg"
                        className="w-full bg-[#161618] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        URL del Fondo Panorámico (Backdrop)
                      </label>
                      <input
                        type="url"
                        value={backdropUrl}
                        onChange={(e) => setBackdropUrl(e.target.value)}
                        placeholder="https://ejemplo.com/backdrop.jpg"
                        className="w-full bg-[#161618] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {imageTab === 'upload' && (
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-white/10 hover:border-rose-500/50 rounded-xl p-3 text-center transition-colors">
                      <Upload className="w-5 h-5 mx-auto text-rose-400 mb-1" />
                      <p className="text-xs text-slate-300 font-medium">Sube la carátula desde tu dispositivo</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'poster')}
                        className="mt-2 text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-rose-600 file:text-white cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                {imageTab === 'presets' && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SAMPLE_POSTER_PRESETS.map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        onClick={() => {
                          setPosterUrl(preset.url);
                          setBackdropUrl(preset.url);
                        }}
                        className="p-1.5 rounded-lg bg-[#161618] border border-white/10 hover:border-rose-500 text-left text-xs flex items-center gap-2"
                      >
                        <img src={preset.url} alt="" className="w-6 h-8 object-cover rounded" />
                        <span className="truncate text-[11px] text-slate-300">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* YouTube Trailer */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-rose-400" />
              ID o Enlace de Tráiler en YouTube (Opcional)
            </label>
            <input
              type="text"
              value={trailerUrl}
              onChange={(e) => setTrailerUrl(e.target.value)}
              placeholder="ej: Way9Dexny3w o https://youtube.com/watch?v=Way9Dexny3w"
              className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-900/30 active:scale-95 transition-all"
            >
              Publicar Título y Añadir a Mi Lista
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
