import React from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

export type ToastType = 'success' | 'info' | 'warning';

interface ToastProps {
  message: { text: string; type?: ToastType } | null;
  onDismiss: () => void;
}

const TOAST_STYLES: Record<ToastType, { wrapper: string; icon: React.ElementType; iconClass: string }> = {
  success: {
    wrapper: 'border-emerald-500/35 bg-[#12211B]',
    icon: CheckCircle2,
    iconClass: 'text-emerald-400',
  },
  warning: {
    wrapper: 'border-amber-500/35 bg-[#221A10]',
    icon: TriangleAlert,
    iconClass: 'text-amber-400',
  },
  info: {
    wrapper: 'border-sky-500/35 bg-[#111B24]',
    icon: Info,
    iconClass: 'text-sky-400',
  },
};

/**
 * Región viva persistente: el contenedor existe siempre en el DOM para que
 * los lectores de pantalla anuncien los mensajes nuevos.
 */
export const Toast: React.FC<ToastProps> = ({ message, onDismiss }) => {
  const type = message?.type ?? 'info';
  const style = TOAST_STYLES[type];
  const Icon = style.icon;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 flex justify-end"
    >
      {message && (
        <div
          className={`pointer-events-auto animate-toast-in flex items-start gap-2.5 pl-3.5 pr-2.5 py-3 rounded-2xl border text-xs sm:text-sm font-semibold text-white shadow-2xl max-w-[min(24rem,calc(100vw-2rem))] ${style.wrapper}`}
        >
          <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${style.iconClass}`} aria-hidden="true" />
          <span className="leading-snug flex-1">{message.text}</span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Cerrar notificación"
            className="p-1 -m-0.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
