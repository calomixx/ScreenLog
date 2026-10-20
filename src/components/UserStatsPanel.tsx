import React, { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  BarChart3,
  Film,
  Star,
  Trophy,
  CheckCircle2,
  Sparkles,
  Filter,
  Layers,
  Clapperboard,
  Plus,
  Bookmark
} from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { OfflinePersistenceIndicator } from './OfflinePersistenceIndicator';

interface GenreStatItem {
  genre: string;
  count: number;
  avgStars: number;
  titles: {
    id: string;
    title: string;
    stars: number;
    year: number;
    posterUrl: string;
    type: string;
    status: string;
  }[];
}

const BAR_COLORS = [
  '#f43f5e', // rose-500
  '#fb7185', // rose-400
  '#f59e0b', // amber-500
  '#10b981', // emerald-500
  '#38bdf8', // sky-400
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
  '#14b8a6', // teal-500
  '#eab308'  // yellow-500
];

interface UserStatsPanelProps {
  standalone?: boolean;
}

export const UserStatsPanel: React.FC<UserStatsPanelProps> = ({ standalone = false }) => {
  const {
    myListEntries,
    currentUser,
    userName,
    userAvatar,
    setSelectedMediaId,
    setActiveTab,
    setIsAddModalOpen
  } = useMedia();

  const [scopeFilter, setScopeFilter] = useState<'terminadas' | 'solo_peliculas' | 'toda_lista'>('terminadas');
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  // Filter entries according to selected scope
  const filteredSourceEntries = useMemo(() => {
    if (scopeFilter === 'solo_peliculas') {
      return myListEntries.filter(
        (e) => e.review.status === 'terminada' && e.media.type === 'pelicula'
      );
    }
    if (scopeFilter === 'terminadas') {
      return myListEntries.filter((e) => e.review.status === 'terminada');
    }
    return myListEntries;
  }, [myListEntries, scopeFilter]);

  // Compute genre breakdown for Recharts BarChart
  const genreStats: GenreStatItem[] = useMemo(() => {
    const map: Record<
      string,
      {
        count: number;
        starsSum: number;
        ratedCount: number;
        titles: GenreStatItem['titles'];
      }
    > = {};

    filteredSourceEntries.forEach(({ media, review }) => {
      const genres =
        review.genres && review.genres.length > 0 ? review.genres : media.genres;

      genres.forEach((rawGenre) => {
        const g = rawGenre.trim();
        if (!g) return;
        if (!map[g]) {
          map[g] = { count: 0, starsSum: 0, ratedCount: 0, titles: [] };
        }
        map[g].count += 1;
        if (review.stars && review.stars > 0) {
          map[g].starsSum += review.stars;
          map[g].ratedCount += 1;
        }
        map[g].titles.push({
          id: media.id,
          title: media.title,
          stars: review.stars || media.communityRating,
          year: review.year || media.year,
          posterUrl: media.posterUrl,
          type: media.type,
          status: review.status
        });
      });
    });

    return Object.entries(map)
      .map(([genre, data]) => ({
        genre,
        count: data.count,
        avgStars:
          data.ratedCount > 0
            ? Number((data.starsSum / data.ratedCount).toFixed(1))
            : 0,
        titles: data.titles
      }))
      .sort((a, b) => b.count - a.count || b.avgStars - a.avgStars);
  }, [filteredSourceEntries]);

  const totalWatched = myListEntries.filter((e) => e.review.status === 'terminada').length;
  const totalMoviesWatched = myListEntries.filter(
    (e) => e.review.status === 'terminada' && e.media.type === 'pelicula'
  ).length;
  const topGenreItem = genreStats[0] || null;
  const highestRatedGenre = useMemo(() => {
    if (genreStats.length === 0) return null;
    return [...genreStats].sort((a, b) => b.avgStars - a.avgStars || b.count - a.count)[0];
  }, [genreStats]);

  const activeGenreObj = useMemo(() => {
    if (!selectedGenre) return null;
    return genreStats.find((g) => g.genre === selectedGenre) || null;
  }, [selectedGenre, genreStats]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data: GenreStatItem = payload[0].payload;
      return (
        <div className="bg-[#111114]/95 backdrop-blur-xl border border-rose-500/30 rounded-2xl p-4 shadow-2xl min-w-[210px] max-w-[270px]">
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 mb-2.5">
            <span className="font-display font-extrabold text-white text-sm">
              {data.genre}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-rose-600/20 border border-rose-500/30 text-rose-300 font-bold text-xs">
              {data.count} {data.count === 1 ? 'título' : 'títulos'}
            </span>
          </div>

          {data.avgStars > 0 && (
            <div className="flex items-center justify-between text-xs text-slate-300 mb-2.5">
              <span className="text-slate-400">Calificación media:</span>
              <span className="flex items-center gap-1 font-bold text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {data.avgStars} ★
              </span>
            </div>
          )}

          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Películas / Obras Incluidas:
            </span>
            <div className="space-y-1 max-h-28 overflow-hidden">
              {data.titles.slice(0, 4).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between text-xs text-slate-200 gap-2"
                >
                  <span className="truncate">• {t.title}</span>
                  <span className="text-[10px] text-amber-400 font-semibold flex-shrink-0">
                    {t.stars > 0 ? `${t.stars}★` : ''}
                  </span>
                </div>
              ))}
              {data.titles.length > 4 && (
                <span className="text-[10px] text-rose-400 italic block">
                  +{data.titles.length - 4} más...
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <section
      id="user-stats-panel"
      className={`${standalone ? 'py-2 space-y-8 pb-16' : 'space-y-6'}`}
    >
      {/* Standalone Page Header */}
      {standalone && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div className="flex items-center gap-4">
            <img
              src={userAvatar}
              alt={userName}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-rose-500/40 shadow-lg"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider mb-0.5">
                <BarChart3 className="w-4 h-4" />
                Panel de Estadísticas de Usuario
              </div>
              <h1 className="text-2xl sm:text-4xl font-display font-extrabold text-white tracking-tight">
                Estadísticas Cinéfilas de {currentUser ? currentUser.name : userName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Análisis visual interactivo de tus películas vistas por género, calificaciones promedio y hábitos de visualización.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('mi_lista')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5 text-rose-400" />
              Ir a Mi Lista
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-900/30 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              Registrar Película
            </button>
          </div>
        </div>
      )}

      {/* Standalone Offline Indicator */}
      {standalone && (
        <OfflinePersistenceIndicator />
      )}

      {/* Main Chart Card: Reduced compact default size, expands on hover */}
      <div className="rounded-3xl bg-[#161618]/95 border border-white/10 p-4 sm:p-5 shadow-xl space-y-4 group transition-all duration-500 ease-out hover:border-rose-500/40 hover:shadow-2xl hover:shadow-rose-950/25">
        {/* Card Header & Scope Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-600/15 text-rose-400 border border-rose-500/30 shadow-inner flex-shrink-0 group-hover:scale-110 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-display font-extrabold text-white tracking-tight">
                  Películas Vistas por Género
                </h2>
                <OfflinePersistenceIndicator compact />
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-400 group-hover:border-rose-500/40 group-hover:text-rose-300 transition-colors">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Pasa el cursor para ampliar
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Distribución en tiempo real según tus títulos completados.
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#0A0A0B] p-1.5 rounded-2xl border border-white/10 self-start lg:self-auto">
            <button
              onClick={() => {
                setScopeFilter('terminadas');
                setSelectedGenre(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                scopeFilter === 'terminadas'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Terminadas ({totalWatched})
            </button>

            <button
              onClick={() => {
                setScopeFilter('solo_peliculas');
                setSelectedGenre(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                scopeFilter === 'solo_peliculas'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              Solo Películas ({totalMoviesWatched})
            </button>

            <button
              onClick={() => {
                setScopeFilter('toda_lista');
                setSelectedGenre(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                scopeFilter === 'toda_lista'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-900/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Toda la Lista ({myListEntries.length})
            </button>
          </div>
        </div>

        {/* Summary KPI Strip: Compact default */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-2.5 sm:p-3 rounded-2xl bg-[#0A0A0B]/80 border border-white/5 flex items-center justify-between transition-all duration-300 group-hover:border-white/10">
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Obras Analizadas
              </span>
              <span className="text-lg sm:text-xl font-display font-black text-white mt-0.5 block">
                {filteredSourceEntries.length}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <Clapperboard className="w-4 h-4" />
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-[#0A0A0B]/80 border border-white/5 flex items-center justify-between transition-all duration-300 group-hover:border-white/10">
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Género Top
              </span>
              <span className="text-sm sm:text-base font-display font-extrabold text-rose-400 mt-0.5 block truncate">
                {topGenreItem ? `${topGenreItem.genre} (${topGenreItem.count})` : '—'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 flex-shrink-0">
              <Trophy className="w-4 h-4" />
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-[#0A0A0B]/80 border border-white/5 flex items-center justify-between transition-all duration-300 group-hover:border-white/10">
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Mejor Calificado
              </span>
              <span className="text-sm sm:text-base font-display font-extrabold text-amber-400 mt-0.5 block truncate">
                {highestRatedGenre && highestRatedGenre.avgStars > 0
                  ? `${highestRatedGenre.genre} (${highestRatedGenre.avgStars}★)`
                  : '—'}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 flex-shrink-0">
              <Star className="w-4 h-4" />
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-2xl bg-[#0A0A0B]/80 border border-white/5 flex items-center justify-between transition-all duration-300 group-hover:border-white/10">
            <div>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Géneros Totales
              </span>
              <span className="text-lg sm:text-xl font-display font-black text-sky-400 mt-0.5 block">
                {genreStats.length}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Recharts BarChart Area: Compact by default (h-36/h-44), expands to full (h-72/h-80) on hover */}
        {genreStats.length > 0 ? (
          <div className="space-y-4">
            <div className="w-full bg-[#0A0A0B]/80 rounded-2xl border border-white/5 p-2.5 sm:p-4 transition-all duration-500 ease-in-out h-36 sm:h-44 group-hover:h-72 sm:group-hover:h-80 relative overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={genreStats}
                  margin={{ top: 8, right: 12, left: -14, bottom: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="genre"
                    tick={{ fill: '#cbd5e1', fontSize: 11, fontWeight: 600 }}
                    axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                    tickLine={false}
                    interval={0}
                    height={28}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: 'rgba(244, 63, 94, 0.08)' }}
                  />
                  <Bar
                    dataKey="count"
                    name="Películas vistas"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={50}
                    onClick={(data: any) => {
                      if (data && data.genre) {
                        setSelectedGenre((prev) =>
                          prev === data.genre ? null : data.genre
                        );
                      }
                    }}
                    className="cursor-pointer"
                  >
                    {genreStats.map((entry, index) => {
                      const isSelected = selectedGenre === entry.genre;
                      const isDimmed = selectedGenre && !isSelected;
                      return (
                        <Cell
                          key={`cell-${entry.genre}`}
                          fill={BAR_COLORS[index % BAR_COLORS.length]}
                          fillOpacity={isDimmed ? 0.35 : 0.95}
                          stroke={isSelected ? '#ffffff' : 'none'}
                          strokeWidth={isSelected ? 2 : 0}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Interactive Genre Filter Chips */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5 text-rose-400" />
                  Filtrar por género:
                </span>
                <button
                  onClick={() => setSelectedGenre(null)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedGenre === null
                      ? 'bg-white text-slate-950 font-bold'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  Todos ({genreStats.length})
                </button>
                {genreStats.map((g, idx) => (
                  <button
                    key={g.genre}
                    onClick={() =>
                      setSelectedGenre((prev) => (prev === g.genre ? null : g.genre))
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                      selectedGenre === g.genre
                        ? 'bg-rose-600/25 text-white border-rose-500 shadow-sm'
                        : 'bg-white/5 text-slate-300 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }}
                    />
                    <span>{g.genre}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-slate-300 font-bold">
                      {g.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Drilldown of movies in the selected genre */}
            {activeGenreObj && (
              <div className="p-4 rounded-2xl bg-[#0A0A0B] border border-rose-500/30 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-rose-400">
                      Títulos en {activeGenreObj.genre} ({activeGenreObj.count})
                    </span>
                    {activeGenreObj.avgStars > 0 && (
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                        • Promedio {activeGenreObj.avgStars}★
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedGenre(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Ver todos
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {activeGenreObj.titles.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedMediaId(item.id)}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-[#161618] border border-white/10 hover:border-rose-500/40 cursor-pointer transition-all group"
                    >
                      <img
                        src={item.posterUrl}
                        alt={item.title}
                        className="w-10 h-14 object-cover rounded-lg flex-shrink-0 border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors truncate">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {item.year} • <span className="capitalize">{item.type}</span>
                        </p>
                        <div className="flex items-center gap-1 mt-1 text-amber-400 text-xs font-bold">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{item.stars}★</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12 px-4 rounded-2xl bg-[#0A0A0B]/60 border border-dashed border-white/10 space-y-3">
            <BarChart3 className="w-10 h-10 text-rose-500/60 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Aún no hay películas registradas en este filtro
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Marca películas como "Terminada" en el catálogo o cambia el filtro a "Toda Mi Lista" para visualizar tus estadísticas por género.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-1">
              <button
                onClick={() => setScopeFilter('toda_lista')}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
              >
                Ver Toda Mi Lista
              </button>
              <button
                onClick={() => setActiveTab('explorar')}
                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors"
              >
                Explorar Catálogo
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
