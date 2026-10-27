import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number; // 0 to 5 (e.g. 4.5)
  maxStars?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showNumber?: boolean;
  precision?: 0.5 | 1;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxStars = 5,
  interactive = false,
  onChange,
  size = 'md',
  showNumber = true,
  precision = 0.5
}) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const displayRating = hoverRating !== null ? hoverRating : rating;

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4.5 h-4.5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm font-semibold',
    lg: 'text-base font-bold',
    xl: 'text-lg font-extrabold'
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>, starIndex: number) => {
    if (!interactive) return;
    if (precision === 0.5) {
      const rect = e.currentTarget.getBoundingClientRect();
      const isLeftHalf = e.clientX - rect.left < rect.width / 2;
      setHoverRating(isLeftHalf ? starIndex - 0.5 : starIndex);
    } else {
      setHoverRating(starIndex);
    }
  };

  const handleClick = (starIndex: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !onChange) return;
    if (precision === 0.5) {
      const rect = e.currentTarget.getBoundingClientRect();
      const isLeftHalf = e.clientX - rect.left < rect.width / 2;
      onChange(isLeftHalf ? starIndex - 0.5 : starIndex);
    } else {
      onChange(starIndex);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || !onChange) return;

    let newRating = displayRating;

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        newRating = Math.min(maxStars, displayRating + precision);
        e.preventDefault();
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        newRating = Math.max(0, displayRating - precision);
        e.preventDefault();
        break;
      case 'Home':
        newRating = 0;
        e.preventDefault();
        break;
      case 'End':
        newRating = maxStars;
        e.preventDefault();
        break;
      default:
        return;
    }

    onChange(newRating);
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 select-none ${
        interactive ? 'focus-visible:ring-2 focus-visible:ring-rose-500 rounded outline-none' : ''
      }`}
      role={interactive ? "slider" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? maxStars : undefined}
      aria-valuenow={interactive ? displayRating : undefined}
      aria-label={interactive ? "Calificación" : undefined}
      onKeyDown={handleKeyDown}
      onMouseLeave={() => interactive && setHoverRating(null)}
    >
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxStars }, (_, i) => {
          const starVal = i + 1;
          const fillRatio = Math.max(0, Math.min(1, displayRating - i));

          return (
            <div
              key={i}
              id={`star-item-${i}`}
              className={`relative cursor-pointer transition-transform ${
                interactive ? 'hover:scale-110' : 'cursor-default'
              }`}
              onMouseMove={(e) => handleMouseMove(e, starVal)}
              onClick={(e) => handleClick(starVal, e)}
            >
              {/* Background Empty Star */}
              <Star className={`${sizeClasses[size]} text-white/20`} fill="currentColor" />

              {/* Filled Star Overlay */}
              {fillRatio > 0 && (
                <div
                  className="absolute inset-0 overflow-hidden text-amber-400"
                  style={{ width: `${fillRatio * 100}%` }}
                >
                  <Star className={`${sizeClasses[size]} text-amber-400`} fill="currentColor" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showNumber && (
        <span className={`${textSizes[size]} text-amber-400 ml-1`}>
          {displayRating > 0 ? displayRating.toFixed(1) : '—'}
        </span>
      )}
    </div>
  );
};
