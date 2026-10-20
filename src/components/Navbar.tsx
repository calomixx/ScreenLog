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
  Heart,
  MessageSquare,
  Home,
  Menu,
  BarChart3,
  Bot
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { OfflinePersistenceIndicator } from './OfflinePersistenceIndicator';

const ScrollLink = ({ to, icon, text }: { to: string, icon: React.ReactNode, text: string }) => {
  const handleClick = () => {
    document.getElementById(to)?.scrollIntoView({ behavior: 'smooth' });
    window.dispatchEvent(new CustomEvent('close-mobile-menu'));
  };
  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors whitespace-nowrap"
    >
      <div className="flex-shrink-0 text-rose-400">
        {icon}
      </div>
      <span>{text}</span>
    </button>
  );
};

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
    openAssistant,
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleClose = () => setIsMobileMenuOpen(false);
    window.addEventListener('close-mobile-menu', handleClose);
    return () => window.removeEventListener('close-mobile-menu', handleClose);
  }, []);

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

  return (
    <>
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-gradient-to-r from-[#0A0A0B]/95 via-[#111113]/95 to-[#161618]/95 backdrop-blur-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-8">
          <button
            id="brand-logo-btn"
            onClick={() => { setActiveTab(currentUser ? 'sistema' : 'landing'); setSelectedMediaId(null); }}
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
          {activeTab === 'landing' || activeTab === 'inicio' || activeTab === 'opiniones' || activeTab === 'contacto' ? (
            <nav className="hidden lg:flex items-center gap-1 bg-white/[0.03] p-1 rounded-2xl border border-white/10">
              <ScrollLink to="features-section" icon={<Sparkles className="w-3.5 h-3.5" />} text="¿Qué Ofrecemos?" />
              <ScrollLink to="how-it-works-section" icon={<Film className="w-3.5 h-3.5" />} text="¿Cómo lo Hacemos?" />
              <ScrollLink to="user-testimonials-section" icon={<Heart className="w-3.5 h-3.5" />} text="Opiniones" />
              <ScrollLink to="contact-section" icon={<MessageSquare className="w-3.5 h-3.5" />} text="Contáctanos" />
            </nav>
          ) : (
            <nav className="hidden md:flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-2xl border border-white/10">
              <button
                id="nav-tab-inicio"
                onClick={() => { setActiveTab('sistema'); setSelectedMediaId(null); }}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'sistema'
                    ? 'bg-rose-600 text-white shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                Inicio
              </button>

              <button
                id="nav-tab-explorar"
                onClick={() => setActiveTab('explorar')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'explorar'
                    ? 'bg-rose-600 text-white shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Explorar Catálogo
              </button>

              {/* Mi Lista */}
              {currentUser && (
                <button
                  id="nav-tab-mi-lista"
                  onClick={() => setActiveTab('mi_lista')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all relative ${
                    activeTab === 'mi_lista'
                      ? 'bg-rose-600 text-white shadow-md font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  Mi Lista
                  {myListEntries.length > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-black/40 text-rose-200">
                      {myListEntries.length}
                    </span>
                  )}
                </button>
              )}

              {/* Estadísticas */}
              <button
                id="nav-tab-estadisticas"
                onClick={() => setActiveTab('estadisticas')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeTab === 'estadisticas'
                    ? 'bg-rose-600 text-white shadow-md font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Estadísticas
              </button>
            </nav>
          )}
        </div>

        {/* Right Section: Search, AI Assistant, Add Button, Auth / Profile */}
        <div className="flex items-center gap-2.5">
          {/* Offline / Local Storage Status Pill */}
          <OfflinePersistenceIndicator compact />

          {/* AI Assistant Quick Trigger */}
          <button
            id="header-ai-assistant-btn"
            onClick={() => openAssistant()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600/20 to-amber-500/20 hover:from-rose-600/30 hover:to-amber-500/30 text-rose-300 font-semibold text-xs border border-rose-500/30 transition-all active:scale-95 shadow-sm"
            title="Abrir Asistente IA de ScreenLog"
          >
            <Bot className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Asistente IA</span>
          </button>
          
          {/* Search and Add Buttons (Hidden on Landing) */}
          {activeTab !== 'landing' && activeTab !== 'inicio' && activeTab !== 'opiniones' && activeTab !== 'contacto' && (
            <>
              {/* Search bar */}
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

              {/* Add Media Button */}
              <button
                id="add-media-header-btn"
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm shadow-lg shadow-rose-600/20 hover:shadow-rose-600/30 active:scale-95 transition-all"
                title="Añade tu propia película o serie"
              >
                <PlusCircle className="w-4 h-4" />
                <span className="hidden lg:inline">Añadir Título</span>
              </button>
            </>
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
                      Mi Lista
                    </button>
                    <button
                      onClick={() => {
                        setActiveTab('estadisticas');
                        setIsProfileOpen(false);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-center text-xs font-semibold text-rose-300 border border-rose-500/30 transition-colors flex items-center justify-center gap-1"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Estadísticas
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
            <div className="hidden md:flex items-center gap-2">
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
                <span className="hidden sm:inline">Registrarse</span>
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 -mr-2 text-slate-400 hover:text-white bg-white/5 rounded-xl border border-white/10"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#0A0A0B] flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-2 text-rose-400 font-bold">
              <Clapperboard className="w-5 h-5" />
              <span>Menu</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-slate-400 hover:text-white bg-white/5 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-4">
            <button
              onClick={() => {
                setActiveTab(currentUser ? 'sistema' : 'landing');
                setSelectedMediaId(null);
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 p-4 rounded-xl text-sm font-bold ${
                (activeTab === 'sistema' || activeTab === 'landing') ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' : 'bg-white/5 text-slate-300'
              }`}
            >
              <Home className="w-5 h-5" />
              Inicio
            </button>
            <button
              onClick={() => {
                setActiveTab('explorar');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 p-4 rounded-xl text-sm font-bold ${
                activeTab === 'explorar' ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' : 'bg-white/5 text-slate-300'
              }`}
            >
              <Compass className="w-5 h-5" />
              Explorar Catálogo
            </button>
            
            <button
              onClick={() => {
                setActiveTab('estadisticas');
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center gap-3 p-4 rounded-xl text-sm font-bold ${
                activeTab === 'estadisticas' ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' : 'bg-white/5 text-slate-300'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              Estadísticas por Género
            </button>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                openAssistant();
              }}
              className="flex items-center gap-3 p-4 rounded-xl text-sm font-bold bg-gradient-to-r from-rose-600/20 to-amber-500/20 text-rose-300 border border-rose-500/30"
            >
              <Bot className="w-5 h-5 text-amber-400" />
              Asistente IA (Guía de la App)
            </button>

            {currentUser ? (
              <button
                onClick={() => {
                  setActiveTab('mi_lista');
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 p-4 rounded-xl text-sm font-bold ${
                  activeTab === 'mi_lista' ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' : 'bg-white/5 text-slate-300'
                }`}
              >
                <Bookmark className="w-5 h-5" />
                Mi Lista
              </button>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openAuthModal('login');
                  }}
                  className="flex items-center justify-center gap-2 p-4 rounded-xl bg-white/5 text-slate-200 font-bold border border-white/10"
                >
                  <LogIn className="w-5 h-5 text-rose-400" />
                  Iniciar Sesión
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openAuthModal('register');
                  }}
                  className="flex items-center justify-center gap-2 p-4 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 text-white font-bold"
                >
                  <UserPlus className="w-5 h-5" />
                  Crear Cuenta
                </button>
              </div>
            )}
            
            {!currentUser && (
              <div className="mt-8 flex flex-col gap-2 pt-6 border-t border-white/10">
                <button onClick={() => { document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' }); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-slate-300 font-medium text-sm transition-colors text-left">
                  <Sparkles className="w-5 h-5 text-rose-400" />
                  ¿Qué Ofrecemos?
                </button>
                <button onClick={() => { document.getElementById('how-it-works-section')?.scrollIntoView({ behavior: 'smooth' }); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-slate-300 font-medium text-sm transition-colors text-left">
                  <Film className="w-5 h-5 text-rose-400" />
                  ¿Cómo lo Hacemos?
                </button>
                <button onClick={() => { document.getElementById('user-testimonials-section')?.scrollIntoView({ behavior: 'smooth' }); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-slate-300 font-medium text-sm transition-colors text-left">
                  <Heart className="w-5 h-5 text-rose-400" />
                  Opiniones
                </button>
                <button onClick={() => { document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' }); setIsMobileMenuOpen(false); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-slate-300 font-medium text-sm transition-colors text-left">
                  <MessageSquare className="w-5 h-5 text-rose-400" />
                  Contáctanos
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
