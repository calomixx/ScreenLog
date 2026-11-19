import React from 'react';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface FilterPillsProps<T extends string> {
  options: ReadonlyArray<FilterOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Etiqueta accesible del grupo de botones. */
  label: string;
  activeClass?: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<FilterPillsProps<string>['size']>, string> = {
  xs: 'px-2 py-1 rounded-lg text-[10px]',
  sm: 'px-2.5 py-1.5 rounded-lg text-[11px]',
  md: 'px-3 py-1.5 rounded-xl text-xs',
};

/**
 * Chips de filtro reutilizables (tipo, estado, etc.).
 * Evita repetir la misma lista y el mismo marcado en cada vista.
 */
export function FilterPills<T extends string>({
  options,
  value,
  onChange,
  label,
  activeClass = 'bg-rose-600 text-white shadow-md shadow-rose-900/40 font-bold',
  size = 'sm',
  className = '',
}: FilterPillsProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex items-center gap-1 bg-[#0A0A0B]/60 p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full ${className}`}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={`${SIZE_CLASSES[size]} whitespace-nowrap shrink-0 transition-all ${
              isActive ? activeClass : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
