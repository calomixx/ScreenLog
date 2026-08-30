import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, RefreshCw, Server, ShieldCheck, Layers, Film, Users, ListFilter } from 'lucide-react';

interface DbStatus {
  success: boolean;
  database: string;
  counts: {
    users: number;
    media: number;
    myListEntries: number;
    reviews: number;
    testimonials: number;
    tickets: number;
  };
}

export const DatabaseStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/db-status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // offline / mock fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  return (
    <div className="bg-[#121214] border border-emerald-500/20 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left: DB Info */}
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex-shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-extrabold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Conexión Activa
              </span>
              <h3 className="text-sm sm:text-base font-display font-bold text-white">
                Base de Datos PostgreSQL (Cloud SQL)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Instancia relacional Cloud SQL con tablas para Usuarios, Películas, Cuadernos de Lista, Reseñas y Testimonios.
            </p>
          </div>
        </div>

        {/* Right: Metrics & Refresh */}
        <div className="flex items-center gap-3 flex-wrap">
          {status?.counts && (
            <div className="flex items-center gap-2 text-xs">
              <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1.5 text-slate-300">
                <Users className="w-3.5 h-3.5 text-rose-400" />
                <span><strong>{status.counts.users}</strong> usuarios</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1.5 text-slate-300">
                <Film className="w-3.5 h-3.5 text-amber-400" />
                <span><strong>{status.counts.media}</strong> títulos</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 flex items-center gap-1.5 text-slate-300">
                <ListFilter className="w-3.5 h-3.5 text-purple-400" />
                <span><strong>{status.counts.myListEntries}</strong> en listas</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={fetchStatus}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-colors"
            title="Actualizar estado de la base de datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

      </div>
    </div>
  );
};
