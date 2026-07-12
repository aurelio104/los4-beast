import { useEffect, useRef } from 'react';

/**
 * Android / PWA: gesto atrás cierra el modal en lugar de salir de la app.
 */
export function useModalBackClose(open: boolean, onClose: () => void) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!open) return;

    history.pushState({ retoModal: true }, '');
    pushedRef.current = true;

    const onPop = () => {
      if (pushedRef.current) {
        pushedRef.current = false;
        onClose();
      }
    };

    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (pushedRef.current) {
        pushedRef.current = false;
        history.back();
      }
    };
  }, [open, onClose]);
}
