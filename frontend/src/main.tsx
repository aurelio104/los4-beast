import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { OfflineBanner } from './components/OfflineBanner';
import { NotificationProvider } from './components/NotificationProvider';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import './index.css';
import { clearBootReloadCount, registerChunkRecovery } from './lib/chunkRecovery';
import { syncSafeAreaInsets } from './lib/safeArea';

registerChunkRecovery();
syncSafeAreaInsets();

function removeBootSplash() {
  document.getElementById('boot-splash')?.remove();
}

function Root() {
  const online = useOnlineStatus();
  return (
    <NotificationProvider>
      <OfflineBanner online={online} />
      <App />
    </NotificationProvider>
  );
}

try {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </StrictMode>
  );
  clearBootReloadCount();
} catch (error) {
  console.error('[reto] error al montar la app', error);
  const splash = document.getElementById('boot-splash');
  if (splash) {
    splash.innerHTML = `
      <p style="color:rgba(255,255,255,0.7);font:600 14px system-ui,sans-serif;text-align:center;max-width:16rem;line-height:1.4">
        No se pudo iniciar Reto. Pulsa recargar.
      </p>
      <button type="button" onclick="location.reload()" style="margin-top:0.75rem;padding:0.65rem 1.25rem;border-radius:0.75rem;border:none;background:rgba(255,255,255,0.12);color:#fff;font:600 14px system-ui,sans-serif">
        Recargar
      </button>
    `;
  }
} finally {
  removeBootSplash();
}
