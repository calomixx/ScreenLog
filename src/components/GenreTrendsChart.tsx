import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3, CheckCircle2, Layers } from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import type { WatchStatus } from '../types';

export interface GenreTrendDatum {
  genre: string;
  count: number;
  avgStars: number;
}

const CHART_COLORS = [
  '#f43f5e',
  '#fb7185',
  '#f59e0b',
  '#10b981',
  '#38bdf8',
  '#a855f7',
  '#ec4899',
  '#6366f1',
];

export const GenreTrendsChart: React.FC = () => {
  const { myListEntries } = useMedia();
  const [statusFilter, setStatusFilter] = useState<WatchStatus | 'todos'>('terminada');

  // 1. Transformación y agregación memoizada desde 'Mi Lista'
  const genreData = useMemo<GenreTrendDatum[]>(() => {
    const accumulator = new Map<string, { count: number; starsTotal: number; ratedCount: number }>();

    const filtered = myListEntries.filter(({ review }) =>
      statusFilter === 'todos' ? true : review.status === statusFilter,
    );

    for (const { media, review } of filtered) {
      const genres = review.genres?.length ? review.genres : media.genres;
      for (const rawGenre of genres) {
        const genre = rawGenre.trim();
        if (!genre) continue;

        const current = accumulator.get(genre) ?? { count: 0, starsTotal: 0, ratedCount: 0 };
        current.count += 1;
        if (review.stars > 0) {
          current.starsTotal += review.stars;
          current.ratedCount += 1;
        }
        accumulator.set(genre, current);
      }
    }

    return Array.from(accumulator.entries())
      .map(([genre, stats]) => ({
        genre,
        count: stats.count,
        avgStars: stats.ratedCount > 0 ? Number((stats.starsTotal / stats.ratedCount).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count || b.avgStars - a.avgStars)
      .slice(0, 8);
  }, [myListEntries, statusFilter]);

  return (
    <section className="rounded-3xl bg-[#161618] border border-white/10 p-5 shadow-xl space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-rose-600/15 text-rose-400 border border-rose-500/30">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Tendencias de Géneros en Mi Lista
            </h3>
            <p className="text-xs text-slate-400">
              Frecuencia y calificación media según tu historial de visualización
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0A0A0B] p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('terminada')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              statusFilter === 'terminada'
                ? 'bg-rose-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Vistas
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              statusFilter === 'todos'
                ? 'bg-rose-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Toda Mi Lista
          </button>
        </div>
      </header>

      {genreData.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-center text-xs text-slate-400 border border-dashed border-white/10 rounded-2xl p-6">
          Aún no hay títulos en este estado dentro de tu lista para calcular tendencias por género.
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={genreData} margin={{ top: 10, right: 16, left: -16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="genre"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                contentStyle={{
                  backgroundColor: '#0A0A0B',
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#f8fafc',
                }}
                formatter={(value: number, name: string, item: { payload?: GenreTrendDatum }) => {
                  if (name === 'count') {
                    const avg = item.payload?.avgStars ? ` (★ ${item.payload.avgStars})` : '';
                    return [`${value} título(s)${avg}`, 'Cantidad'];
                  }
                  return [value, name];
                }}
              />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={44}>
                {genreData.map((entry, index) => (
                  <Cell key={entry.genre} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};
