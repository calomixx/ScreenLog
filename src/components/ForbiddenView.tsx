import React from 'react';
import { ArrowLeft, Home, Lock, ShieldAlert } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '../context/AuthContext';

interface ForbiddenViewProps {
  section?: string;
  onBack: () => void;
  onHome: () => void;
}

export const ForbiddenView: React.FC<ForbiddenViewProps> = ({ section, onBack, onHome }) => {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto w-16 h-16 rounded-3xl bg-rose-600/10 border border-rose-500/25 flex items-center justify-center mb-6">
          <Lock className="w-7 h-7 text-rose-400" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.24em] font-bold text-rose-400 mb-2">Acceso restringido</p>
        <h1 className="font-display text-2xl font-black tracking-tight mb-3">No tienes permisos para entrar aquí</h1>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          {section ? `La sección "${section}" requiere un rol superior.` : 'Esta sección requiere un rol superior.'}{' '}
          {currentUser && (
            <>
              Tu rol actual es <strong className="text-slate-200">{ROLE_LABELS[currentUser.role]}</strong>.
            </>
          )}{' '}
          Si crees que es un error, contacta con un administrador.
        </p>

        <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-[11px] text-slate-400 flex items-start gap-2 text-left mb-6">
          <ShieldAlert className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <span>
            Los permisos se verifican en el servidor en cada solicitud. Ocultar botones en la interfaz no otorga acceso.
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <button
            type="button"
            onClick={onHome}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  );
};
