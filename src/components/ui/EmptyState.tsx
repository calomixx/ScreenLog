import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Estado vacío compartido por catálogo, mi lista y resto de vistas.
 * Mantiene el mismo lenguaje visual en toda la app.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div
    role="status"
    className={`text-center py-16 px-4 border border-dashed border-white/10 rounded-3xl bg-surface/50 space-y-4 ${className}`}
  >
    <div
      aria-hidden="true"
      className="w-16 h-16 mx-auto rounded-2xl bg-rose-600/10 text-rose-500 flex items-center justify-center border border-rose-500/20"
    >
      <Icon className="w-8 h-8" />
    </div>
    <div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      {description && (
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">{description}</p>
      )}
    </div>
    {action}
  </div>
);
