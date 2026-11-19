import React from 'react';

interface SkeletonProps {
  className?: string;
  /** Anuncia la carga a lectores de pantalla. */
  label?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', label }) => (
  <div
    role={label ? 'status' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    className={`animate-pulse rounded-2xl bg-white/[0.06] border border-white/5 ${className}`}
  />
);

export const SkeletonGrid: React.FC<{ count?: number; className?: string }> = ({
  count = 10,
  className = '',
}) => (
  <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 ${className}`}>
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="space-y-2" aria-hidden="true">
        <Skeleton className="aspect-[2/3] w-full rounded-2xl" />
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-3 w-1/2 rounded-md" />
      </div>
    ))}
  </div>
);
