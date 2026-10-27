import React, { useState, useRef, useMemo } from 'react';
import { 
  Bookmark, 
  CheckCircle2, 
  Clock, 
  Star, 
  Filter, 
  SlidersHorizontal, 
  Search, 
  Trash2, 
  Edit3, 
  Film, 
  Plus, 
  Layers, 
  Calendar, 
  Sparkles,
  RotateCcw,
  LayoutGrid,
  Table as TableIcon,
  BookOpen,
  Download,
  Upload,
  Loader2,
  Share2,
  Lock,
  Shield,
  LogIn,
  UserPlus,
  Tv,
  Check
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { WatchStatus, MediaType, UserReview } from '../types';
import { RatingStars } from './RatingStars';
import { MediaCard } from './MediaCard';
import { UserStatsPanel } from './UserStatsPanel';

export const MyListView: React.FC = () => {
  const { 
    myListEntries, 
    setSelectedMediaId, 
    updateMediaStatus, 
    removeFromMyList,
    setIsAddModalOpen,
    setActiveTab,
    statusCounts,
    currentUser,
    openAuthModal,
    exportLocalBackup,
    importLocalBackup,
    showToast,
  } = useMedia();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'todas' | WatchStatus>('todas');
  const [typeFilter, setTypeFilter] = useState<'todos' | MediaType>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recientes' | 'estrellas' | 'ano' | 'titulo'>('recientes');
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'journal'>('grid');

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const res = await importLocalBackup(file);
      showToast(res.message, res.success ? 'success' : 'warning');
    } catch (err: any) {
      showToast(err?.message || 'Error al importar respaldo.', 'warning');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // If user is not authenticated, display the dedicated login lock screen
  if (!currentUser) {
    return (
      <div id="my-list-auth-gate" className="py-12 sm:py-16 max-w-4xl mx-auto text-center space-y-8 animate-in fade-in duration-300">
        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-rose-600/10 text-rose-500 border border-rose-500/20 shadow-2xl">
          <Lock className="w-10 h-10" />
          <span className="absolute -top-1 -right-1 p-1 rounded-full bg-rose-600 text-white">
            <Bookmark className="w-3.5 h-3.5" />
          </span>
        </div>

        <div className="space-y-3 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-600/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Tu Espacio Personal de Cine
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
            Tu lista, tus críticas y tus notas te están esperando
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Tus películas por ver, en proceso y terminadas, tu cuaderno de notas y tus plataformas favoritas, todo guardado y siempre a mano en tu perfil cinéfilo.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            id="auth-gate-login-btn"
            onClick={() => openAuthModal('login')}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-sm shadow-xl shadow-rose-900/40 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Entrar a mi cuenta
          </button>
          <button
            id="auth-gate-register-btn"
            onClick={() => openAuthModal('register')}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm border border-white/10 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4 text-rose-400" />
            Únete gratis
          </button>
        </div>

        {/* Feature benefits highlight */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 text-left max-w-3xl mx-auto">
          <div className="p-4 rounded-2xl bg-[#161618] border border-white/10 space-y-1.5">
            <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
              ⭐ Calificación 1 a 5 Estrellas
            </span>
            <p className="text-xs text-slate-400">
              Registra tu puntuación precisa, etiqueta de evaluación y si la volverías a ver.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#161618] border border-white/10 space-y-1.5">
            <span className="text-rose-400 font-bold text-xs flex items-center gap-1.5">
              <Tv className="w-3.5 h-3.5" />
              Dónde y Cuándo la Viste
            </span>
            <p className="text-xs text-slate-400">
              Anota la plataforma o sala de cine y la fecha exacta en la que disfrutaste la función.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#161618] border border-white/10 space-y-1.5">
            <span className="text-emerald-400 font-bold text-xs flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Cuaderno de Crítica Personal
            </span>
            <p className="text-xs text-slate-400">
              Guarda tus análisis, opiniones sobre el guión y actuaciones accesibles solo para ti.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Filter entries
  // ⚡ Bolt: Memoize filter operation to prevent expensive re-evaluations on context updates
  const filteredEntries = useMemo(() => {
    return myListEntries.filter(({ media, review }) => {
      if (statusFilter !== 'todas' && review.status !== statusFilter) return false;
      if (typeFilter !== 'todos' && media.type !== typeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = media.title.toLowerCase().includes(q);
        const matchDirector = (review.director || media.director).toLowerCase().includes(q);
        const matchPlatform = (review.platform || media.defaultPlatform).toLowerCase().includes(q);
        const matchCritique = (review.critique || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDirector && !matchPlatform && !matchCritique) return false;
      }
      return true;
    });
  }, [myListEntries, statusFilter, typeFilter, searchQuery]);

  // Sort entries
  // ⚡ Bolt: Memoize sort operation to prevent array cloning and sorting on every render cycle
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
      if (sortBy === 'estrellas') {
        return (b.review.stars || 0) - (a.review.stars || 0);
      }
      if (sortBy === 'ano') {
        return (b.review.year || b.media.year) - (a.review.year || a.media.year);
      }
      if (sortBy === 'titulo') {
        return a.media.title.localeCompare(b.media.title);
      }
      // Default: recientes
      return new Date(b.review.updatedAt).getTime() - new Date(a.review.updatedAt).getTime();
    });
  }, [filteredEntries, sortBy]);

  // Calculate statistics
  const finishedEntries = myListEntries.filter((e) => e.review.status === 'terminada');
  const totalStars = finishedEntries.reduce((acc, curr) => acc + (curr.review.stars || 0), 0);
  const avgStars = finishedEntries.length > 0 ? (totalStars / finishedEntries.length).toFixed(1) : '—';

  // Find most frequent platform
  const platformCounts: Record<string, number> = {};
  myListEntries.forEach((e) => {
    const p = e.review.platform || e.media.defaultPlatform;
    platformCounts[p] = (platformCounts[p] || 0) + 1;
  });
  const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Netflix';

  const exportToJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(myListEntries, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `cinetrack-mi-lista-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div id="my-list-view-container" className="space-y-8 pb-16">
      
      {/* Header & Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 text-rose-500 text-xs font-bold uppercase tracking-wider mb-1">
            <Bookmark className="w-4 h-4" />
            Tu Colección Personal
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
            Mi Lista & Cuaderno de Crítica
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Gestiona tus títulos en seguimiento, organízalos por estado y califica cada película terminada con tu reseña detallada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileImport}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors disabled:opacity-50"
            title="Importar y validar copia de seguridad en JSON"
          >
            {isImporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>{isImporting ? 'Validando...' : 'Importar Respaldo'}</span>
          </button>

          <button
            onClick={exportLocalBackup}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors"
            title="Exportar copia de seguridad completa en JSON"
          >
            <Download className="w-3.5 h-3.5 text-rose-400" />
            <span>Exportar Respaldo</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-900/30 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Título</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bento Row: Compact default with hover enlargement */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#161618]/90 border border-white/10 shadow-sm flex flex-col justify-between transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:border-rose-500/40 hover:shadow-lg hover:shadow-rose-950/20 cursor-default group">
          <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-300 uppercase tracking-wider transition-colors">Total en Lista</span>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-xl sm:text-2xl font-black font-display text-white">{statusCounts.all}</span>
            <span className="text-[11px] text-slate-400">títulos</span>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#161618]/90 border border-emerald-500/20 shadow-sm flex flex-col justify-between transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-950/20 cursor-default group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Terminadas</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-xl sm:text-2xl font-black font-display text-emerald-400">{statusCounts.terminada}</span>
            <span className="text-[11px] text-slate-400">vistas</span>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#161618]/90 border border-amber-500/20 shadow-sm flex flex-col justify-between transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-950/20 cursor-default group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">En Proceso</span>
            <Clock className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-xl sm:text-2xl font-black font-display text-amber-400">{statusCounts.en_proceso}</span>
            <span className="text-[11px] text-slate-400">viendo</span>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#161618]/90 border border-sky-500/20 shadow-sm flex flex-col justify-between transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-950/20 cursor-default group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">Por Ver</span>
            <Bookmark className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="flex items-baseline gap-1.5 mt-1.5">
            <span className="text-xl sm:text-2xl font-black font-display text-sky-400">{statusCounts.pendiente}</span>
            <span className="text-[11px] text-slate-400">en cola</span>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#161618]/90 border border-white/10 shadow-sm flex flex-col justify-between transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-950/20 cursor-default group">
          <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-300 uppercase tracking-wider transition-colors">Promedio 5★</span>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400 group-hover:rotate-12 transition-transform" />
            <span className="text-xl sm:text-2xl font-black font-display text-amber-400">{avgStars}</span>
          </div>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-[#161618]/90 border border-white/10 shadow-sm flex flex-col justify-between transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:border-rose-500/40 hover:shadow-lg hover:shadow-rose-950/20 cursor-default group">
          <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-300 uppercase tracking-wider transition-colors">Plataforma Top</span>
          <div className="mt-1.5 truncate">
            <span className="text-sm sm:text-base font-bold text-white truncate block group-hover:text-rose-400 transition-colors">{topPlatform}</span>
          </div>
        </div>
      </div>

      {/* User Genre Statistics Bar Chart Panel (Recharts with compact default & hover enlargement) */}
      <UserStatsPanel />

      {/* Control Bar: Status Tabs, View Switcher & Filters (Refined, intuitive & pleasing) */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-b from-[#18181b]/95 via-[#161619]/95 to-[#121214]/95 border border-white/10 shadow-2xl space-y-4">
        
        {/* Main Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter('todas')}
              className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                statusFilter === 'todas'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40 ring-1 ring-rose-400/40 scale-102'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>Todas</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${statusFilter === 'todas' ? 'bg-black/30 text-white' : 'bg-white/10 text-slate-400'}`}>
                {statusCounts.all}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('terminada')}
              className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                statusFilter === 'terminada'
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-300/40 font-extrabold scale-102'
                  : 'bg-white/5 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-300'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Terminadas</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${statusFilter === 'terminada' ? 'bg-slate-950/30 text-slate-950' : 'bg-white/10 text-emerald-400'}`}>
                {statusCounts.terminada}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('en_proceso')}
              className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                statusFilter === 'en_proceso'
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/40 ring-1 ring-amber-300/40 font-extrabold scale-102'
                  : 'bg-white/5 text-slate-300 hover:bg-amber-500/10 hover:text-amber-300'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>En proceso</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${statusFilter === 'en_proceso' ? 'bg-slate-950/30 text-slate-950' : 'bg-white/10 text-amber-400'}`}>
                {statusCounts.en_proceso}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('pendiente')}
              className={`px-3.5 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-200 flex items-center gap-2 ${
                statusFilter === 'pendiente'
                  ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-950/40 ring-1 ring-sky-300/40 font-extrabold scale-102'
                  : 'bg-white/5 text-slate-300 hover:bg-sky-500/10 hover:text-sky-300'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 text-sky-400" />
              <span>Pendiente</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${statusFilter === 'pendiente' ? 'bg-slate-950/30 text-slate-950' : 'bg-white/10 text-sky-400'}`}>
                {statusCounts.pendiente}
              </span>
            </button>
          </div>

          {/* View mode toggle with clear icons */}
          <div className="flex items-center gap-1 bg-[#0A0A0B] p-1.5 rounded-2xl border border-white/10 shadow-inner">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all ${
                viewMode === 'grid'
                  ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Vista en Cuadrícula"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tarjetas</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Vista en Tabla con todos los campos"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabla</span>
            </button>

            <button
              onClick={() => setViewMode('journal')}
              className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all ${
                viewMode === 'journal'
                  ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
              title="Vista Cuaderno de Críticas"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Diario</span>
            </button>
          </div>
        </div>

        {/* Secondary Filters: Type, Search & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {/* Type filters */}
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full -mx-0.5">
            {(['todos', 'pelicula', 'serie', 'anime', 'documental'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                  typeFilter === t
                    ? 'bg-rose-600 text-white font-bold shadow-md shadow-rose-900/30'
                    : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {t === 'todos' ? 'Todos' : t}
              </button>
            ))}
          </div>

          {/* Search and Sort within list */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 ml-auto flex-wrap sm:flex-nowrap justify-end w-full sm:w-auto">
            <div className="relative z-20 flex-shrink-0">
              <Search className="absolute left-2.5 sm:left-3 top-1.5 sm:top-2.5 w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="bg-[#0A0A0B] border border-white/10 text-[11px] sm:text-xs text-white placeholder-slate-400 pl-7 sm:pl-9 pr-2.5 sm:pr-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500/30 transition-all w-24 xs:w-28 sm:w-56"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#0A0A0B] border border-white/10 text-[11px] sm:text-xs text-slate-200 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl focus:border-rose-500 focus:outline-none cursor-pointer flex-shrink-0"
            >
              <option value="recientes">Recientes</option>
              <option value="estrellas">Mayor Calificación</option>
              <option value="ano">Año de estreno</option>
              <option value="titulo">Título (A-Z)</option>
            </select>
          </div>
        </div>

      </div>

      {/* Empty State */}
      {sortedEntries.length === 0 && (
        <div className="text-center py-16 px-4 border border-dashed border-white/10 rounded-3xl bg-[#161618]/50 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-600/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
            <Film className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No se encontraron títulos en esta sección</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Explora el catálogo o añade tus propias películas y series para empezar a calificar y reseñar.
            </p>
          </div>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setActiveTab('explorar')}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors"
            >
              Explorar Catálogo
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-900/30 transition-colors"
            >
              + Añadir Mi Título
            </button>
          </div>
        </div>
      )}

      {/* VIEW 1: GRID MODE */}
      {viewMode === 'grid' && sortedEntries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {sortedEntries.map(({ media }) => (
            <MediaCard key={media.id} media={media} />
          ))}
        </div>
      )}

      {/* VIEW 2: FULL TABLE VIEW (Detailed requested columns) */}
      {viewMode === 'table' && sortedEntries.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#161618] shadow-xl">
          <table className="w-full text-left text-xs text-slate-200 divide-y divide-white/10">
            <thead className="bg-[#0A0A0B] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3.5">Título & Portada</th>
                <th className="px-3 py-3.5">Estado</th>
                <th className="px-3 py-3.5">Año</th>
                <th className="px-3 py-3.5">Género</th>
                <th className="px-3 py-3.5">Calificación</th>
                <th className="px-3 py-3.5">Evaluación</th>
                <th className="px-4 py-3.5">Director</th>
                <th className="px-3 py-3.5">Fecha en que la vi</th>
                <th className="px-3 py-3.5">Dónde la vi</th>
                <th className="px-3 py-3.5">¿La volvería a ver?</th>
                <th className="px-3 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-light">
              {sortedEntries.map(({ media, review }) => (
                <tr
                  key={media.id}
                  onClick={() => setSelectedMediaId(media.id)}
                  className="hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  {/* Title & Poster */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={media.posterUrl}
                        alt={media.title}
                        className="w-9 h-12 rounded object-cover flex-shrink-0 bg-black/40 border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <span className="font-bold text-white group-hover:text-rose-400 transition-colors block">
                          {media.title}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase">{media.type}</span>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-3 py-3">
                    {review.status === 'terminada' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold text-[10px] whitespace-nowrap">
                        ⭐ Terminada
                      </span>
                    )}
                    {review.status === 'en_proceso' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-semibold text-[10px] whitespace-nowrap">
                        ⏳ En proceso
                      </span>
                    )}
                    {review.status === 'pendiente' && (
                      <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-semibold text-[10px] whitespace-nowrap">
                        📌 Pendiente
                      </span>
                    )}
                  </td>

                  {/* Year */}
                  <td className="px-3 py-3 font-medium text-slate-300">
                    {review.year || media.year}
                  </td>

                  {/* Genre */}
                  <td className="px-3 py-3 text-slate-300">
                    {(review.genres || media.genres).slice(0, 2).join(', ')}
                  </td>

                  {/* Rating */}
                  <td className="px-3 py-3">
                    {review.status === 'terminada' && review.stars > 0 ? (
                      <div className="flex items-center gap-1 font-bold text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{review.stars}★</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">—</span>
                    )}
                  </td>

                  {/* Evaluación */}
                  <td className="px-3 py-3 text-slate-300">
                    {review.evaluation ? (
                      <span className="text-[11px] font-semibold text-rose-300">
                        {review.evaluation}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">—</span>
                    )}
                  </td>

                  {/* Director */}
                  <td className="px-4 py-3 text-slate-300 truncate max-w-[140px]">
                    {review.director || media.director}
                  </td>

                  {/* Watched date */}
                  <td className="px-3 py-3 text-slate-300 whitespace-nowrap">
                    {review.watchedDate || <span className="text-slate-500 italic">—</span>}
                  </td>

                  {/* Platform */}
                  <td className="px-3 py-3 text-slate-300 whitespace-nowrap">
                    {review.platform || media.defaultPlatform}
                  </td>

                  {/* Rewatch choice */}
                  <td className="px-3 py-3 whitespace-nowrap">
                    {review.wouldRewatch === 'si_totalmente' && '🤩 ¡Sí, totalmente!'}
                    {review.wouldRewatch === 'quizas' && '🤔 Quizás'}
                    {review.wouldRewatch === 'no_suficiente' && '👌 No, suficiente'}
                    {review.wouldRewatch === 'jamas' && '🙅‍♂️ Jamás'}
                    {!review.wouldRewatch && <span className="text-slate-500 italic">—</span>}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMediaId(media.id);
                      }}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-rose-600 hover:text-white text-slate-300 transition-colors"
                      title="Editar reseña"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 3: JOURNAL / CRITIQUE CARDS (Rich editorial view) */}
      {viewMode === 'journal' && sortedEntries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sortedEntries.map(({ media, review }) => (
            <div
              key={media.id}
              onClick={() => setSelectedMediaId(media.id)}
              className="p-5 rounded-3xl bg-[#161618] border border-white/10 hover:border-rose-500/40 shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
            >
              <div className="flex gap-4">
                <img
                  src={media.posterUrl}
                  alt={media.title}
                  className="w-20 h-28 object-cover rounded-xl shadow-lg border border-white/10 flex-shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-white/10 text-slate-300">
                      {media.type}
                    </span>
                    {review.status === 'terminada' ? (
                      <span className="text-xs font-bold text-emerald-400">⭐ Terminada</span>
                    ) : (
                      <span className="text-xs text-amber-400">⏳ {review.status}</span>
                    )}
                  </div>

                  <h3 className="font-display font-extrabold text-white text-lg group-hover:text-rose-400 transition-colors truncate">
                    {media.title}
                  </h3>

                  <p className="text-xs text-slate-400">
                    {review.year || media.year} • Dir: {review.director || media.director}
                  </p>

                  <div className="flex items-center gap-2 mt-2">
                    <RatingStars rating={review.stars} size="sm" />
                    {review.evaluation && (
                      <span className="text-[11px] text-rose-300 font-semibold px-2 py-0.5 rounded bg-rose-600/10 border border-rose-500/20 truncate">
                        {review.evaluation}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Critique text box */}
              {review.critique ? (
                <div className="p-3.5 rounded-2xl bg-[#0A0A0B] border border-white/10 text-xs text-slate-300 leading-relaxed font-light italic">
                  "{review.critique}"
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#0A0A0B]/60 border border-dashed border-white/10 text-xs text-slate-500 italic">
                  Sin reseña escrita aún. Haz clic para redactar tu opinión.
                </div>
              )}

              {/* Review metadata chips */}
              <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                <span>Visto en: <strong className="text-slate-200">{review.platform || media.defaultPlatform}</strong></span>
                {review.watchedDate && <span>Fecha: <strong className="text-slate-200">{review.watchedDate}</strong></span>}
                <span className="text-rose-400 font-medium">
                  {review.wouldRewatch === 'si_totalmente' && '🤩 La volvería a ver'}
                  {review.wouldRewatch === 'quizas' && '🤔 Quizás la repita'}
                  {review.wouldRewatch === 'no_suficiente' && '👌 Vista una vez'}
                  {review.wouldRewatch === 'jamas' && '🙅‍♂️ Jamás'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
