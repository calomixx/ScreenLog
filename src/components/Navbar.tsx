import React, { useState, useRef, useEffect } from 'react';
import { 
  Film, 
  Sparkles, 
  Bookmark, 
  Compass, 
  PlusCircle, 
  Search, 
  X, 
  ChevronDown, 
  User, 
  Star,
  Clapperboard,
  CheckCircle2,
  Tv,
  LogIn,
  UserPlus,
  LogOut,
  Shield,
  Users,
  Mail
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';

export const Navbar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    mediaList, 
    myListEntries, 
    setSelectedMediaId, 
    setIsAddModalOpen,
    currentUser,
    usersList,
    openAuthModal,
    logout,
    login,
    userName,
    setUserName,
    userAvatar
  } = useMedia();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [tempName, setTempName] = useState(userName);
  const [isEditingName, setIsEditingName] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTempName(userName);
  }, [userName]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = searchQuery.trim() === '' 
    ? [] 
    : mediaList.filter(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.director.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.genres.some(g => g.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 6);

  const handleSelectMedia = (id: string) => {
    setSelectedMediaId(id);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      setUserName(tempName.trim());
      setIsEditingName(false);
    }
  };

  const goToSection = (id: string) => {
    setActiveTab('inicio');
    setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-gradient-to-r from-[#0A0A0B]/95 via-[#111113]/95 to-[#161618]/95 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <button
            id="brand-logo-btn"
            onClick={() => { setActiveTab('inicio'); setSelectedMediaId(null); }}
            className="flex items-center gap-3 text-left group focus:outline-none"
          >
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-rose-600 text-white shadow-lg shadow-rose-900/30 group-hover:scale-105 transition-transform duration-300">
              <Clapperboard className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping opacity-75" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-display text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-rose-300 to-amber-400 group-hover:opacity-90 transition-opacity">
                SCREENLOG
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-rose-600/20 text-rose-400 border border-rose-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Explora • Clasifica • Tu Lista</p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-2">
            <button
              id="nav-tab-inicio"
              onClick={() => setActiveTab('inicio')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'inicio'
                  ? 'bg-rose-600/15 text-rose-400 font-semibold border border-rose-500/25 shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Inicio
            </button>

            <button
              id="nav-tab-explorar"
              onClick={() => setActiveTab('explorar')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'explorar'
                  ? 'bg-rose-600/15 text-rose-400 font-semibold border border-rose-500/25 shadow-inner'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Compass className="w-4 h-4" />
              Explorar Catálogo
            </button>

            {!currentUser && (
            <button
              id="nav-tab-ofrecemos"
              onClick={() => goToSection('features-showcase-section')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all text-slate-400 hover:text-white hover:bg-white/5"
            >
              <Shield className="w-4 h-4" />
              Qué Ofrecemos
            </button>
            )}

            {!currentUser && (
            <button
              id="nav-tab-comentarios"
              onClick={() => goToSection('user-testimonials-section')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all text-slate-400 hover:text-white hover:bg-white/5"
            >
              <Star className="w-4 h-4" />
              Comentarios
            </button>
            )}

            {!currentUser && (
            <button
              id="nav-tab-contacto"
              onClick={() => goToSection('contact-section')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all text-slate-400 hover:text-white hover:bg-white/5"
            >
              <Mail className="w-4 h-4" />
              Contáctanos
            </button>
            )}

            {/* Mi Lista: Visible only when user is authenticated */}
            {currentUser && (
              <button
                id="nav-tab-mi-lista"
                onClick={() => setActiveTab('mi_lista')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all relative ${
                  activeTab === 'mi_lista'
                    ? 'bg-rose-600/15 text-rose-400 font-semibold border border-rose-500/25 shadow-inner'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                Mi Lista
                {myListEntries.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-bold rounded-full bg-rose-600 text-white">
                    {myListEntries.length}
                  </span>
                )}
              </button>
            )}
          </nav>
        </div>

        {/* Right Section: Search, Add Button, Auth / Profile */}
        <div className="flex items-center gap-3">
          
          {/* Search bar: only for logged-in users */}
          {currentUser && (
          <div ref={searchRef} className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                id="header-search-input"
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                placeholder="Buscar película, director, género..."
                className="w-36 sm:w-60 lg:w-72 bg-white/5 text-sm text-slate-100 placeholder-slate-400 pl-10 pr-8 py-2 rounded-full border border-white/10 focus:outline-none focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/20 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick search dropdown */}
            {isSearchOpen && searchResults.length > 0 && (
              <div className="absolute top-full mt-2 left-0 right-0 sm:w-96 sm:right-0 sm:left-auto bg-[#161618]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-from-top-2 duration-200">
                <div className="px-3 py-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                  Títulos coincidentes
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelectMedia(item.id)}
                      className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-left group"
                    >
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-10 h-14 object-cover rounded-lg flex-shrink-0 bg-slate-800 shadow"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-white group-hover:text-rose-400 transition-colors truncate">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-400 truncate">
                          {item.year} • {item.director}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="flex items-center text-xs text-amber-400 font-bold">
                            <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                            {item.communityRating.toFixed(1)}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-medium">
                            {item.genres[0]}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              )}
          </div>
          )}

          {/* Add Media Button */}
          {currentUser && (
          <button
            id="add-media-header-btn"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/20 hover:shadow-rose-600/30 active:scale-95 transition-all"
            title="Añade tu propia película o serie"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden lg:inline">Añadir Título</span>
          </button>
          )}

          {/* AUTH SECTION: Logged in vs Logged out */}
          {currentUser ? (
            <div ref={profileRef} className="relative">
              <button
                id="user-profile-btn"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 p-1 rounded-full bg-white/5 border border-white/10 hover:border-rose-500/40 transition-colors"
              >
                <img
                  src={userAvatar}
                  alt={userName}
                  className="w-8 h-8 rounded-full object-cover border-2 border-rose-500/40"
                  referrerPolicy="no-referrer"
                />
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1 hidden sm:block" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-[#161618] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                    <img
                      src={userAvatar}
                      alt={userName}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-rose-500/40"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      {isEditingName ? (
                        <form onSubmit={handleSaveName} className="flex items-center gap-1">
                          <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            className="w-full bg-black/40 text-xs px-2 py-1 rounded text-white border border-rose-500/50 focus:outline-none"
                            autoFocus
                          />
                          <button
                            type="submit"
                            className="px-2 py-1 text-xs bg-rose-600 text-white font-bold rounded"
                          >
                            OK
                          </button>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-white truncate">{userName}</h4>
                          <button
                            onClick={() => setIsEditingName(true)}
                            className="text-[11px] text-rose-400 hover:underline"
                          >
                            Editar
                          </button>
                        </div>
                      )}
                      <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                      <span className="inline-block mt-0.5 text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded bg-rose-600/20 text-rose-400 border border-rose-500/30">
                        {currentUser.role === 'admin' ? 'Administrador & Crítico' : currentUser.role === 'critic' ? 'Crítica de Cine' : 'Cinéfilo Pro'}
                      </span>
                    </div>
                  </div>

                  {/* List Stats */}
                  <div className="py-2.5 space-y-1 text-xs text-slate-300 border-b border-white/5">
                    <div className="flex justify-between py-1 px-1">
                      <span className="text-slate-400">En mi lista:</span>
                      <span className="font-semibold text-white">{myListEntries.length} títulos</span>
                    </div>
                    <div className="flex justify-between py-1 px-1">
                      <span className="text-slate-400">Terminadas & Evaluadas:</span>
                      <span className="font-semibold text-amber-400">
                        {myListEntries.filter(e => e.review.status === 'terminada').length}
                      </span>
                    </div>
                  </div>

                  {/* Switch Account section */}
                  <div className="py-2.5 border-b border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5 flex items-center gap-1">
                      <Users className="w-3 h-3 text-rose-400" />
                      Cambiar de Usuario
                    </span>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {usersList.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => {
                            login(u.email);
                            setIsProfileOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-1.5 rounded-lg text-xs transition-colors ${
                            u.id === currentUser.id 
                              ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30' 
                              : 'hover:bg-white/5 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <img src={u.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                            <span className="truncate">{u.name}</span>
                          </div>
                          {u.id === currentUser.id && (
                            <span className="text-[10px] text-rose-400 font-bold">Activo</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2.5 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActiveTab('mi_lista');
                        setIsProfileOpen(false);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-center text-xs font-semibold text-white border border-white/10 transition-colors"
                    >
                      Ver Mi Lista
                    </button>
                    <button
                      onClick={() => {
                        logout();
                        setIsProfileOpen(false);
                      }}
                      className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-500/30 transition-colors"
                      title="Cerrar Sesión"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="header-login-btn"
                onClick={() => openAuthModal('login')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 border border-white/10 transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Iniciar Sesión</span>
              </button>
              <button
                id="header-register-btn"
                onClick={() => openAuthModal('register')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-xs font-bold text-white shadow-lg shadow-rose-900/30 active:scale-95 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Registrarse</span>
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Mobile navigation tab bar */}
      <div className="md:hidden flex items-center justify-around border-t border-white/5 py-2.5 bg-[#161618]/95 backdrop-blur-md">
        <button
          onClick={() => setActiveTab('inicio')}
          className={`flex flex-col items-center gap-1 text-xs py-1 px-3 ${
            activeTab === 'inicio' ? 'text-rose-500 font-bold' : 'text-slate-400'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Inicio
        </button>
        <button
          onClick={() => setActiveTab('explorar')}
          className={`flex flex-col items-center gap-1 text-xs py-1 px-3 ${
            activeTab === 'explorar' ? 'text-rose-500 font-bold' : 'text-slate-400'
          }`}
        >
          <Compass className="w-4 h-4" />
          Explorar
        </button>
        {!currentUser && (
        <button
          onClick={() => goToSection('features-showcase-section')}
          className="flex flex-col items-center gap-1 text-xs py-1 px-3 text-slate-400"
        >
          <Shield className="w-4 h-4" />
          Ofrecemos
        </button>
        )}
        {!currentUser && (
        <button
          onClick={() => goToSection('user-testimonials-section')}
          className="flex flex-col items-center gap-1 text-xs py-1 px-3 text-slate-400"
        >
          <Star className="w-4 h-4" />
          Comentarios
        </button>
        )}
        {!currentUser && (
        <button
          onClick={() => goToSection('contact-section')}
          className="flex flex-col items-center gap-1 text-xs py-1 px-3 text-slate-400"
        >
          <Mail className="w-4 h-4" />
          Contáctanos
        </button>
        )}
        {currentUser ? (
          <button
            onClick={() => setActiveTab('mi_lista')}
            className={`flex flex-col items-center gap-1 text-xs py-1 px-3 relative ${
              activeTab === 'mi_lista' ? 'text-rose-500 font-bold' : 'text-slate-400'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            Mi Lista
            {myListEntries.length > 0 && (
              <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-rose-600" />
            )}
          </button>
        ) : (
          <button
            onClick={() => openAuthModal('login')}
            className="flex flex-col items-center gap-1 text-xs py-1 px-3 text-rose-400 font-bold"
          >
            <LogIn className="w-4 h-4" />
            Ingresar
          </button>
        )}
      </div>
    </header>
  );
};
