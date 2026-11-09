import React, { useId } from 'react';

export type LogoVariant = 'gradient' | 'mono' | 'light';

interface LogoMarkProps {
  size?: number;
  variant?: LogoVariant;
  className?: string;
  title?: string;
}

/**
 * ScreenLog Pro Identity Mark: "Prisma Cinemático & S"
 * Un monograma 'S' continuo en perspectiva anamórfica que evoca
 * tres facetas de luz proyectada y un núcleo óptico de Play en el centro.
 */
export const LogoMark: React.FC<LogoMarkProps> = ({
  size = 40,
  variant = 'gradient',
  className = '',
  title = 'ScreenLog Pro',
}) => {
  const rawId = useId().replace(/[:]/g, '');
  const bgId = `sl-bg-${rawId}`;
  const g1Id = `sl-g1-${rawId}`;
  const g2Id = `sl-g2-${rawId}`;
  const g3Id = `sl-g3-${rawId}`;
  const isMono = variant === 'mono';
  const isLight = variant === 'light';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E1724" />
          <stop offset="100%" stopColor="#0B0910" />
        </linearGradient>
        <linearGradient id={g1Id} x1="8" y1="12" x2="48" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
        <linearGradient id={g2Id} x1="16" y1="24" x2="56" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id={g3Id} x1="16" y1="36" x2="48" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
      </defs>

      {/* Outer Squircle Container */}
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="16"
        fill={isMono ? 'none' : isLight ? '#F8FAFC' : `url(#${bgId})`}
        stroke={isMono ? 'currentColor' : isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.14)'}
        strokeWidth={isMono ? 2.5 : 1.5}
      />

      {/* S Top Face (Prism Fold) */}
      <path
        d="M46 16H24c-4.4 0-8 3.6-8 8v3c0 4.4 3.6 8 8 8h10l-6-6h-4c-1.1 0-2-.9-2-2v-1c0-1.1.9-2 2-2h22l-6-8Z"
        fill={isMono ? 'currentColor' : `url(#${g1Id})`}
      />

      {/* Central Diagonal Prism Beam */}
      <path
        d="M46 16 20 45h8l20-23v-6Z"
        fill={isMono ? 'currentColor' : `url(#${g2Id})`}
        opacity={isMono ? 0.75 : 0.95}
      />

      {/* S Bottom Face (Prism Fold) */}
      <path
        d="M18 48h22c4.4 0 8-3.6 8-8v-3c0-4.4-3.6-8-8-8H30l6 6h4c1.1 0 2 .9 2 2v1c0 1.1-.9 2-2 2H18l-6 8h6Z"
        fill={isMono ? 'currentColor' : `url(#${g3Id})`}
      />

      {/* Optical Play Triangle at Center */}
      <polygon
        points="30,28 38,32 30,36"
        fill={isMono ? '#0B0910' : '#FFFFFF'}
        opacity={isMono ? 1 : 0.96}
      />
    </svg>
  );
};

interface LogoLockupProps {
  size?: number;
  showTagline?: boolean;
  mono?: boolean;
  className?: string;
  textClassName?: string;
  badge?: boolean;
}

export const LogoLockup: React.FC<LogoLockupProps> = ({
  size = 40,
  showTagline = false,
  mono = false,
  className = '',
  textClassName = '',
  badge = true,
}) => {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="ScreenLog Pro">
      <LogoMark size={size} variant={mono ? 'mono' : 'gradient'} className="shrink-0" />
      <span className="min-w-0">
        <span className={`flex items-center gap-1.5 font-display font-black tracking-tight whitespace-nowrap ${textClassName || 'text-lg'}`}>
          <span className={mono ? 'text-white' : 'text-transparent bg-clip-text bg-gradient-to-r from-rose-400 via-rose-300 to-amber-400'}>
            SCREENLOG
          </span>
          {badge && (
            <span className="text-[9px] uppercase font-extrabold tracking-widest px-1.5 py-0.5 rounded-md bg-rose-600/25 text-rose-300 border border-rose-500/30">
              PRO
            </span>
          )}
        </span>
        {showTagline && (
          <span className="block text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
            Explora • Clasifica • Tu Lista
          </span>
        )}
      </span>
    </span>
  );
};
