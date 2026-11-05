import React, { useState, useMemo } from 'react';
import { 
  Compass, 
  Search, 
  Filter, 
  Sparkles, 
  Plus, 
  SlidersHorizontal,
  Star,
  Film,
  Calendar,
  X,
  RotateCcw,
  Layers,
  Tv
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { MediaType } from '../types';
import { MediaCard } from './MediaCard';
import { RecentSearches } from './RecentSearches';

const ALL_GENRES = [
  'Todos',
  'Acción',
  'Aventura',
  'Animación',
  'Ciencia Ficción',
  'Comedia',
  'Crimen',
  'Documental',
  'Drama',
  'Fantasía',
  'Historia',
  'Suspense',
  'Terror'
];

const ALL_PLATFORMS = [
  'Todas',
  'Netflix',
  'Max (HBO)',
  'Prime Video',
  'Disney+',
  'Apple TV+',
  'Crunchyroll',
  'Cine / Sala de Cine'
];

export const CatalogView: React.FC = () => {
  const { mediaList, setIsAddModalOpen } = useMedia();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'todos' | MediaType>('todos');
  const [selectedGenre, setSelectedGenre] = useState('Todos');
  const [selectedYear, setSelectedYear] = useState('todos');
  const [selectedPlatform, setSelectedPlatform] = useState('Todas');
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'calificacion' | 'anadidas' | 'recientes' | 'ano' | 'titulo'>('calificacion');

  // Extract available unique years dynamically from catalog
  const availableYears = useMemo(() => {
    const years: number[] = Array.from(
      new Set(mediaList.map((m) => Number(m.year)).filter((y) => !isNaN(y) && y > 0))
    );
    return years.sort((a: number, b: number) => b - a);
  }, [mediaList]);

  // Extract all available genres dynamically (merging predefined list with any custom added media)
  const availableGenres = useMemo(() => {
    const set = new Set<string>(['Todos']);
    ALL_GENRES.forEach((g) => set.add(g));
    mediaList.forEach((m) => m.genres?.forEach((g) => set.add(g)));
    return Array.from(set);
  }, [mediaList]);

  // Filter media
  const filtered = useMemo(() => {
    return mediaList.filter((item) => {
      // Filter by type
      if (selectedType !== 'todos' && item.type !== selectedType) return false;

      // Filter by genre
      if (selectedGenre !== 'Todos' && !item.genres.includes(selectedGenre)) return false;

      // Filter by release year
      if (selectedYear !== 'todos') {
        if (selectedYear === '2020s') {
          if (item.year < 2020) return false;
        } else if (selectedYear === '2010s') {
          if (item.year < 2010 || item.year > 2019) return false;
        } else if (selectedYear === 'pre-2010') {
          if (item.year >= 2010) return false;
        } else {
          if (item.year !== Number(selectedYear)) return false;
        }
      }

      // Filter by minimum rating
      if (item.communityRating < minRating) return false;

      // Filter by platform
      if (selectedPlatform !== 'Todas' && item.defaultPlatform !== selectedPlatform) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q) || (item.originalTitle || '').toLowerCase().includes(q);
        const matchDir = item.director.toLowerCase().includes(q);
        const matchCast = item.cast.some((c) => c.toLowerCase().includes(q));
        if (!matchTitle && !matchDir && !matchCast) return false;
      }

      return true;
    });
  }, [mediaList, selectedType, selectedGenre, selectedYear, minRating, selectedPlatform, searchQuery]);

  // Sort media
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'calificacion') return b.communityRating - a.communityRating;
      if (sortBy === 'anadidas') return b.addedToListCount - a.addedToListCount;
      if (sortBy === 'ano') return b.year - a.year;
      if (sortBy === 'titulo') return a.title.localeCompare(b.title);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [filtered, sortBy]);

  const activeFiltersCount = 
    (selectedGenre !== 'Todos' ? 1 : 0) +
    (selectedYear !== 'todos' ? 1 : 0) +
    (minRating > 0 ? 1 : 0) +
    (selectedType !== 'todos' ? 1 : 0) +
    (selectedPlatform !== 'Todas' ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const resetAllFilters = () => {
    setSelectedGenre('Todos');
    setSelectedYear('todos');
    setMinRating(0);
    setSelectedType('todos');
    setSelectedPlatform('Todas');
    setSearchQuery('');
  };

  return (
    <div id="catalog-view-container" className="space-y-8 pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2 border-b border-white/5 pb-6">
        <div>
          <div className="flex items-center gap-2 text-rose-500 text-xs font-bold uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            Descubre & Clasifica
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
            Catálogo Completo
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Explora títulos de cine, series y anime, filtra por género, año de estreno y calificación mínima, y añade nuevas obras a la base de datos.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30 active:scale-95 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Añadir Nuevo Título
        </button>
      </div>

      {/* Filter and Search Hub */}
      <div className="p-4 sm:p-6 rounded-3xl bg-[#161618] border border-white/10 shadow-2xl space-y-5">
        
        {/* Search Bar and Type Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, director, actor..."
              className="w-full bg-[#0A0A0B] border border-white/10 text-sm text-white placeholder-slate-400 pl-10 pr-10 py-2.5 rounded-xl focus:border-rose-500 focus:outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Type Pills */}
          <div className="flex items-center gap-1 bg-[#0A0A0B] p-1 rounded-xl border border-white/10 overflow-x-auto">
            {(['todos', 'pelicula', 'serie', 'anime', 'documental'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize whitespace-nowrap transition-all ${
                  selectedType === t
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'todos' ? 'Todos' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Últimas 5 búsquedas recientes */}
        <RecentSearches
          onSelectSearch={(term) => setSearchQuery(term)}
          currentQuery={searchQuery}
          onClearCurrentQuery={() => setSearchQuery('')}
        />

        {/* PRIMARY FILTER BAR: Género, Año de Estreno y Calificación Mínima */}
        <div className="p-4 rounded-2xl bg-[#0A0A0B]/80 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400">
              <SlidersHorizontal className="w-4 h-4" />
              <span>Barra de Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="ml-1 px-2 py-0.2 text-[10px] rounded-full bg-rose-600 text-white font-extrabold">
                  {activeFiltersCount} activo{activeFiltersCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {activeFiltersCount > 0 && (
              <button
                onClick={resetAllFilters}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-semibold transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer filtros</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* 1. FILTRO POR GÉNERO */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-rose-400" />
                <span>Género</span>
              </label>
              <div className="relative">
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="w-full bg-[#161618] border border-white/10 text-xs text-white px-3 py-2.5 rounded-xl focus:border-rose-500 focus:outline-none appearance-none cursor-pointer transition-colors"
                >
                  {availableGenres.map((genre) => (
                    <option key={genre} value={genre}>
                      {genre === 'Todos' ? 'Todos los géneros' : genre}
                    </option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 2. FILTRO POR AÑO DE ESTRENO */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-rose-400" />
                <span>Año de Estreno</span>
              </label>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full bg-[#161618] border border-white/10 text-xs text-white px-3 py-2.5 rounded-xl focus:border-rose-500 focus:outline-none appearance-none cursor-pointer transition-colors"
                >
                  <option value="todos">Todos los años</option>
                  <optgroup label="Rangos por Década">
                    <option value="2020s">Década 2020 (2020 - Actual)</option>
                    <option value="2010s">Década 2010 (2010 - 2019)</option>
                    <option value="pre-2010">Clásicos (Antes de 2010)</option>
                  </optgroup>
                  <optgroup label="Año Específico">
                    {availableYears.map((year) => (
                      <option key={year} value={year.toString()}>
                        Año {year}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <Calendar className="absolute right-3 top-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 3. FILTRO POR CALIFICACIÓN MÍNIMA */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>Calificación Mínima</span>
              </label>
              <div className="relative">
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(parseFloat(e.target.value))}
                  className="w-full bg-[#161618] border border-white/10 text-xs text-white px-3 py-2.5 rounded-xl focus:border-rose-500 focus:outline-none appearance-none cursor-pointer transition-colors"
                >
                  <option value="0">Cualquier calificación (0+ ★)</option>
                  <option value="3.0">⭐⭐⭐ 3.0 o más</option>
                  <option value="3.5">⭐⭐⭐ 3.5 o más</option>
                  <option value="4.0">⭐⭐⭐⭐ 4.0 o más</option>
                  <option value="4.5">⭐⭐⭐⭐ 4.5 o más</option>
                  <option value="4.8">⭐⭐⭐⭐⭐ 4.8 o más (Obras Maestras)</option>
                </select>
                <Star className="absolute right-3 top-3 w-3.5 h-3.5 text-amber-400 pointer-events-none" />
              </div>
            </div>

            {/* 4. FILTRO POR PLATAFORMA */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Tv className="w-3.5 h-3.5 text-rose-400" />
                <span>Plataforma</span>
              </label>
              <div className="relative">
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full bg-[#161618] border border-white/10 text-xs text-white px-3 py-2.5 rounded-xl focus:border-rose-500 focus:outline-none appearance-none cursor-pointer transition-colors"
                >
                  {ALL_PLATFORMS.map((plat) => (
                    <option key={plat} value={plat}>
                      {plat}
                    </option>
                  ))}
                </select>
                <Tv className="absolute right-3 top-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

          </div>

          {/* Quick Genre Pills Scroll */}
          <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex-shrink-0">
              Acceso rápido:
            </span>
            {availableGenres.slice(0, 10).map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all ${
                  selectedGenre === genre
                    ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                    : 'bg-[#161618] text-slate-400 border-white/5 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* Quick Star Rating Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Estrellas:
            </span>
            {[
              { val: 0, label: 'Todas' },
              { val: 3.5, label: '3.5+ ★' },
              { val: 4.0, label: '4.0+ ★' },
              { val: 4.5, label: '4.5+ ★' },
              { val: 4.8, label: '4.8+ ★ Top' }
            ].map(({ val, label }) => (
              <button
                key={val}
                onClick={() => setMinRating(val)}
                className={`px-2.5 py-0.5 rounded-md text-xs font-semibold transition-all ${
                  minRating === val
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sorting and Active Chips Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5">
          {/* Active Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedGenre !== 'Todos' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-300 text-xs font-medium">
                Género: <strong>{selectedGenre}</strong>
                <button onClick={() => setSelectedGenre('Todos')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedYear !== 'todos' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-300 text-xs font-medium">
                Año: <strong>{selectedYear === '2020s' ? '2020+' : selectedYear === '2010s' ? '2010-2019' : selectedYear === 'pre-2010' ? 'Antes de 2010' : selectedYear}</strong>
                <button onClick={() => setSelectedYear('todos')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {minRating > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium">
                Mínimo: <strong>{minRating}★</strong>
                <button onClick={() => setMinRating(0)} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {selectedPlatform !== 'Todas' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 border border-white/10 text-slate-200 text-xs font-medium">
                Plataforma: <strong>{selectedPlatform}</strong>
                <button onClick={() => setSelectedPlatform('Todas')} className="hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-slate-400 font-semibold">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#0A0A0B] border border-white/10 text-xs text-slate-200 px-3 py-1.5 rounded-xl focus:border-rose-500 focus:outline-none"
            >
              <option value="calificacion">Mayor Calificación</option>
              <option value="anadidas">Más Añadidas a Listas</option>
              <option value="ano">Año de Estreno (Reciente a Antiguo)</option>
              <option value="recientes">Recién Registradas</option>
              <option value="titulo">Título (A-Z)</option>
            </select>
          </div>
        </div>

      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>Mostrando <strong>{sorted.length}</strong> de {mediaList.length} títulos</span>
        {activeFiltersCount > 0 && (
          <button
            onClick={resetAllFilters}
            className="text-rose-400 hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            Limpiar todos los filtros ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* Grid */}
      {sorted.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {sorted.map((media) => (
            <MediaCard key={media.id} media={media} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 px-4 border border-dashed border-white/10 rounded-3xl bg-[#161618]/50 space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-600/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
            <Film className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">No se encontraron títulos con estos filtros</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Prueba cambiando los criterios de búsqueda o añade la película que buscas a CineTrack.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/30 transition-colors"
          >
            + Añadir Esta Película Ahora
          </button>
        </div>
      )}

    </div>
  );
};
