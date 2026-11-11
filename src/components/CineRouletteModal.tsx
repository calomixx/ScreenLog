import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dices,
  X,
  Sparkles,
  Clock,
  Filter,
  CheckCircle2,
  Bookmark,
  Star,
  Film,
  Tv,
  ArrowRight,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useMedia } from '../context/MediaContext';
import { MediaItem } from '../types';

type TimeFilter = 'todos' | 'flash' | 'estandar' | 'epica' | 'series';
type SourceFilter = 'catalogo' | 'pendientes' | 'top';

function parseDurationMinutes(durationStr?: string): number {
  if (!durationStr) return 110;
  const hMatch = durationStr.match(/(\d+)\s*h/i);
  const mMatch = durationStr.match(/(\d+)\s*m/i);
  const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
  const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
  return hours * 60 + mins || 110;
}

// Native Web Audio mechanical tick (zero network dependencies)
function playMechanicalTick(audioCtxRef: React.MutableRefObject<AudioContext | null>, soundEnabled: boolean) {
  if (!soundEnabled || typeof window === 'undefined') return;
  try {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(650, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.035);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.035);
  } catch {
    // Ignore audio permission/state errors
  }
}

// Victory fanfare chord
function playFanfare(audioCtxRef: React.MutableRefObject<AudioContext | null>, soundEnabled: boolean) {
  if (!soundEnabled || typeof window === 'undefined') return;
  try {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    chords.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.4);
    });
  } catch {
    // Ignore audio permission/state errors
  }
}

export const CineRouletteModal: React.FC = () => {
  const {
    isRouletteOpen,
    closeRoulette,
    mediaList,
    myListEntries,
    setSelectedMediaId,
    updateMediaStatus,
    getReview,
    showToast,
  } = useMedia();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('todos');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('catalogo');
  const [selectedGenre, setSelectedGenre] = useState<string>('todos');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [winner, setWinner] = useState<MediaItem | null>(null);
  const [reelItems, setReelItems] = useState<MediaItem[]>([]);
  const [activeReelIndex, setActiveReelIndex] = useState<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const spinIntervalRef = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Collect pending items in user's list
  const pendingItems = useMemo(() => {
    return myListEntries
      .filter((entry) => entry.review.status === 'pendiente')
      .map((entry) => entry.media);
  }, [myListEntries]);

  // Candidate pool based on filters
  const candidates = useMemo(() => {
    let pool: MediaItem[] = mediaList;

    if (sourceFilter === 'pendientes') {
      pool = pendingItems.length > 0 ? pendingItems : mediaList;
    } else if (sourceFilter === 'top') {
      pool = mediaList.filter((m) => m.communityRating >= 4.4 || (m.detailedVotes?.totalVotes ?? 0) > 0);
    }

    return pool.filter((item) => {
      // Time filter
      if (timeFilter === 'flash') {
        if (item.type !== 'pelicula' || parseDurationMinutes(item.duration) > 100) return false;
      } else if (timeFilter === 'estandar') {
        const mins = parseDurationMinutes(item.duration);
        if (item.type !== 'pelicula' || mins < 100 || mins > 135) return false;
      } else if (timeFilter === 'epica') {
        if (item.type !== 'pelicula' || parseDurationMinutes(item.duration) <= 135) return false;
      } else if (timeFilter === 'series') {
        if (item.type !== 'serie' && item.type !== 'anime') return false;
      }

      // Genre filter
      if (selectedGenre !== 'todos') {
        if (!item.genres.some((g) => g.toLowerCase() === selectedGenre.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [mediaList, pendingItems, sourceFilter, timeFilter, selectedGenre]);

  // Available genres from current media pool
  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    mediaList.forEach((m) => m.genres.forEach((g) => set.add(g)));
    return ['todos', ...Array.from(set).slice(0, 7)];
  }, [mediaList]);

  // Check if winner is already in user's list
  const winnerReview = winner ? getReview(winner.id) : undefined;
  const isWinnerInList = Boolean(winnerReview);

  // Close on Escape or click outside
  useEffect(() => {
    if (!isRouletteOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSpinning) {
        closeRoulette();
      } else if (e.key === ' ' && !isSpinning && candidates.length > 0) {
        // Space to spin if focus is not an input
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          spin();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRouletteOpen, isSpinning, candidates]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) window.clearInterval(spinIntervalRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, []);

  const spin = useCallback(() => {
    if (candidates.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setWinner(null);

    // Build an animated sequence reel (at least 24 steps for thrilling acceleration & deceleration)
    const shuffled: MediaItem[] = [];
    for (let i = 0; i < 28; i++) {
      shuffled.push(candidates[Math.floor(Math.random() * candidates.length)]);
    }
    // Target winner
    const chosenWinner = candidates[Math.floor(Math.random() * candidates.length)];
    shuffled.push(chosenWinner);
    setReelItems(shuffled);
    setActiveReelIndex(0);

    // Realistic physics: start fast, gradually increase interval delay
    let currentStep = 0;
    const totalSteps = shuffled.length;
    let currentDelay = 45; // ms

    const runStep = () => {
      setActiveReelIndex(currentStep);
      playMechanicalTick(audioCtxRef, soundEnabled);

      currentStep += 1;
      if (currentStep < totalSteps) {
        // Smooth ease-out brake curve: ramp up delay significantly in last 8 steps
        const remaining = totalSteps - currentStep;
        if (remaining <= 8) {
          currentDelay += 35 + (8 - remaining) * 20;
        } else if (remaining <= 14) {
          currentDelay += 12;
        } else {
          currentDelay = Math.min(75, currentDelay + 1);
        }
        window.setTimeout(runStep, currentDelay);
      } else {
        // Winner reached!
        setIsSpinning(false);
        setWinner(chosenWinner);
        playFanfare(audioCtxRef, soundEnabled);

        // Confetti celebration
        confetti({
          particleCount: 70,
          spread: 65,
          origin: { y: 0.65 },
          colors: ['#f43f5e', '#fb7185', '#fbbf24', '#38bdf8', '#a855f7'],
        });
      }
    };

    window.setTimeout(runStep, currentDelay);
  }, [candidates, isSpinning, soundEnabled]);

  const handleOpenWinnerDetail = () => {
    if (!winner) return;
    setSelectedMediaId(winner.id);
    closeRoulette();
  };

  const handleAddWinnerToList = () => {
    if (!winner) return;
    updateMediaStatus(winner.id, 'pendiente');
    showToast(`"${winner.title}" guardada en tus pendientes`, 'success');
  };

  if (!isRouletteOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="roulette-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-xl overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSpinning) closeRoulette();
      }}
    >
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        className="relative w-full max-w-2xl bg-gradient-to-b from-[#18181D] via-[#141418] to-[#0E0E12] border border-white/15 rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),0_0_50px_rgba(244,63,94,0.15)] overflow-hidden"
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-20 inset-x-0 h-40 bg-gradient-to-b from-rose-600/20 via-amber-500/10 to-transparent blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="relative flex items-center justify-between px-5 sm:px-6 pt-5 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 text-rose-400 shadow-inner">
              <Dices className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 id="roulette-modal-title" className="text-lg sm:text-xl font-display font-black text-white flex items-center gap-2">
                ¿Qué Veo Hoy?
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Ruleta
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Deja que el azar cinéfilo elija tu próxima película o serie
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
              title={soundEnabled ? 'Silenciar ruleta' : 'Activar efectos de sonido'}
              aria-label={soundEnabled ? 'Silenciar ruleta' : 'Activar efectos de sonido'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>

            <button
              type="button"
              onClick={closeRoulette}
              disabled={isSpinning}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-white border border-white/10 transition-colors disabled:opacity-40"
              aria-label="Cerrar ruleta"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6">
          {/* Filter Bar (collapsible or compact) */}
          <div className="space-y-3.5 bg-black/40 p-4 rounded-2xl border border-white/5">
            {/* Row 1: Source & Time */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              {/* Source */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-400 font-semibold text-[11px] mr-1">Fuente:</span>
                <button
                  type="button"
                  disabled={isSpinning}
                  onClick={() => setSourceFilter('catalogo')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    sourceFilter === 'catalogo'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  Todo ({mediaList.length})
                </button>
                {pendingItems.length > 0 && (
                  <button
                    type="button"
                    disabled={isSpinning}
                    onClick={() => setSourceFilter('pendientes')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      sourceFilter === 'pendientes'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    Mis Pendientes ({pendingItems.length})
                  </button>
                )}
                <button
                  type="button"
                  disabled={isSpinning}
                  onClick={() => setSourceFilter('top')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    sourceFilter === 'top'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  ★ 4.5+ Top
                </button>
              </div>

              {/* Candidates Counter */}
              <div className="text-[11px] text-slate-400 sm:text-right">
                <span className="text-white font-bold">{candidates.length}</span> títulos disponibles
              </div>
            </div>

            {/* Row 2: Duration Filter */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1 border-t border-white/5">
              <span className="text-slate-400 font-semibold text-[11px] mr-1 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> Tiempo:
              </span>
              {[
                { id: 'todos', label: 'Cualquiera' },
                { id: 'flash', label: '< 100m (Rápida)' },
                { id: 'estandar', label: '100-135m (Estándar)' },
                { id: 'epica', label: '> 135m (Épica)' },
                { id: 'series', label: '📺 Series' },
              ].map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  disabled={isSpinning}
                  onClick={() => setTimeFilter(tf.id as TimeFilter)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                    timeFilter === tf.id
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Row 3: Genre Chips */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1 border-t border-white/5">
              <span className="text-slate-400 font-semibold text-[11px] mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3 text-rose-400" /> Género:
              </span>
              {availableGenres.map((g) => (
                <button
                  key={g}
                  type="button"
                  disabled={isSpinning}
                  onClick={() => setSelectedGenre(g)}
                  className={`px-2 py-0.5 rounded-md text-[11px] capitalize transition-all ${
                    selectedGenre === g
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* MAIN ROULETTE STAGE */}
          <div className="relative min-h-[260px] sm:min-h-[290px] flex flex-col items-center justify-center rounded-2xl bg-black/50 border border-white/10 p-5 overflow-hidden">
            {/* Visual Reel During Spin */}
            {isSpinning && reelItems.length > 0 && (
              <div className="w-full flex flex-col items-center justify-center space-y-4">
                <div className="relative w-44 sm:w-52 h-64 sm:h-72 rounded-2xl overflow-hidden border-2 border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.5)]">
                  <img
                    src={reelItems[activeReelIndex]?.posterUrl || candidates[0]?.posterUrl}
                    alt="Girando..."
                    className="w-full h-full object-cover filter blur-[0.8px] scale-105 transition-transform duration-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                  <div className="absolute bottom-3 inset-x-3 text-center">
                    <p className="text-xs font-bold text-white truncate drop-shadow">
                      {reelItems[activeReelIndex]?.title}
                    </p>
                    <span className="text-[10px] text-rose-300 font-extrabold uppercase tracking-widest">
                      Girando ruleta...
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-rose-300 font-bold animate-pulse">
                  <Sparkles className="w-4 h-4" />
                  <span>Sincronizando frecuencias cinéfilas...</span>
                </div>
              </div>
            )}

            {/* WINNER REVEAL CARD */}
            {!isSpinning && winner && (
              <motion.div
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 22, stiffness: 280 }}
                className="w-full flex flex-col sm:flex-row items-center sm:items-stretch gap-5"
              >
                {/* Winner Poster with Ambilight Glow */}
                <div className="relative w-36 sm:w-44 shrink-0 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.4)] group">
                  <img
                    src={winner.posterUrl}
                    alt={winner.title}
                    className="w-full h-52 sm:h-64 object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-amber-500 text-black font-black text-[9px] uppercase tracking-wider shadow">
                    🏆 Elegida
                  </div>
                </div>

                {/* Winner Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3 text-center sm:text-left">
                  <div>
                    <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
                      <span className="inline-flex items-center gap-1 text-xs font-extrabold text-amber-400">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {winner.communityRating ? winner.communityRating.toFixed(1) : '4.8'}
                      </span>
                      <span className="text-slate-500">·</span>
                      <span className="text-xs text-slate-300 font-medium">{winner.year}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-xs text-slate-300 font-medium">{winner.duration}</span>
                      <span className="text-slate-500">·</span>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/10 text-rose-300">
                        {winner.genres[0]}
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-display font-black text-white leading-tight">
                      {winner.title}
                    </h3>
                    {winner.originalTitle && winner.originalTitle !== winner.title && (
                      <p className="text-xs text-slate-400 italic mt-0.5">{winner.originalTitle}</p>
                    )}

                    <p className="text-xs text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                      {winner.synopsis || 'Una excelente recomendación cinematográfica seleccionada por la ruleta.'}
                    </p>

                    {winner.defaultPlatform && (
                      <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300">
                        <span>Disponible en:</span>
                        <strong className="text-rose-400 font-bold">{winner.defaultPlatform}</strong>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap pt-2">
                    <button
                      type="button"
                      onClick={handleOpenWinnerDetail}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold text-xs shadow-lg shadow-rose-900/30 transition-all active:scale-95"
                    >
                      <span>Ver Ficha y Trailer</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleAddWinnerToList}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${
                        isWinnerInList
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                          : 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-200'
                      }`}
                    >
                      {isWinnerInList ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>En tu lista</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5 text-rose-400" />
                          <span>Guardar</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={spin}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all"
                      title="Volver a girar"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Otra opción</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* INITIAL IDLE STATE (Before first spin) */}
            {!isSpinning && !winner && (
              <div className="w-full text-center space-y-4 py-4">
                <div className="relative inline-flex p-4 rounded-3xl bg-gradient-to-br from-rose-600/20 via-amber-500/10 to-transparent border border-rose-500/30 text-rose-400 mb-1">
                  <Dices className="w-10 h-10 animate-bounce" />
                  <Sparkles className="w-4 h-4 text-amber-400 absolute top-2 right-2 animate-ping" />
                </div>

                <div className="max-w-md mx-auto space-y-1">
                  <h4 className="text-base sm:text-lg font-bold text-white">
                    {candidates.length > 0
                      ? '¿No te decides entre tantas opciones?'
                      : 'Ningún título coincide con los filtros'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {candidates.length > 0
                      ? 'Presiona el botón o la barra espaciadora para que la ruleta elija por ti.'
                      : 'Prueba cambiando los filtros de tiempo o género arriba para desbloquear títulos.'}
                  </p>
                </div>

                {candidates.length > 0 && (
                  <button
                    type="button"
                    onClick={spin}
                    className="relative group inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-extrabold text-sm shadow-xl shadow-rose-900/40 active:scale-95 transition-all"
                  >
                    <Dices className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                    <span>¡GIRAR RULETA AHORA!</span>
                    <Sparkles className="w-4 h-4 text-amber-200" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer info note */}
        <div className="px-6 py-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
          <span>Tip: Presiona <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono text-[10px]">Espacio</kbd> para girar</span>
          <span>ScreenLog Pro Random Picker</span>
        </div>
      </motion.div>
    </div>
  );
};
