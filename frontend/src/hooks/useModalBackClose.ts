import { useEffect, useRef } from 'react';

/**
 * Android / PWA: gesto atrás cierra el modal en lugar de salir de la app.
 */
export function useModalBackClose(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  const pushedRef = useRef(false);

  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;

    history.pushState({ retoModal: true }, '');
    pushedRef.current = true;

    const onPop = () => {
      if (!pushedRef.current) return;
      pushedRef.current = false;
      onCloseRef.current();
    };

    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      pushedRef.current = false;
    };
  }, [open]);
}

/** Llamar al cerrar con botón X (el gesto atrás ya hizo history.back). */
export function popModalHistory() {
  if (history.state?.retoModal) history.back();
}
