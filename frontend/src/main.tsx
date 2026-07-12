import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { OfflineBanner } from './components/OfflineBanner';
import { NotificationProvider } from './components/NotificationProvider';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import './index.css';
import { syncSafeAreaInsets } from './lib/safeArea';

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </StrictMode>
);

removeBootSplash();
