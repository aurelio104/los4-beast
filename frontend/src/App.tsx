import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Hub from './pages/Hub';
import Login from './pages/Login';
import Join from './pages/Join';
import Arena from './pages/Arena';
import Tienda from './pages/Tienda';
import Admin from './pages/Admin';
import Eventos from './pages/Eventos';
import Cofre from './pages/Cofre';
import Confesion from './pages/Confesion';
import Chat from './pages/Chat';
import Perfil from './pages/Perfil';
import Finale from './pages/Finale';
import { BackgroundMusic } from './components/BackgroundMusic';
import { PwaInstallGate } from './components/PwaInstallGate';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  const showInstallBanner = location.pathname === '/';

  return (
    <>
      <PwaInstallGate compactBanner={showInstallBanner} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/join/:code" element={<Join />} />
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
