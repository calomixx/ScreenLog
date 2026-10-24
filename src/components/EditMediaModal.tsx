import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  Camera, 
  Upload, 
  Trash2, 
  RotateCcw, 
  Sparkles, 
  Film, 
  Tv, 
  Plus, 
  Check, 
  AlertCircle,
  Clock,
  Calendar,
  Globe,
  Tag,
  History,
  ShieldCheck,
  Undo2,
  Crown,
  Link as LinkIcon,
  Image as ImageIcon
} from 'lucide-react';
import { MediaItem, MediaType, CustomUserField } from '../types';
import { useMedia } from '../context/MediaContext';

const PRESET_GENRES = [
  'Acción', 'Aventura', 'Animación', 'Ciencia Ficción', 'Comedia', 
  'Crimen', 'Documental', 'Drama', 'Fantasía', 'Historia', 
  'Misterio', 'Romance', 'Suspense / Thriller', 'Terror', 'Bélico', 'Western'
];

const PRESET_PLATFORMS = [
  'Netflix', 'Max (HBO)', 'Prime Video', 'Disney+', 'Apple TV+', 
  'Star+', 'Paramount+', 'Crunchyroll', 'Cine / Sala de Cine', 'Blu-ray / Físico', 'YouTube'
];

const AGE_RATINGS = [
  'Apta para todo público',
  '+7 años',
  '+12 años',
  '+16 años',
  '+18 años (Adultos)'
];

export const EditMediaModal: React.FC = () => {
  const { 
    isEditMediaModalOpen, 
    setIsEditMediaModalOpen, 
    mediaToEdit, 
    updateMediaItem, 
    restoreMediaItem, 
    undoLastMediaChange,
    currentUser,
    showToast 
  } = useMedia();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [type, setType] = useState<MediaType>('pelicula');
  const [year, setYear] = useState<number>(2024);
  const [releaseDate, setReleaseDate] = useState('');
  const [duration, setDuration] = useState('2h 00m');
  const [seasonsCount, setSeasonsCount] = useState<number>(1);
  const [episodesCount, setEpisodesCount] = useState<number>(10);
  const [synopsis, setSynopsis] = useState('');
  const [director, setDirector] = useState('');
  const [country, setCountry] = useState('');
  const [language, setLanguage] = useState('Español');
  const [ageRating, setAgeRating] = useState('Apta para todo público');
  const [status, setStatus] = useState<'En emisión' | 'Finalizada' | 'Película'>('Película');
  const [defaultPlatform, setDefaultPlatform] = useState('Netflix');
  const [trailerYoutubeId, setTrailerYoutubeId] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [backdropUrl, setBackdropUrl] = useState('');

  // Lists
  const [genres, setGenres] = useState<string[]>([]);
  const [newGenreInput, setNewGenreInput] = useState('');
  const [cast, setCast] = useState<string[]>([]);
  const [newCastInput, setNewCastInput] = useState('');
  const [customFields, setCustomFields] = useState<CustomUserField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // UI state
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [imageInputMethod, setImageInputMethod] = useState<'url' | 'file'>('url');

  const isSuperOrAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  // Populate from mediaToEdit
  useEffect(() => {
    if (mediaToEdit && isEditMediaModalOpen) {
      setTitle(mediaToEdit.title || '');
      setOriginalTitle(mediaToEdit.originalTitle || mediaToEdit.title || '');
      setType(mediaToEdit.type || 'pelicula');
      setYear(mediaToEdit.year || new Date().getFullYear());
      setReleaseDate(mediaToEdit.releaseDate || '');
      setDuration(mediaToEdit.duration || '2h 00m');
      setSeasonsCount(mediaToEdit.seasonsCount || 1);
      setEpisodesCount(mediaToEdit.episodesCount || 8);
      setSynopsis(mediaToEdit.synopsis || '');
      setDirector(mediaToEdit.director || '');
      setCountry(mediaToEdit.country || '');
      setLanguage(mediaToEdit.language || 'Español');
      setAgeRating(mediaToEdit.ageRating || 'Apta para todo público');
      setStatus(mediaToEdit.status || (mediaToEdit.type === 'pelicula' ? 'Película' : 'Finalizada'));
      setDefaultPlatform(mediaToEdit.defaultPlatform || 'Netflix');
      setTrailerYoutubeId(mediaToEdit.trailerYoutubeId || '');
      setPosterUrl(mediaToEdit.posterUrl || '');
      setBackdropUrl(mediaToEdit.backdropUrl || mediaToEdit.posterUrl || '');
      setGenres(mediaToEdit.genres || []);
      setCast(mediaToEdit.cast || []);
      setCustomFields(mediaToEdit.customFields || []);
      setIsDirty(false);
      setShowDiscardConfirm(false);
      setErrors({});
    }
  }, [mediaToEdit, isEditMediaModalOpen]);

  if (!isEditMediaModalOpen || !mediaToEdit) return null;

  // Security check: only admin allowed
  if (currentUser?.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#161618] border border-rose-500/30 rounded-3xl p-6 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Zona Exclusiva de Administración</h3>
          <p className="text-xs text-slate-300">
            Esto solo lo puede tocar un admin 🙂. Si crees que hay un error, pide permisos a demon.
          </p>
          <button
            onClick={() => setIsEditMediaModalOpen(false)}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors"
          >
            Entendido, volver
          </button>
        </div>
      </div>
    );
  }

  // Handle Photo File Upload with Canvas Compression (400x600 max)
  const processImageFile = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Oye, sube una imagen en formato JPG, PNG o WebP 📷', 'warning');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Esa imagen pesa más de 2 MB. Prueba una más ligera para no saturar la memoria ⚡', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Standard poster ratio 400x600
        canvas.width = 400;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Cover crop centered
        const srcRatio = img.width / img.height;
        const targetRatio = 400 / 600;
        let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;

        if (srcRatio > targetRatio) {
          sWidth = img.height * targetRatio;
          sx = (img.width - sWidth) / 2;
        } else {
          sHeight = img.width / targetRatio;
          sy = (img.height - sHeight) / 2;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 400, 600);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

        setPosterUrl(compressedDataUrl);
        setIsDirty(true);
        showToast('¡Portada actualizada y optimizada para el catálogo! 🎬', 'success');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      setIsEditMediaModalOpen(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) {
      newErrors.title = 'El título de la obra no puede estar vacío ✍️';
    }
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1888 || year > currentYear + 5) {
      newErrors.year = `Oye, ese año no parece real 🤔 (debe ser entre 1888 y ${currentYear + 5})`;
    }
    if (type === 'serie' && seasonsCount < 1) {
      newErrors.seasons = 'Las temporadas deben ser al menos 1';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      showToast('Revisa los avisos en el formulario antes de guardar 🙂', 'warning');
      return;
    }

    const updatedItem: MediaItem = {
      ...mediaToEdit,
      title: title.trim(),
      originalTitle: originalTitle.trim() || title.trim(),
      type,
      year: Number(year),
      releaseDate: releaseDate.trim() || undefined,
      duration: type === 'pelicula' ? duration.trim() : `${seasonsCount} Temp. (${episodesCount} eps)`,
      seasonsCount: type === 'serie' ? Number(seasonsCount) : undefined,
      episodesCount: type === 'serie' ? Number(episodesCount) : undefined,
      synopsis: synopsis.trim(),
      director: director.trim() || 'Director Desconocido',
      country: country.trim() || undefined,
      language: language.trim() || undefined,
      ageRating,
      status: type === 'pelicula' ? 'Película' : status,
      defaultPlatform,
      trailerYoutubeId: trailerYoutubeId.trim() || undefined,
      posterUrl: posterUrl.trim() || mediaToEdit.posterUrl,
      backdropUrl: backdropUrl.trim() || posterUrl.trim() || mediaToEdit.backdropUrl,
      genres: genres.length > 0 ? genres : ['Drama'],
      cast: cast.length > 0 ? cast : ['Elenco principal'],
      customFields
    };

    const res = updateMediaItem(updatedItem, 'Edición desde ficha de admin');
    if (res.success) {
      setIsDirty(false);
      setIsEditMediaModalOpen(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setIsDirty(true);
    if (genres.includes(genre)) {
      setGenres(genres.filter((g) => g !== genre));
    } else {
      setGenres([...genres, genre]);
    }
  };

  const handleAddCustomGenre = () => {
    const trimmed = newGenreInput.trim();
    if (trimmed && !genres.includes(trimmed)) {
      setGenres([...genres, trimmed]);
      setNewGenreInput('');
      setIsDirty(true);
    }
  };

  const handleAddCastMember = () => {
    const trimmed = newCastInput.trim();
    if (trimmed && !cast.includes(trimmed)) {
      setCast([...cast, trimmed]);
      setNewCastInput('');
      setIsDirty(true);
    }
  };

  const handleRemoveCast = (actor: string) => {
    setCast(cast.filter((a) => a !== actor));
    setIsDirty(true);
  };

  const handleAddCustomField = () => {
    if (!newFieldLabel.trim() || !newFieldValue.trim()) return;
    if (customFields.length >= 15) {
      showToast('Alcanzaste el límite de 15 datos personalizados para este título', 'warning');
      return;
    }
    setCustomFields([
      ...customFields,
      {
        id: `field-${Date.now()}`,
        label: newFieldLabel.trim(),
        value: newFieldValue.trim()
      }
    ]);
    setNewFieldLabel('');
    setNewFieldValue('');
    setIsDirty(true);
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(customFields.filter((f) => f.id !== id));
    setIsDirty(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        id="edit-media-modal-container"
        className="relative w-full max-w-4xl bg-[#141416] border border-white/10 rounded-3xl overflow-hidden shadow-2xl text-slate-100 flex flex-col max-h-[92vh] my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#0A0A0B] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-bold text-[10px] uppercase tracking-wider">
                  Modo Admin
                </span>
                <span className="text-xs text-slate-400">demon (Administrador)</span>
              </div>
              <h2 className="text-lg sm:text-xl font-display font-extrabold text-white truncate max-w-md">
                Editar Ficha: {mediaToEdit.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {mediaToEdit.editHistory && mediaToEdit.editHistory.length > 0 && (
              <button
                type="button"
                onClick={() => undoLastMediaChange(mediaToEdit.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-400 text-xs font-semibold border border-white/10 transition-colors"
                title="Deshacer el último cambio registrado"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Deshacer cambio</span>
              </button>
            )}
            <button
              onClick={handleClose}
              aria-label="Cerrar editor"
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
              title="Cerrar editor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* Section 1: Portada y Datos Principales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Poster and Image Management Column */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Póster / Carátula
                </label>
                <div className="flex items-center gap-1 bg-[#0A0A0B] p-0.5 rounded-lg border border-white/10 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setImageInputMethod('url')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 ${
                      imageInputMethod === 'url' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LinkIcon className="w-2.5 h-2.5" />
                    Por URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageInputMethod('file')}
                    className={`px-2 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 ${
                      imageInputMethod === 'file' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Upload className="w-2.5 h-2.5" />
                    Archivo
                  </button>
                </div>
              </div>

              {/* Poster Preview Box */}
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDraggingPhoto(true); }}
                onDragLeave={() => setIsDraggingPhoto(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingPhoto(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processImageFile(e.dataTransfer.files[0]);
                  }
                }}
                className={`relative aspect-[2/3] w-full rounded-2xl overflow-hidden border-2 transition-all flex flex-col items-center justify-center bg-[#0A0A0B] group ${
                  isDraggingPhoto 
                    ? 'border-rose-500 bg-rose-500/10 scale-[1.02]' 
                    : 'border-white/10 hover:border-rose-500/40'
                }`}
              >
                {posterUrl ? (
                  <>
                    <img
                      src={posterUrl}
                      alt={title || 'Póster'}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => setImageInputMethod('url')}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <LinkIcon className="w-3.5 h-3.5" />
                        <span>Editar por URL</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        <span>Subir archivo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPosterUrl('');
                          setIsDirty(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-600/30 text-rose-300 text-xs font-semibold transition-all"
                      >
                        Quitar portada
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-4 text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                      {imageInputMethod === 'url' ? <LinkIcon className="w-6 h-6 text-rose-400" /> : <Upload className="w-6 h-6 text-slate-400" />}
                    </div>
                    <p className="text-xs font-semibold text-white">
                      {imageInputMethod === 'url' ? 'Pega la URL de la imagen abajo' : 'Arrastra una imagen aquí'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {imageInputMethod === 'url' ? 'TMDb, IMDb, Crunchyroll, etc.' : 'JPG, PNG o WebP (máx. 2 MB)'}
                    </p>
                    {imageInputMethod === 'file' && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold transition-colors"
                      >
                        Subir archivo
                      </button>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processImageFile(e.target.files[0]);
                    }
                  }}
                />
              </div>

              {/* Apartado Especial para Administrador / Super User: Configurar Imagen por URL */}
              {imageInputMethod === 'url' ? (
                <div className="p-3.5 rounded-2xl bg-[#0A0A0B] border border-rose-500/30 shadow-lg shadow-rose-950/20 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                      <LinkIcon className="w-3.5 h-3.5 text-rose-400" />
                      <span>Apartado de Imágenes por URL</span>
                    </div>
                    {isSuperOrAdmin && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <Crown className="w-2.5 h-2.5" /> Super User
                      </span>
                    )}
                  </div>

                  {/* Campo URL Póster */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>URL del Póster (Vertical):</span>
                      {posterUrl ? (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Conectada
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-semibold">Requerida</span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={posterUrl}
                        onChange={(e) => {
                          setPosterUrl(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="https://image.tmdb.org/... o enlace de carátula"
                        className="w-full bg-[#141416] border border-white/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none pr-8 transition-all"
                      />
                      {posterUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setPosterUrl('');
                            setIsDirty(true);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                          title="Limpiar enlace"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Campo URL Fondo Cinemático */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                      <span>URL Fondo Cinemático / Backdrop:</span>
                      {backdropUrl && (
                        <span className="text-[10px] text-sky-400 font-semibold flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Conectado
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={backdropUrl}
                        onChange={(e) => {
                          setBackdropUrl(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="https://... imagen horizontal para fondo"
                        className="w-full bg-[#141416] border border-white/10 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none pr-8 transition-all"
                      />
                      {backdropUrl && (
                        <button
                          type="button"
                          onClick={() => {
                            setBackdropUrl('');
                            setIsDirty(true);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                          title="Limpiar enlace"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 leading-normal">
                    Como Super User / Administrador puedes pegar enlaces directos de TMDb, IMDb, Crunchyroll, MyAnimeList o FilmAffinity para actualizar la carátula sin descargar archivos.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-[#0A0A0B] border border-white/10 space-y-2">
                  <p className="text-[11px] text-slate-400 text-center">
                    Arrastra una imagen o pulsa para subir archivo desde tu ordenador.
                  </p>
                  <button
                    type="button"
                    onClick={() => setImageInputMethod('url')}
                    className="w-full py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-rose-400 text-xs font-semibold border border-white/10 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LinkIcon className="w-3 h-3" />
                    Cambiar al apartado de URL
                  </button>
                </div>
              )}
            </div>

            {/* Main Metadata Fields */}
            <div className="md:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Título Visible *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setIsDirty(true);
                      if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
                    }}
                    placeholder="Ej. Oppenheimer"
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                  />
                  {errors.title && (
                    <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.title}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Título Original
                  </label>
                  <input
                    type="text"
                    value={originalTitle}
                    onChange={(e) => {
                      setOriginalTitle(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Ej. Oppenheimer"
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Type, Year, Duration/Seasons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Tipo de Obra
                  </label>
                  <select
                    value={type}
                    onChange={(e) => {
                      const newType = e.target.value as MediaType;
                      setType(newType);
                      setIsDirty(true);
                      if (newType === 'pelicula') {
                        setStatus('Película');
                      } else if (status === 'Película') {
                        setStatus('En emisión');
                      }
                    }}
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                  >
                    <option value="pelicula">🎬 Película</option>
                    <option value="serie">📺 Serie</option>
                    <option value="anime">⛩️ Anime</option>
                    <option value="documental">🌍 Documental</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Año de Estreno *
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => {
                      setYear(parseInt(e.target.value) || 0);
                      setIsDirty(true);
                      if (errors.year) setErrors((prev) => ({ ...prev, year: '' }));
                    }}
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                  />
                  {errors.year && (
                    <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" /> {errors.year}
                    </p>
                  )}
                </div>

                <div>
                  {type === 'pelicula' ? (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                        Duración
                      </label>
                      <input
                        type="text"
                        value={duration}
                        onChange={(e) => {
                          setDuration(e.target.value);
                          setIsDirty(true);
                        }}
                        placeholder="Ej. 2h 45m"
                        className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                        Temporadas y Episodios
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          value={seasonsCount}
                          onChange={(e) => {
                            setSeasonsCount(parseInt(e.target.value) || 1);
                            setIsDirty(true);
                          }}
                          className="w-1/2 bg-[#0A0A0B] border border-white/10 rounded-xl px-2.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                          title="Temporadas"
                        />
                        <input
                          type="number"
                          min="1"
                          value={episodesCount}
                          onChange={(e) => {
                            setEpisodesCount(parseInt(e.target.value) || 1);
                            setIsDirty(true);
                          }}
                          className="w-1/2 bg-[#0A0A0B] border border-white/10 rounded-xl px-2.5 py-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                          title="Episodios totales"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Director & Plataforma */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Dirección / Creación
                  </label>
                  <input
                    type="text"
                    value={director}
                    onChange={(e) => {
                      setDirector(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Ej. Christopher Nolan"
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Plataforma Principal
                  </label>
                  <select
                    value={defaultPlatform}
                    onChange={(e) => {
                      setDefaultPlatform(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                  >
                    {PRESET_PLATFORMS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status & Clasificación por edad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {type !== 'pelicula' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                      Estado en el Sistema
                    </label>
                    <select
                      value={status}
                      onChange={(e) => {
                        setStatus(e.target.value as any);
                        setIsDirty(true);
                      }}
                      className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                    >
                      <option value="En emisión">🟢 En emisión</option>
                      <option value="Finalizada">🏁 Finalizada</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Clasificación de Edad
                  </label>
                  <select
                    value={ageRating}
                    onChange={(e) => {
                      setAgeRating(e.target.value);
                      setIsDirty(true);
                    }}
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
                  >
                    {AGE_RATINGS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* YouTube Trailer ID */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  ID o Enlace de YouTube para el Tráiler
                </label>
                <input
                  type="text"
                  value={trailerYoutubeId}
                  onChange={(e) => {
                    let val = e.target.value.trim();
                    if (val.includes('v=')) {
                      val = val.split('v=')[1].split('&')[0];
                    } else if (val.includes('youtu.be/')) {
                      val = val.split('youtu.be/')[1].split('?')[0];
                    }
                    setTrailerYoutubeId(val);
                    setIsDirty(true);
                  }}
                  placeholder="Ej. uYPbbksJxIg o https://www.youtube.com/watch?v=..."
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Sinopsis con Contador */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Sinopsis de la Obra
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {synopsis.length} caracteres
              </span>
            </div>
            <textarea
              rows={4}
              value={synopsis}
              onChange={(e) => {
                setSynopsis(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Escribe la trama o descripción completa para el catálogo..."
              className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-3.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Section 3: Géneros (Chips interactivos) */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Géneros Cinematográficos (Haz clic para activar o quitar)
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_GENRES.map((g) => {
                const active = genres.includes(g);
                return (
                  <button
                    type="button"
                    key={g}
                    onClick={() => toggleGenre(g)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      active
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950/40'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {active && <Check className="w-3 h-3 inline mr-1" />}
                    {g}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2 max-w-sm pt-1">
              <input
                type="text"
                value={newGenreInput}
                onChange={(e) => setNewGenreInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomGenre();
                  }
                }}
                placeholder="Añadir otro subgénero..."
                className="flex-1 bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomGenre}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white text-xs font-bold transition-colors"
              >
                + Añadir
              </button>
            </div>
          </div>

          {/* Section 4: Reparto Principal (Chips de Actores) */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
              Reparto Principal (Actores y Elenco)
            </label>
            <div className="flex flex-wrap gap-2">
              {cast.map((actor) => (
                <span
                  key={actor}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white"
                >
                  <span>{actor}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCast(actor)}
                    className="hover:text-rose-400 font-bold ml-1 text-slate-400"
                    title="Quitar actor"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 max-w-sm pt-1">
              <input
                type="text"
                value={newCastInput}
                onChange={(e) => setNewCastInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCastMember();
                  }
                }}
                placeholder="Nombre del actor/actriz..."
                className="flex-1 bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCastMember}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-rose-600 text-white text-xs font-bold transition-colors"
              >
                + Añadir
              </button>
            </div>
          </div>

          {/* Section 5: Datos Personalizados Libres */}
          <div className="p-4 rounded-2xl bg-[#0A0A0B] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Campos Personalizados del Título
                </h4>
                <p className="text-[11px] text-slate-400">
                  Añade información extra (ej. "Presupuesto", "Premios Oscar", "Productora", "Curiosidad")
                </p>
              </div>
              <span className="text-[11px] text-slate-400">{customFields.length} / 15</span>
            </div>

            {customFields.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {customFields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-rose-400 block">{field.label}</span>
                      <span className="text-white font-medium">{field.value}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(field.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Eliminar campo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Etiqueta (ej. Premios)"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                className="w-full sm:w-1/3 bg-[#161618] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Valor (ej. 7 premios Oscar)"
                value={newFieldValue}
                onChange={(e) => setNewFieldValue(e.target.value)}
                className="w-full sm:flex-1 bg-[#161618] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddCustomField}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600 text-rose-300 hover:text-white text-xs font-bold transition-colors"
              >
                + Añadir dato
              </button>
            </div>
          </div>

          {/* Section 6: Restauración de Datos Originales */}
          <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-slate-400">
              {mediaToEdit.lastEditedBy && (
                <span className="flex items-center gap-1.5 text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Editado por {mediaToEdit.lastEditedBy} · {mediaToEdit.lastEditedAt}
                </span>
              )}
            </div>

            {showConfirmRestore ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-amber-300 font-semibold">¿Restaurar originales?</span>
                <button
                  type="button"
                  onClick={() => {
                    restoreMediaItem(mediaToEdit.id);
                    setIsEditMediaModalOpen(false);
                    setShowConfirmRestore(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors"
                >
                  Sí, restaurar
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmRestore(false)}
                  className="px-2 py-1 text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowConfirmRestore(true)}
                className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 text-xs font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar datos originales de fábrica</span>
              </button>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3 sticky bottom-0 bg-[#141416]/95 py-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-950/40 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Guardar cambios</span>
            </button>
          </div>
        </form>

        {/* Discard changes confirmation dialog */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-sm w-full bg-[#161618] border border-white/15 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">¿Descartamos los cambios?</h3>
              <p className="text-xs text-slate-300">
                Tienes modificaciones sin guardar en esta ficha. Si sales ahora se perderán.
              </p>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors"
                >
                  Seguir editando
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    setIsEditMediaModalOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
                >
                  Sí, descartar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
