import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Hub from './pages/Hub';
import Login from './pages/Login';
import Join from './pages/Join';
import Setup from './pages/Setup';
import Arena from './pages/Arena';
import Tienda from './pages/Tienda';
import Admin from './pages/Admin';
import WhatsAppAdmin from './pages/WhatsAppAdmin';
import Eventos from './pages/Eventos';
import Cofre from './pages/Cofre';
import Confesion from './pages/Confesion';
import Chat from './pages/Chat';
import Perfil from './pages/Perfil';
import Finale from './pages/Finale';
import { BackgroundMusic } from './components/BackgroundMusic';
import { PwaInstallGate } from './components/PwaInstallGate';
import { SetupGate } from './components/SetupGate';
import { isSetupDone } from './lib/setup';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;
  return <SetupGate>{children}</SetupGate>;
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
        <Route path="/join/:code" element={<Join />} />
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
        <Route path="/admin" element={<PrivateRoute><Admin /></PrivateRoute>} />
        <Route path="/admin/whatsapp" element={<PrivateRoute><WhatsAppAdmin /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <>
      <BackgroundMusic />
      <AppRoutes />
    </>
  );
}
