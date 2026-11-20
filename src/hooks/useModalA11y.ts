import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface ModalA11yOptions {
  enabled?: boolean;
  closeOnEscape?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

interface ScrollLock {
  overflow: string;
  paddingRight: string;
}

// Un lock por modal activo (modales anidados => pila). Cada efecto libera
// exactamente el lock que adquirió, así un doble cleanup nunca descuenta
// el lock de otro modal.
const scrollLocks: ScrollLock[] = [];

// Solo el modal superior debe responder a Escape.
const modalStack: symbol[] = [];

function lockBodyScroll(): () => void {
  if (scrollLocks.length === 0) {
    // Si no hay modales registrados pero el body quedó bloqueado por un ciclo
    // anterior (HMR / StrictMode / desmontaje interrumpido), descartamos ese
    // estado huérfano. Si no, se guardaría "hidden" como valor original y el
    // scroll quedaría muerto al cerrar.
    if (document.body.style.overflow === 'hidden') {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  }

  const lock: ScrollLock = {
    overflow: document.body.style.overflow,
    paddingRight: document.body.style.paddingRight,
  };
  scrollLocks.push(lock);

  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  document.body.style.overflow = 'hidden';
  if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    const index = scrollLocks.indexOf(lock);
    if (index === -1) return;

    const original = scrollLocks[0];
    scrollLocks.splice(index, 1);

    // Mientras quede algún modal abierto el body debe seguir bloqueado.
    // Al cerrar el último se restaura el estado original (no el del último
    // lock, que ya era "hidden" en modales anidados).
    if (scrollLocks.length === 0 && original) {
      document.body.style.overflow = original.overflow;
      document.body.style.paddingRight = original.paddingRight;
    }
  };
}

/**
 * Accesibilidad base para cualquier modal:
 * - bloquea el scroll del fondo (y lo restaura siempre al cerrar)
 * - atrapa el foco dentro del panel
 * - cierra con Escape
 * - devuelve el foco al elemento que abrió el modal
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>(
  onClose: () => void,
  { enabled = true, closeOnEscape = true, initialFocusRef }: ModalA11yOptions = {},
) {
  const containerRef = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current as HTMLElement | null;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const releaseScrollLock = lockBodyScroll();
    const token = Symbol('modal');
    modalStack.push(token);

    const getFocusable = (): HTMLElement[] =>
      (Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[]).filter(
        (el) => el.getAttribute('aria-hidden') !== 'true' && (el.offsetParent !== null || el === document.activeElement),
      );

    const focusTarget: HTMLElement =
      (initialFocusRef?.current as HTMLElement | null) ?? getFocusable()[0] ?? container;
    const focusFrame = window.requestAnimationFrame(() => focusTarget.focus?.());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== token) return;
      if (event.key === 'Escape' && closeOnEscape) {
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || active === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown, true);
      const stackIndex = modalStack.lastIndexOf(token);
      if (stackIndex >= 0) modalStack.splice(stackIndex, 1);
      releaseScrollLock();
      previouslyFocused?.focus?.();
    };
  }, [enabled, closeOnEscape, initialFocusRef]);

  return containerRef;
}
