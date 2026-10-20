import React, { useState, useEffect } from 'react';
import { Clock, X, Trash2, Search, Film, ArrowRight } from 'lucide-react';

interface RecentSearchesProps {
  onSelectSearch: (query: string) => void;
  currentQuery: string;
  onClearCurrentQuery?: () => void;
}

const STORAGE_KEY = 'cinetrack_recent_searches_v1';
const MAX_SEARCHES = 5;

const DEFAULT_RECENT_SEARCHES = [
  'Oppenheimer',
  'Ciencia Ficción',
  'Nolan',
  'Dune',
  'Anime'
];

export const RecentSearches: React.FC<RecentSearchesProps> = ({
  onSelectSearch,
  currentQuery,
  onClearCurrentQuery
}) => {
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, MAX_SEARCHES);
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_RECENT_SEARCHES;
  });

  // Save to localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentSearches));
    } catch {
      // ignore
    }
  }, [recentSearches]);

  // Debounced auto-save of user's active search query
  useEffect(() => {
    const trimmed = currentQuery.trim();
    if (!trimmed || trimmed.length < 2) return;

    const timer = setTimeout(() => {
      setRecentSearches((prev) => {
        // Remove existing case-insensitive duplicate
        const filtered = prev.filter(
          (item) => item.toLowerCase() !== trimmed.toLowerCase()
        );
        // Add new query at the front, limited to MAX_SEARCHES (5)
        return [trimmed, ...filtered].slice(0, MAX_SEARCHES);
      });
    }, 1200);

    return () => clearTimeout(timer);
  }, [currentQuery]);

  const removeSingleSearch = (e: React.MouseEvent, queryToRemove: string) => {
    e.stopPropagation();
    setRecentSearches((prev) =>
      prev.filter((item) => item !== queryToRemove)
    );
  };

  const clearAllSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  if (recentSearches.length === 0) {
    return null;
  }

  return (
    <div
      id="recent-searches-bar"
      className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-white/5 animate-in fade-in duration-300"
    >
      <div className="flex flex-wrap items-center gap-1.5 min-w-0">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1 flex-shrink-0">
          <Clock className="w-3.5 h-3.5 text-rose-400" />
          <span>Últimas 5 búsquedas:</span>
        </span>

        {recentSearches.map((term) => {
          const isActive = currentQuery.trim().toLowerCase() === term.toLowerCase();
          return (
            <button
              key={term}
              onClick={() => onSelectSearch(term)}
              className={`group inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium transition-all duration-200 border ${
                isActive
                  ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/30 font-bold'
                  : 'bg-[#0A0A0B] text-slate-300 border-white/10 hover:border-rose-500/40 hover:text-white hover:bg-white/5'
              }`}
              title={`Buscar "${term}"`}
            >
              <Search className={`w-3 h-3 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-rose-400'}`} />
              <span className="truncate max-w-[120px] sm:max-w-[160px]">{term}</span>
              <span
                onClick={(e) => removeSingleSearch(e, term)}
                className={`p-0.5 rounded-full hover:bg-black/30 transition-colors ml-0.5 ${
                  isActive ? 'text-white/80 hover:text-white' : 'text-slate-400 hover:text-rose-400'
                }`}
                title="Eliminar de búsquedas recientes"
              >
                <X className="w-2.5 h-2.5" />
              </span>
            </button>
          );
        })}
      </div>

      <button
        onClick={clearAllSearches}
        className="text-[11px] text-slate-400 hover:text-rose-400 font-medium transition-colors flex items-center gap-1 flex-shrink-0 ml-auto"
        title="Borrar las 5 búsquedas recientes"
      >
        <Trash2 className="w-3 h-3" />
        <span className="hidden sm:inline">Borrar historial</span>
      </button>
    </div>
  );
};
