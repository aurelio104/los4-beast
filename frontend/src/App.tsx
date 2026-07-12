import { Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { BackgroundMusic } from './components/BackgroundMusic';
import { PwaInstallGate } from './components/PwaInstallGate';
import { SetupGate } from './components/SetupGate';
import { RouteFallback } from './components/RouteFallback';
import { PageTransition } from './components/PageTransition';
import { SwUpdateToast } from './components/SwUpdateToast';
import { PushAutoSync } from './components/PushAutoSync';
import { MasterRoute } from './components/MasterRoute';
import { useHasSession } from './hooks/useHasSession';
import { TabBarHost } from './components/TabBarHost';
import { useSafeAreaInsets } from './hooks/useSafeAreaInsets';
import { isSetupDone, markPwaInstallPromptSeen, syncSetupFromUser } from './lib/setup';
import { lazyWithRetry } from './lib/lazyWithRetry';
import type { User } from './types';
import Login from './pages/Login';
import Hub from './pages/Hub';
import Setup from './pages/Setup';

const Join = lazyWithRetry(() => import('./pages/Join'), 'Join');
const Arena = lazyWithRetry(() => import('./pages/Arena'), 'Arena');
const Tienda = lazyWithRetry(() => import('./pages/Tienda'), 'Tienda');
const Admin = lazyWithRetry(() => import('./pages/Admin'), 'Admin');
const AdminUsers = lazyWithRetry(() => import('./pages/AdminUsers'), 'AdminUsers');
const WhatsAppAdmin = lazyWithRetry(() => import('./pages/WhatsAppAdmin'), 'WhatsAppAdmin');
const Eventos = lazyWithRetry(() => import('./pages/Eventos'), 'Eventos');
const Cofre = lazyWithRetry(() => import('./pages/Cofre'), 'Cofre');
const Confesion = lazyWithRetry(() => import('./pages/Confesion'), 'Confesion');
const Chat = lazyWithRetry(() => import('./pages/Chat'), 'Chat');
const Perfil = lazyWithRetry(() => import('./pages/Perfil'), 'Perfil');
const Finale = lazyWithRetry(() => import('./pages/Finale'), 'Finale');

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;
  return (
    <SetupGate>
      <Lazy>{children}</Lazy>
    </SetupGate>
  );
}

function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function SessionServices() {
  const authed = useHasSession();
  if (!authed) return null;
  return (
    <>
      <BackgroundMusic />
      <PushAutoSync />
    </>
  );
}

function AppRoutes() {
  const location = useLocation();
  const user = getStoredUser();
  const setupDone = isSetupDone(user?.id, user);
  const showInstallBanner = setupDone && location.pathname === '/';

  useEffect(() => {
    if (!user?.id || !localStorage.getItem('token')) return;
    if (location.pathname === '/login' || location.pathname.startsWith('/join')) return;
    if (isSetupDone(user.id, user)) {
      markPwaInstallPromptSeen(user.id);
      if (!user.setupCompleted) void syncSetupFromUser(user);
    }
  }, [user?.id, user?.setupCompleted, location.pathname]);

  return (
    <>
      <SessionServices />
      {setupDone && <PwaInstallGate compactBanner={showInstallBanner} />}
      <PageTransition>
        <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="/join/:code" element={<Lazy><Join /></Lazy>} />
          <Route path="/setup" element={<PrivateRoute><Setup /></PrivateRoute>} />
          <Route path="/" element={<PrivateRoute><Hub /></PrivateRoute>} />
          <Route path="/arena" element={<PrivateRoute><Arena /></PrivateRoute>} />
          <Route path="/tienda" element={<PrivateRoute><Tienda /></PrivateRoute>} />
          <Route path="/eventos" element={<PrivateRoute><Eventos /></PrivateRoute>} />
          <Route path="/cofre" element={<PrivateRoute><Cofre /></PrivateRoute>} />
          <Route path="/confesion" element={<PrivateRoute><Confesion /></PrivateRoute>} />
          <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
          <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
          <Route path="/finale" element={<PrivateRoute><Finale /></PrivateRoute>} />
          <Route
            path="/admin"
            element={
              <PrivateRoute>
                <MasterRoute>
                  <Lazy>
                    <Admin />
                  </Lazy>
                </MasterRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <PrivateRoute>
                <MasterRoute>
                  <Lazy>
                    <AdminUsers />
                  </Lazy>
                </MasterRoute>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/whatsapp"
            element={
              <PrivateRoute>
                <MasterRoute>
                  <Lazy>
                    <WhatsAppAdmin />
                  </Lazy>
                </MasterRoute>
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransition>
    </>
  );
}

export default function App() {
  useSafeAreaInsets();
  return (
    <>
      <SwUpdateToast />
      <TabBarHost />
      <AppRoutes />
    </>
  );
}
