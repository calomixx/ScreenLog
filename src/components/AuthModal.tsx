import React, { useState, useRef } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Lock, 
  Sparkles, 
  Film, 
  Eye, 
  EyeOff, 
  Check, 
  ShieldCheck, 
  Star,
  Clapperboard,
  Tv,
  HeartHandshake,
  LogIn,
  UserPlus,
  ArrowRight,
  KeyRound,
  ShieldAlert,
  Upload,
  Camera
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { DEMO_USERS } from '../context/MediaContext';

const AVATAR_PRESETS = [
  { id: '1', name: 'Director', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80' },
  { id: '2', name: 'Crítica', url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80' },
  { id: '3', name: 'Cinéfilo', url: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80' },
  { id: '4', name: 'Analista', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80' },
  { id: '5', name: 'Guionista', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80' },
  { id: '6', name: 'Cineasta', url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80' },
];

const GENRE_OPTIONS = [
  'Ciencia Ficción', 'Drama', 'Acción', 'Terror / Suspense', 
  'Comedia', 'Thriller', 'Romance', 'Animación', 'Aventura', 'Documental'
];

export const AuthModal: React.FC = () => {
  const { 
    isAuthModalOpen, 
    closeAuthModal, 
    authModalMode, 
    openAuthModal, 
    login, 
    register,
    usersList 
  } = useMedia();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(authModalMode);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [selectedDemoUser, setSelectedDemoUser] = useState<typeof DEMO_USERS[0] | null>(null);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'user' | 'critic'>('user');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_PRESETS[0].url);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['Ciencia Ficción', 'Drama']);
  const [regBio, setRegBio] = useState('');
  const [regError, setRegError] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const regFileInputRef = useRef<HTMLInputElement>(null);

  // Sync activeTab when authModalMode changes externally
  React.useEffect(() => {
    setActiveTab(authModalMode);
    setLoginError('');
    setRegError('');
  }, [authModalMode, isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail.trim()) {
      setLoginError('Escribe tu correo o usuario para continuar.');
      return;
    }
    if (!loginPassword.trim()) {
      setLoginError('Escribe tu clave secreta para entrar.');
      passwordInputRef.current?.focus();
      return;
    }

    const result = login(loginEmail, loginPassword);
    if (!result.success) {
      setLoginError(result.message || 'Esa clave o usuario no encaja 🤔 ¿Lo escribimos otra vez?');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regName.trim()) {
      setRegError('Escribe tu nombre o alias cinéfilo.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setRegError('Por favor ingresa un correo electrónico válido.');
      return;
    }
    if (!regPassword.trim() || regPassword.length < 4) {
      setRegError('Elige una clave de al menos 4 caracteres que puedas recordar.');
      return;
    }

    const result = register({
      name: regName.trim(),
      email: regEmail.trim(),
      password: regPassword.trim(),
      avatar: customAvatarUrl.trim() || selectedAvatar,
      role: regRole,
      favoriteGenres: selectedGenres,
      bio: regBio.trim() || 'Amante del cine compartiendo reseñas en ScreenLog.'
    });

    if (!result.success) {
      setRegError(result.message || 'No se pudo crear la cuenta. Intenta de nuevo.');
    }
  };

  const handleSelectDemoUser = (demo: typeof DEMO_USERS[0]) => {
    setActiveTab('login');
    setSelectedDemoUser(demo);
    setLoginEmail(demo.email);
    setLoginPassword('');
    setLoginError('');
    
    // Focus password field with prompt
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 100);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => 
      prev.includes(genre) 
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    );
  };

  const handleRegPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvt) => {
      const b64 = uploadEvt.target?.result as string;
      if (b64) {
        setCustomAvatarUrl(b64);
        setUploadedFileName(file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div 
        id="auth-modal-container"
        className="relative w-full max-w-lg bg-[#161618] border border-white/10 rounded-3xl overflow-hidden shadow-2xl my-auto text-slate-100 flex flex-col max-h-[94vh]"
      >
        {/* Header with glowing gradient */}
        <div className="relative px-6 py-6 border-b border-white/10 bg-[#0A0A0B] overflow-hidden">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-rose-600 text-white font-bold shadow-lg shadow-rose-600/30">
                <Clapperboard className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-display font-black text-white tracking-tight flex items-center gap-2">
                  {activeTab === 'login' ? 'Bienvenido a ScreenLog' : 'Crea tu Espacio Cinéfilo'}
                </h3>
                <p className="text-xs text-slate-400">
                  {activeTab === 'login' 
                    ? 'Tu lista, tus críticas y tus notas te están esperando' 
                    : 'Guarda tus películas, califícalas y comparte tus opiniones'}
                </p>
              </div>
            </div>

            <button
              onClick={closeAuthModal}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1.5 p-1 mt-4 bg-white/5 rounded-2xl border border-white/10">
            <button
              id="auth-tab-login"
              type="button"
              onClick={() => { setActiveTab('login'); setLoginError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'login'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Entrar
            </button>
            <button
              id="auth-tab-register"
              type="button"
              onClick={() => { setActiveTab('register'); setRegError(''); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'register'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Únete
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Quick Demo Login Pills with Human Microcopy */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
              <span className="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                ¿Quién está viendo?
              </span>
              <span className="text-[10px] text-slate-400">Toca tu foto y escribe tu clave</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {DEMO_USERS.map((demo) => {
                const isSelected = selectedDemoUser?.id === demo.id || loginEmail === demo.email;
                return (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => handleSelectDemoUser(demo)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all text-left group ${
                      isSelected
                        ? 'bg-rose-600/20 border-rose-500/60 ring-1 ring-rose-500/30'
                        : 'bg-white/5 hover:bg-white/10 border-white/5'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <img 
                        src={demo.avatar} 
                        alt={demo.name} 
                        className={`w-8 h-8 rounded-full object-cover ring-2 transition-all ${
                          isSelected ? 'ring-rose-500 scale-105' : 'ring-white/20'
                        }`}
                        referrerPolicy="no-referrer"
                      />
                      {isSelected && (
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-rose-600 rounded-full flex items-center justify-center text-white text-[8px]">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-200 group-hover:text-white truncate">
                        {demo.name.split(' ')[0]}
                      </p>
                      <span className="text-[9px] text-rose-400 font-medium block truncate">
                        {demo.role === 'admin' ? 'Admin' : demo.role === 'critic' ? 'Crítica' : 'Cinéfilo'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedDemoUser && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  Perfil: <strong>{selectedDemoUser.name}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setLoginEmail(selectedDemoUser.email);
                    setLoginPassword('123456');
                    passwordInputRef.current?.focus();
                  }}
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-bold underline ml-2"
                >
                  Autocompletar
                </button>
              </div>
            )}
          </div>

          {/* TAB 1: LOGIN FORM */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Tu correo o usuario
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="login-email-input"
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="ej: miguel@screenlog.app o demon"
                    required
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase">
                    Tu clave secreta
                  </label>
                  <span className="text-[10px] text-slate-400">Solo tú la conoces</span>
                </div>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    ref={passwordInputRef}
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Escribe tu clave"
                    required
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" defaultChecked className="rounded accent-rose-600" />
                  <span>Dejar abierta mi sesión</span>
                </label>
              </div>

              <button
                id="login-submit-btn"
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-sm shadow-xl shadow-rose-900/30 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                ¡A disfrutar del cine! 🍿
              </button>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-400">
                  ¿No tienes una cuenta aún?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="text-rose-400 font-bold hover:underline"
                  >
                    Únete gratis aquí
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTER FORM */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {regError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Tu nombre o alias cinéfilo
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    id="register-name-input"
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="ej: Sofía Tarantino, Lucas Crítico..."
                    required
                    className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Tu correo
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="register-email-input"
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="sofia@ejemplo.com"
                      required
                      className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                    Tu clave secreta
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      id="register-password-input"
                      type={showPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Elige una clave que recuerdes"
                      required
                      className="w-full bg-[#0A0A0B] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Profile Avatar Selection + Device Photo Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-300 uppercase">
                    Elige tu avatar o sube tu foto
                  </label>
                  <input
                    ref={regFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleRegPhotoUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => regFileInputRef.current?.click()}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    Subir foto propia
                  </button>
                </div>

                {uploadedFileName && (
                  <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Foto seleccionada: {uploadedFileName}
                  </p>
                )}

                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {AVATAR_PRESETS.map((av) => (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(av.url);
                        setCustomAvatarUrl('');
                        setUploadedFileName(null);
                      }}
                      className={`relative flex-shrink-0 rounded-full p-0.5 transition-all ${
                        selectedAvatar === av.url && !customAvatarUrl
                          ? 'ring-2 ring-rose-500 scale-105 shadow-md shadow-rose-900/40'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img 
                        src={av.url} 
                        alt={av.name} 
                        className="w-10 h-10 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {selectedAvatar === av.url && !customAvatarUrl && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-rose-600 rounded-full flex items-center justify-center text-white text-[8px]">
                          <Check className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Favorite genres */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5">
                  Tus Géneros Favoritos
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {GENRE_OPTIONS.map((genre) => (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => toggleGenre(genre)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        selectedGenres.includes(genre)
                          ? 'bg-rose-600 text-white border-rose-500 font-bold'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              <button
                id="register-submit-btn"
                type="submit"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-sm shadow-xl shadow-rose-900/30 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                ¡Listo, unirme a ScreenLog!
              </button>

              <div className="text-center pt-1">
                <p className="text-xs text-slate-400">
                  ¿Ya tienes cuenta?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="text-rose-400 font-bold hover:underline"
                  >
                    Entra aquí
                  </button>
                </p>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
