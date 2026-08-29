import React, { useState } from 'react';
import { 
  Compass, 
  Search, 
  Filter, 
  Sparkles, 
  Plus, 
  SlidersHorizontal,
  Star,
  Film
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { MediaType } from '../types';
import { MediaCard } from './MediaCard';

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
  const [selectedPlatform, setSelectedPlatform] = useState('Todas');
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'calificacion' | 'anadidas' | 'recientes' | 'ano' | 'titulo'>('calificacion');

  // Filter media
  const filtered = mediaList.filter((item) => {
    if (selectedType !== 'todos' && item.type !== selectedType) return false;
    if (selectedGenre !== 'Todos' && !item.genres.includes(selectedGenre)) return false;
    if (selectedPlatform !== 'Todas' && item.defaultPlatform !== selectedPlatform) return false;
    if (item.communityRating < minRating) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q) || (item.originalTitle || '').toLowerCase().includes(q);
      const matchDir = item.director.toLowerCase().includes(q);
      const matchCast = item.cast.some((c) => c.toLowerCase().includes(q));
      if (!matchTitle && !matchDir && !matchCast) return false;
    }
    return true;
  });

  // Sort media
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'calificacion') return b.communityRating - a.communityRating;
    if (sortBy === 'anadidas') return b.addedToListCount - a.addedToListCount;
    if (sortBy === 'ano') return b.year - a.year;
    if (sortBy === 'titulo') return a.title.localeCompare(b.title);
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

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
            Explora títulos de cine, series y anime, filtra por géneros y plataformas, y añade nuevas obras a la base de datos.
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
      <div className="p-4 sm:p-5 rounded-2xl bg-[#161618] border border-white/10 space-y-4">
        
        {/* Search Bar and Type Selector */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por título, director, actor..."
              className="w-full bg-[#0A0A0B] border border-white/10 text-sm text-white placeholder-slate-400 pl-10 pr-4 py-2.5 rounded-xl focus:border-rose-500 focus:outline-none"
            />
          </div>

          {/* Type Pills */}
          <div className="flex items-center gap-1 bg-[#0A0A0B] p-1 rounded-xl border border-white/10">
            {(['todos', 'pelicula', 'serie', 'anime', 'documental'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  selectedType === t
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {t === 'todos' ? 'Todos' : t}
              </button>
            ))}
          </div>
        </div>

        {/* Genres Row */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1 flex-shrink-0">
            Género:
          </span>
          {ALL_GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap border transition-all ${
                selectedGenre === genre
                  ? 'bg-rose-600 text-white border-rose-500 font-bold shadow-sm'
                  : 'bg-[#0A0A0B] text-slate-400 border-white/5 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Platform, Min Rating and Sorting Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
          <div className="flex flex-wrap items-center gap-3">
            {/* Platform select */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Plataforma:</span>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="bg-[#0A0A0B] border border-white/10 text-xs text-slate-200 px-3 py-1.5 rounded-xl focus:border-rose-500 focus:outline-none"
              >
                {ALL_PLATFORMS.map((plat) => (
                  <option key={plat} value={plat}>
                    {plat}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Rating */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Mín. estrellas:</span>
              <select
                value={minRating}
                onChange={(e) => setMinRating(parseFloat(e.target.value))}
                className="bg-[#0A0A0B] border border-white/10 text-xs text-slate-200 px-3 py-1.5 rounded-xl focus:border-rose-500 focus:outline-none"
              >
                <option value="0">Cualquiera (0+)</option>
                <option value="4.0">⭐ 4.0 o más</option>
                <option value="4.5">⭐ 4.5 o más</option>
                <option value="4.8">⭐ 4.8 o más</option>
              </select>
            </div>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-[#0A0A0B] border border-white/10 text-xs text-slate-200 px-3 py-1.5 rounded-xl focus:border-rose-500 focus:outline-none"
            >
              <option value="calificacion">Mayor Calificación</option>
              <option value="anadidas">Más Añadidas a Listas</option>
              <option value="ano">Año de Estreno</option>
              <option value="recientes">Recién Registradas</option>
              <option value="titulo">Título (A-Z)</option>
            </select>
          </div>
        </div>

      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>Mostrando <strong>{sorted.length}</strong> de {mediaList.length} títulos</span>
        {(selectedGenre !== 'Todos' || selectedType !== 'todos' || selectedPlatform !== 'Todas' || minRating > 0 || searchQuery) && (
          <button
            onClick={() => {
              setSelectedGenre('Todos');
              setSelectedType('todos');
              setSelectedPlatform('Todas');
              setMinRating(0);
              setSearchQuery('');
            }}
            className="text-rose-400 hover:underline"
          >
            Limpiar filtros
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
