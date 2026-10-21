import React, { useId } from 'react';

export type LogoVariant = 'gradient' | 'mono' | 'light';

interface LogoMarkProps {
  size?: number;
  variant?: LogoVariant;
  className?: string;
  title?: string;
}

export const LogoMark: React.FC<LogoMarkProps> = ({
  size = 40,
  variant = 'gradient',
  className = '',
  title = 'ScreenLog Pro',
}) => {
  const rawId = useId().replace(/[:]/g, '');
  const gradientId = `sl-grad-${rawId}`;
  const accentId = `sl-accent-${rawId}`;
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
        <linearGradient id={gradientId} x1="8" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="48%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id={accentId} x1="20" y1="32" x2="46" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isMono ? 'currentColor' : '#FDE68A'} />
          <stop offset="100%" stopColor={isMono ? 'currentColor' : '#FB7185'} />
        </linearGradient>
      </defs>

      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="16"
        fill={isMono ? 'none' : `url(#${gradientId})`}
        stroke={isMono ? 'currentColor' : isLight ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.22)'}
        strokeWidth={isMono ? 2.5 : 1}
      />

      <path
        d="M14 19.5h36a3 3 0 0 1 3 3V28H11v-5.5a3 3 0 0 1 3-3Z"
        fill={isMono ? 'none' : '#0A0A0B'}
        stroke={isMono ? 'currentColor' : 'rgba(255,255,255,0.18)'}
        strokeWidth={isMono ? 2 : 1}
        opacity={isMono ? 1 : 0.9}
      />
      <path
        d="M18.5 19.5 14 27M28.5 19.5 24 27M38.5 19.5 34 27M48.5 19.5 44 27"
        stroke={isMono ? 'currentColor' : `url(#${accentId})`}
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      <rect
        x="11"
        y="28.5"
        width="42"
        height="25.5"
        rx="5.5"
        fill={isMono ? 'none' : '#0A0A0B'}
        stroke={isMono ? 'currentColor' : 'rgba(255,255,255,0.25)'}
        strokeWidth={isMono ? 2 : 1}
        opacity={isMono ? 1 : 0.92}
      />

      <path
        d="M32 31.5l8.5 3.2v6.1c0 5.1-4.1 8.4-8.5 10.2-4.4-1.8-8.5-5.1-8.5-10.2v-6.1l8.5-3.2Z"
        fill={isMono ? 'none' : `url(#${accentId})`}
        stroke={isMono ? 'currentColor' : 'rgba(255,255,255,0.35)'}
        strokeWidth={isMono ? 2 : 1}
      />
      <circle cx="32" cy="40" r="2.7" fill={isMono ? 'currentColor' : '#0A0A0B'} />
      <path d="M30.9 41.4h2.2l.8 4.1h-3.8l.8-4.1Z" fill={isMono ? 'currentColor' : '#0A0A0B'} />

      <circle cx="49.5" cy="13.5" r="2.4" fill={isMono ? 'currentColor' : '#FDE68A'} />
      <path
        d="M49.5 8.8v2.2M49.5 16v2.2M44.8 13.5h2.2M52 13.5h2.2"
        stroke={isMono ? 'currentColor' : '#FDE68A'}
        strokeWidth="1.4"
        strokeLinecap="round"
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
