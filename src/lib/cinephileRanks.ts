import type { MediaItem, UserReview } from '../types';

export interface CinephileBadge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
  accent: string;
}

export interface CinephileLevel {
  level: number;
  title: string;
  icon: string;
  minXp: number;
  nextXp: number | null;
  gradient: string;
  border: string;
  textColor: string;
}

export interface CinephileProfileStats {
  xp: number;
  level: CinephileLevel;
  nextLevelTitle: string | null;
  xpToNextLevel: number;
  levelProgressPct: number;
  badges: CinephileBadge[];
  unlockedCount: number;
}

const LEVELS: CinephileLevel[] = [
  {
    level: 1,
    title: 'Espectador Curioso',
    icon: '🎟️',
    minXp: 0,
    nextXp: 120,
    gradient: 'from-slate-500/20 to-slate-700/20',
    border: 'border-slate-500/30',
    textColor: 'text-slate-200',
  },
  {
    level: 2,
    title: 'Cinéfilo Nocturno',
    icon: '🍿',
    minXp: 120,
    nextXp: 300,
    gradient: 'from-sky-500/20 to-indigo-600/20',
    border: 'border-sky-400/35',
    textColor: 'text-sky-300',
  },
  {
    level: 3,
    title: 'Crítico de Culto',
    icon: '🎞️',
    minXp: 300,
    nextXp: 600,
    gradient: 'from-rose-500/20 to-pink-600/20',
    border: 'border-rose-400/40',
    textColor: 'text-rose-300',
  },
  {
    level: 4,
    title: 'Director de Sala',
    icon: '🎬',
    minXp: 600,
    nextXp: 1000,
    gradient: 'from-amber-500/20 to-orange-600/20',
    border: 'border-amber-400/40',
    textColor: 'text-amber-300',
  },
  {
    level: 5,
    title: 'Leyenda del Séptimo Arte',
    icon: '🏆',
    minXp: 1000,
    nextXp: null,
    gradient: 'from-amber-400/25 via-rose-500/20 to-purple-600/25',
    border: 'border-amber-300/50',
    textColor: 'text-amber-200',
  },
];

export function computeCinephileStats(
  myListEntries: { media: MediaItem; review: UserReview }[],
  mediaList: MediaItem[],
): CinephileProfileStats {
  const totalInList = myListEntries.length;
  const finishedEntries = myListEntries.filter((e) => e.review.status === 'terminada');
  const finishedCount = finishedEntries.length;

  const critiqueCount = myListEntries.filter(
    (e) =>
      (e.review.critique && e.review.critique.trim().length >= 12) ||
      (e.review.favoriteMoment && e.review.favoriteMoment.trim().length >= 6),
  ).length;

  const uniqueGenresSet = new Set<string>();
  finishedEntries.forEach((e) => {
    (e.media.genres || []).forEach((g) => uniqueGenresSet.add(g));
  });
  const uniqueGenresCount = uniqueGenresSet.size;

  const seriesOrAnimeCount = myListEntries.filter(
    (e) => e.media.type === 'serie' || e.media.type === 'anime',
  ).length;

  const fiveStarCount = myListEntries.filter((e) => e.review.stars >= 5).length;

  const customAddedCount = mediaList.filter((m) => m.isCustomUserCreated).length;

  const xp =
    totalInList * 25 +
    finishedCount * 50 +
    critiqueCount * 40 +
    uniqueGenresCount * 15 +
    Math.min(customAddedCount, 10) * 20;

  let currentLevel = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXp) {
      currentLevel = lvl;
    }
  }

  const nextLevel = LEVELS.find((l) => l.level === currentLevel.level + 1) || null;
  let levelProgressPct = 100;
  let xpToNextLevel = 0;

  if (nextLevel && currentLevel.nextXp !== null) {
    const span = currentLevel.nextXp - currentLevel.minXp;
    const gained = xp - currentLevel.minXp;
    levelProgressPct = Math.min(100, Math.max(0, Math.round((gained / span) * 100)));
    xpToNextLevel = Math.max(0, currentLevel.nextXp - xp);
  }

  const badges: CinephileBadge[] = [
    {
      id: 'primera_funcion',
      title: 'Primera Función',
      description: 'Añade tu primera película o serie a Mi Lista.',
      icon: '🎟️',
      unlocked: totalInList >= 1,
      progress: Math.min(totalInList, 1),
      target: 1,
      accent: 'from-rose-500/20 to-rose-600/5 border-rose-500/40',
    },
    {
      id: 'maratonista',
      title: 'Maratonista',
      description: 'Completa 3 o más obras como "Terminadas".',
      icon: '🍿',
      unlocked: finishedCount >= 3,
      progress: Math.min(finishedCount, 3),
      target: 3,
      accent: 'from-amber-500/20 to-amber-600/5 border-amber-500/40',
    },
    {
      id: 'pluma_de_oro',
      title: 'Pluma de Oro',
      description: 'Escribe al menos 2 críticas o momentos favoritos.',
      icon: '✍️',
      unlocked: critiqueCount >= 2,
      progress: Math.min(critiqueCount, 2),
      target: 2,
      accent: 'from-sky-500/20 to-indigo-600/5 border-sky-500/40',
    },
    {
      id: 'explorador_generos',
      title: 'Paladar Ecléctico',
      description: 'Termina títulos de 4 géneros cinematográficos distintos.',
      icon: '🌍',
      unlocked: uniqueGenresCount >= 4,
      progress: Math.min(uniqueGenresCount, 4),
      target: 4,
      accent: 'from-emerald-500/20 to-teal-600/5 border-emerald-500/40',
    },
    {
      id: 'serie_adicto',
      title: 'Universos Paralelos',
      description: 'Registra 2 o más series o animes en tu bitácora.',
      icon: '⛩️',
      unlocked: seriesOrAnimeCount >= 2,
      progress: Math.min(seriesOrAnimeCount, 2),
      target: 2,
      accent: 'from-purple-500/20 to-pink-600/5 border-purple-500/40',
    },
    {
      id: 'obra_maestra',
      title: 'Cazador de Joyas',
      description: 'Otorga una puntuación perfecta de 5 estrellas.',
      icon: '⭐',
      unlocked: fiveStarCount >= 1,
      progress: Math.min(fiveStarCount, 1),
      target: 1,
      accent: 'from-yellow-500/20 to-amber-600/5 border-yellow-400/40',
    },
    {
      id: 'curador_cine',
      title: 'Curador Cinéfilo',
      description: 'Acumula 5 o más obras organizadas en Mi Lista.',
      icon: '📽️',
      unlocked: totalInList >= 5,
      progress: Math.min(totalInList, 5),
      target: 5,
      accent: 'from-cyan-500/20 to-blue-600/5 border-cyan-500/40',
    },
    {
      id: 'leyenda_screenlog',
      title: 'Director de Sala',
      description: 'Alcanza los 600 XP de experiencia cinematográfica.',
      icon: '👑',
      unlocked: xp >= 600,
      progress: Math.min(xp, 600),
      target: 600,
      accent: 'from-amber-400/25 via-rose-500/15 to-purple-500/10 border-amber-300/50',
    },
  ];

  return {
    xp,
    level: currentLevel,
    nextLevelTitle: nextLevel ? `${nextLevel.icon} ${nextLevel.title}` : null,
    xpToNextLevel,
    levelProgressPct,
    badges,
    unlockedCount: badges.filter((b) => b.unlocked).length,
  };
}
