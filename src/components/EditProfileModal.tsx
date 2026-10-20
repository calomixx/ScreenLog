import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Camera, 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Check, 
  Plus, 
  Trash2, 
  Save, 
  Film, 
  Globe, 
  Heart, 
  Tv, 
  User, 
  AtSign, 
  MapPin, 
  FileText
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { CustomUserField, UserProfile } from '../types';

const AVATAR_PRESETS = [
  { id: '1', name: 'Director', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80' },
  { id: '2', name: 'Crítica', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80' },
  { id: '3', name: 'Cinéfilo', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=200&q=80' },
  { id: '4', name: 'Analista', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80' },
  { id: '5', name: 'Guionista', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80' },
  { id: '6', name: 'Cineasta', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80' },
  { id: '7', name: 'DocuMaker', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80' }
];

const AVAILABLE_GENRES = [
  'Ciencia Ficción', 'Drama', 'Acción', 'Terror / Suspense', 
  'Comedia', 'Thriller', 'Romance', 'Animación', 'Aventura', 'Documental', 'Fantasía', 'Misterio'
];

const POPULAR_PLATFORMS = [
  'Netflix', 'Max (HBO)', 'Prime Video', 'Disney+', 'Apple TV+', 'Crunchyroll', 'Cine / Sala', 'MUBI', 'Filmin'
];

const SUGGESTED_CUSTOM_FIELDS = [
  'Película favorita de siempre',
  'Director de cabecera',
  'Actor / Actriz predilecta',
  'Snack de cine infaltable',
  'Banda sonora favorita',
  'Serie más recomendada'
];

export const EditProfileModal: React.FC = () => {
  const { 
    currentUser, 
    isEditProfileModalOpen, 
    setIsEditProfileModalOpen, 
    updateUserProfile,
    showToast 
  } = useMedia();

  const [activeTab, setActiveTab] = useState<'info' | 'foto' | 'gustos' | 'personalizado'>('info');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [avatar, setAvatar] = useState('');
  const [favoriteGenres, setFavoriteGenres] = useState<string[]>([]);
  const [newGenreInput, setNewGenreInput] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [letterboxd, setLetterboxd] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [customFields, setCustomFields] = useState<CustomUserField[]>([]);
  const [customPhotoUploadStatus, setCustomPhotoUploadStatus] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever modal opens or currentUser changes
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setUsername(currentUser.username || '');
      setBio(currentUser.bio || '');
      setCity(currentUser.city || '');
      setAvatar(currentUser.avatar || AVATAR_PRESETS[0].url);
      setFavoriteGenres(currentUser.favoriteGenres || ['Ciencia Ficción', 'Drama']);
      setPlatforms(currentUser.platforms || ['Netflix', 'Prime Video']);
      setLetterboxd(currentUser.socialLinks?.letterboxd || '');
      setInstagram(currentUser.socialLinks?.instagram || '');
      setTwitter(currentUser.socialLinks?.twitter || '');
      setCustomFields(
        currentUser.customFields && currentUser.customFields.length > 0
          ? [...currentUser.customFields]
          : [
              { id: '1', label: 'Película favorita de siempre', value: '' },
              { id: '2', label: 'Snack de cine infaltable', value: '' }
            ]
      );
      setCustomPhotoUploadStatus(null);
    }
  }, [currentUser, isEditProfileModalOpen]);

  if (!isEditProfileModalOpen || !currentUser) return null;

  // Handle local device photo upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP)', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('La imagen es algo pesada (máx 5MB). Intenta con una más ligera', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      if (result) {
        setAvatar(result);
        setCustomPhotoUploadStatus(`¡Foto cargada desde tu equipo! (${file.name})`);
        showToast('Foto cargada correctamente. Recuerda guardar los cambios', 'success');
      }
    };
    reader.onerror = () => {
      showToast('No se pudo leer la imagen seleccionada', 'warning');
    };
    reader.readAsDataURL(file);
  };

  const handleToggleGenre = (genre: string) => {
    setFavoriteGenres(prev => 
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const handleAddCustomGenre = () => {
    const trimmed = newGenreInput.trim();
    if (trimmed && !favoriteGenres.includes(trimmed)) {
      setFavoriteGenres(prev => [...prev, trimmed]);
      setNewGenreInput('');
    }
  };

  const handleTogglePlatform = (platform: string) => {
    setPlatforms(prev => 
      prev.includes(platform) ? prev.filter(p => p !== platform) : [...prev, platform]
    );
  };

  const handleAddCustomField = (suggestedLabel?: string) => {
    const newField: CustomUserField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      label: suggestedLabel || '',
      value: ''
    };
    setCustomFields(prev => [...prev, newField]);
  };

  const handleUpdateCustomField = (id: string, key: 'label' | 'value', val: string) => {
    setCustomFields(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));
  };

  const handleRemoveCustomField = (id: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('El nombre no puede estar vacío', 'warning');
      return;
    }

    // Clean up empty custom fields
    const validCustomFields = customFields.filter(f => f.label.trim() || f.value.trim());

    updateUserProfile({
      name: name.trim(),
      username: username.trim() || name.trim().toLowerCase().replace(/\s+/g, '_'),
      bio: bio.trim(),
      city: city.trim(),
      avatar: avatar.trim(),
      favoriteGenres,
      platforms,
      socialLinks: {
        letterboxd: letterboxd.trim(),
        instagram: instagram.trim(),
        twitter: twitter.trim()
      },
      customFields: validCustomFields
    });

    setIsEditProfileModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        id="edit-profile-modal-container"
        className="relative w-full max-w-2xl bg-[#161618] border border-white/10 rounded-3xl overflow-hidden shadow-2xl my-auto text-slate-100 flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="relative px-6 py-5 border-b border-white/10 bg-[#0A0A0B] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={avatar || AVATAR_PRESETS[0].url} 
                alt="Avatar" 
                className="w-12 h-12 rounded-2xl object-cover border-2 border-rose-500 shadow-lg shadow-rose-950/40"
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={() => {
                  setActiveTab('foto');
                  fileInputRef.current?.click();
                }}
                className="absolute -bottom-1 -right-1 p-1 bg-rose-600 hover:bg-rose-500 rounded-full text-white text-[10px] shadow"
                title="Cambiar foto"
              >
                <Camera className="w-3 h-3" />
              </button>
            </div>
            <div>
              <h3 className="text-lg font-display font-black text-white flex items-center gap-2">
                Personaliza tu Perfil Cinéfilo
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-xs text-slate-400">
                Añade tu foto, tus gustos y todo lo que te hace único como amante del cine
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditProfileModalOpen(false)}
            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-[#121214] px-6 gap-2 overflow-x-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'info' 
                ? 'border-rose-500 text-rose-400 font-bold' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Datos Básicos
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('foto')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'foto' 
                ? 'border-rose-500 text-rose-400 font-bold' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            Mi Foto
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gustos')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'gustos' 
                ? 'border-rose-500 text-rose-400 font-bold' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            Gustos & Plataformas
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('personalizado')}
            className={`py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'personalizado' 
                ? 'border-rose-500 text-rose-400 font-bold' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Más sobre mí ({customFields.length})
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: DATOS BÁSICOS */}
          {activeTab === 'info' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-rose-400" />
                    Nombre o Apodo Cinéfilo
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ej: Miguel Torrealba"
                    required
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
                    <AtSign className="w-3.5 h-3.5 text-rose-400" />
                    Usuario / Alias
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ej: cinemaniaco_01"
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                  Sobre mí / Bio Cinéfila
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Escribe lo que quieras: qué películas te obsesionan, tu director preferido, si prefieres sala o sofá..."
                  rows={3}
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  Ciudad o País (opcional)
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="ej: Madrid, Buenos Aires, Ciudad de México..."
                  className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Redes sociales */}
              <div className="pt-2 border-t border-white/5 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Redes Cinéfilas (opcional)
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Letterboxd</span>
                    <input
                      type="text"
                      value={letterboxd}
                      onChange={(e) => setLetterboxd(e.target.value)}
                      placeholder="@usuario o link"
                      className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Instagram</span>
                    <input
                      type="text"
                      value={instagram}
                      onChange={(e) => setInstagram(e.target.value)}
                      placeholder="@usuario"
                      className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block mb-1">Twitter / X</span>
                    <input
                      type="text"
                      value={twitter}
                      onChange={(e) => setTwitter(e.target.value)}
                      placeholder="@usuario"
                      className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MI FOTO (SUBIR DESDE EL DISPOSITIVO, PRESETS O URL) */}
          {activeTab === 'foto' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Preview and Device Upload */}
              <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row items-center gap-5">
                <div className="relative group">
                  <img 
                    src={avatar || AVATAR_PRESETS[0].url} 
                    alt="Foto actual" 
                    className="w-24 h-24 rounded-3xl object-cover ring-4 ring-rose-500/50 shadow-xl shadow-rose-950/40"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <h4 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-2">
                    <Upload className="w-4 h-4 text-rose-400" />
                    Sube tu propia foto desde tu dispositivo
                  </h4>
                  <p className="text-xs text-slate-400">
                    Elige una foto de tu teléfono o computadora. Se guardará de inmediato en tu perfil.
                  </p>
                  
                  <div className="pt-1 flex flex-wrap gap-2 justify-center sm:justify-start">
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden" 
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-md shadow-rose-900/30 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Seleccionar foto del equipo
                    </button>
                    {customPhotoUploadStatus && (
                      <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold self-center">
                        <Check className="w-3.5 h-3.5" />
                        {customPhotoUploadStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Option B: Preset Avatars */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-300 uppercase">
                  O elige uno de nuestros avatares cinéfilos:
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
                  {AVATAR_PRESETS.map((p) => {
                    const isSelected = avatar === p.url;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setAvatar(p.url);
                          setCustomPhotoUploadStatus(null);
                        }}
                        className={`group relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all ${
                          isSelected 
                            ? 'bg-rose-600/20 border-rose-500 ring-2 ring-rose-500/50' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="relative">
                          <img 
                            src={p.url} 
                            alt={p.name} 
                            className="w-12 h-12 rounded-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                          {isSelected && (
                            <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-rose-600 rounded-full flex items-center justify-center text-white text-[9px] shadow">
                              <Check className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-300 truncate font-medium">
                          {p.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Option C: Image URL */}
              <div className="space-y-1.5 pt-2 border-t border-white/5">
                <label className="block text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  O escribe el enlace (URL) de una imagen
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={avatar.startsWith('data:') ? '' : avatar}
                    onChange={(e) => {
                      setAvatar(e.target.value);
                      setCustomPhotoUploadStatus(null);
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 bg-[#0A0A0B] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                  />
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar(AVATAR_PRESETS[0].url)}
                      className="px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/5 rounded-xl border border-white/10"
                    >
                      Restablecer
                    </button>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: GUSTOS Y PLATAFORMAS */}
          {activeTab === 'gustos' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Géneros favoritos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-400" />
                    Tus Géneros Favoritos
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {favoriteGenres.length} seleccionados
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set([...AVAILABLE_GENRES, ...favoriteGenres])).map((genre) => {
                    const isSelected = favoriteGenres.includes(genre);
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => handleToggleGenre(genre)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                          isSelected
                            ? 'bg-rose-600 text-white border-rose-500 font-bold shadow-md shadow-rose-950/40'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {genre}
                      </button>
                    );
                  })}
                </div>

                {/* Add custom genre */}
                <div className="flex items-center gap-2 pt-1">
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
                    placeholder="¿Falta algún género? Escríbelo aquí..."
                    className="flex-1 bg-[#0A0A0B] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomGenre}
                    disabled={!newGenreInput.trim()}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs font-bold text-white transition-colors"
                  >
                    + Añadir
                  </button>
                </div>
              </div>

              {/* Streaming Platforms */}
              <div className="space-y-3 pt-3 border-t border-white/5">
                <label className="block text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                  <Tv className="w-3.5 h-3.5 text-rose-400" />
                  ¿Dónde sueles ver películas y series?
                </label>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_PLATFORMS.map((plat) => {
                    const isSelected = platforms.includes(plat);
                    return (
                      <button
                        key={plat}
                        type="button"
                        onClick={() => handleTogglePlatform(plat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md shadow-amber-950/40'
                            : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {plat}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: MÁS SOBRE MÍ (CAMPOS PERSONALIZADOS ILIMITADOS) */}
          {activeTab === 'personalizado' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-1.5">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Libertad total: añade lo que quieras a tu perfil
                </h4>
                <p className="text-xs text-slate-400">
                  ¿Tu director de culto? ¿Tu frase favorita de cine? ¿El snack que nunca puede faltar? 
                  Añade tantos datos como desees para compartir con la comunidad.
                </p>
              </div>

              {/* Quick suggestions */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Ideas sugeridas para inspirarte:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_CUSTOM_FIELDS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => handleAddCustomField(suggestion)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3 text-rose-400" />
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom fields list */}
              <div className="space-y-3 pt-2">
                {customFields.map((field, idx) => (
                  <div 
                    key={field.id}
                    className="p-3 rounded-2xl bg-[#0A0A0B] border border-white/10 space-y-2 group hover:border-white/20 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase font-bold text-rose-400">
                        Dato #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(field.id)}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-white/5 transition-colors"
                        title="Eliminar campo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Pregunta / Etiqueta
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => handleUpdateCustomField(field.id, 'label', e.target.value)}
                          placeholder="ej: Director preferido"
                          className="w-full bg-[#161618] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">
                          Tu respuesta
                        </label>
                        <input
                          type="text"
                          value={field.value}
                          onChange={(e) => handleUpdateCustomField(field.id, 'value', e.target.value)}
                          placeholder="ej: Denis Villeneuve"
                          className="w-full bg-[#161618] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => handleAddCustomField()}
                  className="w-full py-2.5 rounded-xl border border-dashed border-white/20 hover:border-rose-500/50 text-slate-300 hover:text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 bg-white/[0.01] hover:bg-rose-500/5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Añadir otro dato personalizado a mi perfil
                </button>
              </div>

            </div>
          )}

          {/* Footer Save & Cancel Buttons */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setIsEditProfileModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-950/40 flex items-center gap-2 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" />
              Guardar Cambios
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
