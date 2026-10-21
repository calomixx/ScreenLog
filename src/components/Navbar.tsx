import React, { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Bookmark,
  Bot,
  ChevronDown,
  Clapperboard,
  Compass,
  Home,
  LogIn,
  LogOut,
  Mail,
  MessageSquare,
  Pencil,
  PlusCircle,
  Search,
  ShieldCheck,
  Star,
  User as UserIcon,
  UserCog,
  UserPlus,
  X,
} from 'lucide-react';
import { useMedia, AppTab } from '../context/MediaContext';
import { ROLE_LABELS } from '../context/AuthContext';
import { LogoLockup } from './Logo';

interface TabDef {
  id: AppTab;
  label: string;
  shortLabel?: string;
  icon: React.ElementType;
  staffOnly?: boolean;
  authOnly?: boolean;
  badge?: number;
}

export const Navbar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    mediaList,
    myListEntries,
    setSelectedMediaId,
    setIsAddModalOpen,
    currentUser,
    openAuthModal,
    openAssistant,
    logout,
    userAvatar,
    setIsEditProfileModalOpen,
  } = useMedia();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const isStaffUser = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) setIsSearchOpen(false);
      if (mobileSearchRef.current && !mobileSearchRef.current.contains(event.target as Node)) setIsSearchOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsProfileOpen(false);
  }, [activeTab]);

  const tabs: TabDef[] = currentUser
    ? [
        { id: 'sistema', label: 'Inicio', icon: Home },
        { id: 'explorar', label: 'Explorar', icon: Compass },
        { id: 'mi_lista', label: 'Mi Lista', icon: Bookmark, badge: myListEntries.length },
        { id: 'estadisticas', label: 'Estadísticas', shortLabel: 'Stats', icon: BarChart3 },
        ...(isStaffUser ? [{ id: 'admin' as AppTab, label: 'Admin', icon: UserCog, staffOnly: true }] : []),
        { id: 'cuenta', label: 'Cuenta', icon: UserIcon, authOnly: true },
      ]
    : [
        { id: 'landing', label: 'Inicio', icon: Home },
        { id: 'explorar', label: 'Explorar', icon: Compass },
        { id: 'opiniones', label: 'Opiniones', icon: MessageSquare },
        { id: 'contacto', label: 'Contacto', icon: Mail },
      ];

  const searchResults =
    searchQuery.trim() === ''
      ? []
      : mediaList
          .filter(
            (media) =>
              media.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              media.director.toLowerCase().includes(searchQuery.toLowerCase()) ||
              media.genres.some((genre) => genre.toLowerCase().includes(searchQuery.toLowerCase())),
          )
          .slice(0, 6);

  const handleSelectMedia = (id: string) => {
    setSelectedMediaId(id);
    setIsSearchOpen(false);
    setIsMobileSearchOpen(false);
    setSearchQuery('');
  };

  const handleGoHome = () => {
    setActiveTab(currentUser ? 'sistema' : 'landing');
    setSelectedMediaId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setIsSearchOpen(true);
  };

  const searchPanel = (
    <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
      {searchResults.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => handleSelectMedia(item.id)}
          className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-white/5 transition-colors text-left group"
        >
          <img
            src={item.posterUrl}
            alt=""
            className="w-10 h-14 object-cover rounded-lg flex-shrink-0 bg-slate-800 shadow"
            referrerPolicy="no-referrer"
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white group-hover:text-rose-400 transition-colors truncate">
              {item.title}
            </h4>
            <p className="text-xs text-slate-400 truncate">
              {item.year} · {item.director}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {item.communityVotesCount > 0 ? (
                <span className="flex items-center text-xs text-amber-400 font-bold">
                  <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                  {item.communityRating.toFixed(1)}
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">Sin valoraciones</span>
              )}
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-medium">
                {item.genres[0]}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0A0A0B]/92 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/35 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-3 h-16">
            <button
              type="button"
              onClick={handleGoHome}
              className="flex items-center shrink-0 focus:outline-none"
              title="ScreenLog Pro - Ir al inicio"
            >
              <LogoLockup size={36} showTagline={false} />
            </button>

            <nav className="hidden xl:flex items-center gap-1 bg-white/[0.04] p-1 rounded-2xl border border-white/10 min-w-0" aria-label="Navegación principal">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative inline-flex items-center gap-1.5 px-2.5 2xl:px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-black/30 text-rose-100">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 min-w-0">
              <div ref={searchRef} className="relative hidden md:block">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => setIsSearchOpen(true)}
                    onChange={(event) => handleSearchChange(event.target.value)}
                    placeholder="Buscar..."
                    aria-label="Buscar títulos"
                    className="w-36 lg:w-44 xl:w-44 2xl:w-56 bg-white/5 text-xs text-slate-100 placeholder-slate-400 pl-8 pr-7 py-2 rounded-xl border border-white/10 focus:outline-none focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/20 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 text-slate-400 hover:text-white"
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {isSearchOpen && searchQuery.trim() && (
                  <div className="absolute top-full mt-2 right-0 w-[min(24rem,calc(100vw-1.5rem))] bg-[#161618]/98 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                    <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                      {searchResults.length > 0 ? 'Títulos coincidentes' : 'Sin resultados'}
                    </div>
                    {searchResults.length > 0 ? searchPanel : (
                      <p className="px-3 py-4 text-xs text-slate-500">Prueba con otro título, director o género.</p>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMobileSearchOpen((value) => !value);
                  setIsSearchOpen(true);
                }}
                className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors"
                aria-label="Buscar"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => openAssistant()}
                className="hidden sm:inline-flex p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-rose-300 transition-colors"
                title="Asistente IA"
                aria-label="Abrir asistente IA"
              >
                <Bot className="w-4 h-4" />
              </button>

              {currentUser ? (
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-900/30 active:scale-95 transition-all"
                  title="Añadir título al catálogo"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="hidden 2xl:inline">Añadir Título</span>
                  <span className="hidden xl:inline 2xl:hidden">Añadir</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-rose-600/20 text-rose-300 font-bold text-xs border border-rose-500/30 transition-colors"
                  title="Inicia sesión para añadir títulos"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span className="hidden 2xl:inline">Añadir Título</span>
                  <span className="hidden xl:inline 2xl:hidden">Añadir</span>
                </button>
              )}

              {currentUser ? (
                <div ref={profileRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsProfileOpen((value) => !value)}
                    className="flex items-center gap-1.5 p-1 rounded-full bg-white/5 border border-white/10 hover:border-rose-500/40 transition-colors"
                    aria-label="Menú de perfil"
                    aria-expanded={isProfileOpen}
                  >
                    <img
                      src={userAvatar}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full object-cover border border-rose-500/40"
                      referrerPolicy="no-referrer"
                    />
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1 hidden sm:block" />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-1rem))] bg-[#161618] border border-white/10 rounded-2xl p-4 shadow-2xl z-50">
                      <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                        <img
                          src={userAvatar}
                          alt={currentUser.name}
                          className="w-11 h-11 rounded-xl object-cover ring-2 ring-rose-500/40 flex-shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-white truncate">{currentUser.name}</h4>
                          <p className="text-[11px] text-slate-400 truncate">{currentUser.email}</p>
                          <span className="inline-block mt-0.5 text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-rose-600/20 text-rose-300 border border-rose-500/30">
                            {ROLE_LABELS[currentUser.role]}
                          </span>
                        </div>
                      </div>

                      <div className="py-2.5 space-y-1 text-xs text-slate-300 border-b border-white/5">
                        <div className="flex justify-between py-0.5 px-1">
                          <span className="text-slate-400">En mi lista</span>
                          <span className="font-semibold text-white">{myListEntries.length} títulos</span>
                        </div>
                        <div className="flex justify-between py-0.5 px-1">
                          <span className="text-slate-400">Terminadas</span>
                          <span className="font-semibold text-amber-400">
                            {myListEntries.filter((entry) => entry.review.status === 'terminada').length}
                          </span>
                        </div>
                      </div>

                      <div className="py-2 space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('cuenta');
                            setIsProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 text-xs font-semibold text-slate-300 transition-colors"
                        >
                          <UserIcon className="w-3.5 h-3.5 text-rose-400" />
                          Mi cuenta
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditProfileModalOpen(true);
                            setIsProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 text-xs font-semibold text-slate-300 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5 text-rose-400" />
                          Editar perfil
                        </button>
                        {isStaffUser && (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('admin');
                              setIsProfileOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 text-xs font-semibold text-slate-300 transition-colors"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                            Panel de administración
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            openAssistant();
                            setIsProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/5 text-xs font-semibold text-slate-300 transition-colors"
                        >
                          <Bot className="w-3.5 h-3.5 text-sky-400" />
                          Asistente IA
                        </button>
                      </div>

                      <div className="pt-2 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            logout();
                            setIsProfileOpen(false);
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Cerrar sesión
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 border border-white/10 transition-colors"
                  >
                    <LogIn className="w-3.5 h-3.5 text-rose-400" />
                    <span className="hidden sm:inline">Entrar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal('register')}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-xs font-bold text-white shadow-lg shadow-rose-900/30 transition-all"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Únete
                  </button>
                </div>
              )}
            </div>
          </div>

          <nav
            className="hidden md:flex xl:hidden items-center gap-1 pb-2.5 overflow-x-auto"
            aria-label="Navegación secundaria"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap border transition-all ${
                    isActive
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/30 font-bold'
                      : 'bg-white/[0.03] text-slate-300 border-white/10 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-black/30 text-rose-100">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {isMobileSearchOpen && (
          <div ref={mobileSearchRef} className="md:hidden border-t border-white/10 bg-[#0A0A0B]/98 px-3 py-2.5">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Buscar títulos, directores o géneros..."
                aria-label="Buscar títulos"
                className="w-full bg-white/5 text-sm text-slate-100 placeholder-slate-400 pl-9 pr-9 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-rose-500/60 focus:ring-2 focus:ring-rose-500/20"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 text-slate-400 hover:text-white"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsMobileSearchOpen(false)}
                  className="absolute right-2.5 text-slate-400 hover:text-white"
                  aria-label="Cerrar búsqueda"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {searchQuery.trim() && (
              <div className="mt-2 bg-[#161618] border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-white/5">
                  {searchResults.length > 0 ? 'Títulos coincidentes' : 'Sin resultados'}
                </div>
                {searchResults.length > 0 ? searchPanel : (
                  <p className="px-3 py-4 text-xs text-slate-500">Prueba con otro título, director o género.</p>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#0A0A0B]/96 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegación móvil"
      >
        <div
          className="grid px-1 pt-1.5 pb-1.5"
          style={{ gridTemplateColumns: `repeat(${Math.max(tabs.length, 1)}, minmax(0, 1fr))` }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center gap-1 py-1.5 rounded-xl min-w-0 transition-colors ${
                  isActive ? 'text-rose-400 bg-rose-600/10' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.id === 'cuenta' && currentUser ? (
                  <img
                    src={userAvatar}
                    alt=""
                    className={`w-5 h-5 rounded-full object-cover ${isActive ? 'ring-2 ring-rose-500/60' : ''}`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <tab.icon className="w-5 h-5" />
                )}
                <span className="text-[9px] font-bold leading-none truncate max-w-full px-0.5">
                  {tab.shortLabel || tab.label}
                </span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute top-0 right-1/2 translate-x-4 min-w-3.5 h-3.5 px-0.5 rounded-full bg-rose-600 text-white text-[8px] font-bold flex items-center justify-center">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
