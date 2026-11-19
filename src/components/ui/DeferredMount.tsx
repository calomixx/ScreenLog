import React, { useEffect, useRef, useState } from 'react';

interface DeferredMountProps {
  children: React.ReactNode;
  /** Contenido mostrado hasta que el bloque entra en pantalla. */
  fallback?: React.ReactNode;
  rootMargin?: string;
  className?: string;
}

/**
 * Monta contenido pesado (por ejemplo gráficos) solo cuando está a punto de
 * entrar en el viewport. Reduce el JS que se descarga al abrir el dashboard.
 */
export const DeferredMount: React.FC<DeferredMountProps> = ({
  children,
  fallback = null,
  rootMargin = '300px',
  className = '',
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || shouldMount) return;

    if (typeof IntersectionObserver === 'undefined') {
      setShouldMount(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldMount(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );

    observer.observe(host);
    return () => observer.disconnect();
  }, [rootMargin, shouldMount]);

  return (
    <div ref={hostRef} className={className}>
      {shouldMount ? children : fallback}
    </div>
  );
};
