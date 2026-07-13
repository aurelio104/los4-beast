import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';

let modalLayerCount = 0;

function acquireModalLayer() {
  modalLayerCount += 1;
  if (modalLayerCount === 1) {
    document.body.classList.add('app-modal-open');
  }
}

function releaseModalLayer() {
  modalLayerCount = Math.max(0, modalLayerCount - 1);
  if (modalLayerCount === 0) {
    document.body.classList.remove('app-modal-open');
  }
}

/** Bloquea scroll y oculta hub/nav mientras un modal está abierto (soporta varios modales anidados). */
export function useAppModalLayer() {
  useEffect(() => {
    acquireModalLayer();
    return releaseModalLayer;
  }, []);
}

/** Renderiza modales en document.body, fuera del stacking context de #root. */
export function ModalPortal({ children }: { children: ReactNode }) {
  useAppModalLayer();
  return createPortal(children, document.body);
}
