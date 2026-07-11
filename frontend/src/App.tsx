import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import { BackgroundMusic } from './components/BackgroundMusic';
import { PwaInstallGate } from './components/PwaInstallGate';
import { SetupGate } from './components/SetupGate';
import { RouteFallback } from './components/RouteFallback';
import { SwUpdateToast } from './components/SwUpdateToast';
import { PushAutoSync } from './components/PushAutoSync';
import { MasterRoute } from './components/MasterRoute';
import { isSetupDone } from './lib/setup';

const Join = lazy(() => import('./pages/Join'));
const Setup = lazy(() => import('./pages/Setup'));
const Hub = lazy(() => import('./pages/Hub'));
const Arena = lazy(() => import('./pages/Arena'));
const Tienda = lazy(() => import('./pages/Tienda'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const WhatsAppAdmin = lazy(() => import('./pages/WhatsAppAdmin'));
const Eventos = lazy(() => import('./pages/Eventos'));
const Cofre = lazy(() => import('./pages/Cofre'));
const Confesion = lazy(() => import('./pages/Confesion'));
const Chat = lazy(() => import('./pages/Chat'));
const Perfil = lazy(() => import('./pages/Perfil'));
const Finale = lazy(() => import('./pages/Finale'));

function Lazy({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;
  return <SetupGate><Lazy>{children}</Lazy></SetupGate>;
}

function getUserId(): string | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? (JSON.parse(raw).id as string) : null;
  } catch {
    return null;
  }
}

function AppRoutes() {
  const location = useLocation();
  const setupDone = isSetupDone(getUserId());
  const showInstallBanner = setupDone && location.pathname === '/';

  return (
    <>
      {setupDone && <PwaInstallGate compactBanner={showInstallBanner} />}
      <Routes>
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
        <Route path="/admin" element={<PrivateRoute><MasterRoute><Lazy><Admin /></Lazy></MasterRoute></PrivateRoute>} />
        <Route path="/admin/users" element={<PrivateRoute><MasterRoute><Lazy><AdminUsers /></Lazy></MasterRoute></PrivateRoute>} />
        <Route path="/admin/whatsapp" element={<PrivateRoute><MasterRoute><Lazy><WhatsAppAdmin /></Lazy></MasterRoute></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <>
      <BackgroundMusic />
      <PushAutoSync />
      <SwUpdateToast />
      <AppRoutes />
    </>
  );
}
