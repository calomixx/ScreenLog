import React, { useMemo } from 'react';
import { Award, CheckCircle2, Lock, Sparkles, Zap } from 'lucide-react';
import { useMedia } from '../context/MediaContext';
import { computeCinephileStats } from '../lib/cinephileRanks';

interface CinephileBadgesSectionProps {
  compact?: boolean;
}

export const CinephileBadgesSection: React.FC<CinephileBadgesSectionProps> = ({ compact = false }) => {
  const { myListEntries, mediaList } = useMedia();

  const stats = useMemo(
    () => computeCinephileStats(myListEntries, mediaList),
    [myListEntries, mediaList],
  );

  return (
    <section
      id="cinephile-badges-section"
      className="rounded-3xl bg-[#131317] border border-white/10 p-5 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden"
    >
      {/* Subtle Ambient Aura */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-rose-500/10 blur-[100px] pointer-events-none" />

      {/* Top Level & XP Progress Banner */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-white/[0.07]">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br ${stats.level.gradient} border ${stats.level.border} flex items-center justify-center text-3xl sm:text-4xl shadow-lg shrink-0`}
          >
            <span role="img" aria-label={stats.level.title}>
              {stats.level.icon}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-[10px] font-extrabold uppercase tracking-wider text-rose-300">
                <Award className="w-3 h-3" />
                Nivel {stats.level.level}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                <Zap className="w-3 h-3" />
                {stats.xp} XP
              </span>
            </div>
            <h3 className={`text-xl sm:text-2xl font-display font-black tracking-tight ${stats.level.textColor}`}>
              {stats.level.title}
            </h3>
            <p className="text-xs text-slate-400">
              {stats.unlockedCount} de {stats.badges.length} insignias cinematográficas desbloqueadas
            </p>
          </div>
        </div>

        {/* XP Progress Meter */}
        <div className="w-full lg:w-80 bg-black/40 border border-white/10 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Progreso de Rango</span>
            <span className="font-bold text-amber-300">{stats.levelProgressPct}%</span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 transition-all duration-700 ease-out"
              style={{ width: `${Math.max(stats.levelProgressPct, 4)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 flex items-center justify-between">
            {stats.nextLevelTitle ? (
              <>
                <span>Faltan <strong className="text-white">{stats.xpToNextLevel} XP</strong></span>
                <span className="text-slate-300 truncate max-w-[145px]">Siguiente: {stats.nextLevelTitle}</span>
              </>
            ) : (
              <span className="text-amber-300 font-semibold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> ¡Has alcanzado el rango máximo!
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Badges Showcase Grid */}
      {!compact && (
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {stats.badges.map((badge) => {
            const pct = Math.min(100, Math.round((badge.progress / badge.target) * 100));
            return (
              <div
                key={badge.id}
                className={`relative rounded-2xl p-4 border transition-all duration-300 flex flex-col justify-between gap-3 ${
                  badge.unlocked
                    ? `bg-gradient-to-br ${badge.accent} shadow-lg hover:-translate-y-0.5`
                    : 'bg-white/[0.02] border-white/[0.06] opacity-75 hover:opacity-95'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border ${
                      badge.unlocked
                        ? 'bg-black/35 border-white/20 shadow-inner'
                        : 'bg-white/5 border-white/10 grayscale opacity-60'
                    }`}
                  >
                    {badge.icon}
                  </div>
                  {badge.unlocked ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-extrabold uppercase tracking-wider">
                      <CheckCircle2 className="w-2.5 h-2.5" /> Logrado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 text-[9px] font-bold">
                      <Lock className="w-2.5 h-2.5" /> {badge.progress}/{badge.target}
                    </span>
                  )}
                </div>

                <div>
                  <h4 className={`text-sm font-display font-bold ${badge.unlocked ? 'text-white' : 'text-slate-300'}`}>
                    {badge.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                    {badge.description}
                  </p>
                </div>

                <div className="h-1.5 w-full rounded-full bg-black/40 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      badge.unlocked
                        ? 'bg-gradient-to-r from-emerald-400 to-amber-300'
                        : 'bg-slate-600'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
