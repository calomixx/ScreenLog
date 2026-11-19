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

// Nested modals (detail -> trailer) must not release the scroll lock early.
let scrollLockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

function lockBodyScroll() {
  if (scrollLockCount === 0) {
    savedOverflow = document.body.style.overflow;
    savedPaddingRight = document.body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
  }
  scrollLockCount += 1;
}

function unlockBodyScroll() {
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) {
    document.body.style.overflow = savedOverflow;
    document.body.style.paddingRight = savedPaddingRight;
  }
}

/**
 * Accesibilidad base para cualquier modal:
 * - bloquea el scroll del fondo
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
    lockBodyScroll();

    const getFocusable = (): HTMLElement[] =>
      (Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[]).filter(
        (el) => el.getAttribute('aria-hidden') !== 'true' && (el.offsetParent !== null || el === document.activeElement),
      );

    const focusTarget: HTMLElement =
      (initialFocusRef?.current as HTMLElement | null) ?? getFocusable()[0] ?? container;
    const focusFrame = window.requestAnimationFrame(() => focusTarget.focus?.());

    const handleKeyDown = (event: KeyboardEvent) => {
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
      unlockBodyScroll();
      previouslyFocused?.focus?.();
    };
  }, [enabled, closeOnEscape, initialFocusRef]);

  return containerRef;
}
