import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import {
  MessageCircle, CheckCircle, RefreshCw, Send, AlertTriangle,
  Phone, Pause, Play, Wifi, WifiOff, Loader2, History
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { PageContainer } from '../components/PageContainer';
import { PageTopBar } from '../components/PageTopBar';
import { GlassCard } from '../components/GlassCard';
import { api } from '../lib/api';
import { useNotifications } from '../components/NotificationProvider';

type WaStatus = {
  status: 'disconnected' | 'connecting' | 'qr_ready' | 'connected';
  qrCode: string | null;
  isConnected: boolean;
  phoneNumber?: string;
  lastConnected?: string;
  botPaused?: boolean;
  lastCloseDiagnostic?: { kind: string; summary: string; at: string } | null;
};

type WaMessage = {
  id: string;
  phoneNumber: string;
  message: string;
  status: string;
  sentAt?: string;
  createdAt: string;
};

export default function WhatsAppAdmin() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [botPauseLoading, setBotPauseLoading] = useState(false);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [tab, setTab] = useState<'status' | 'send' | 'history'>('status');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const { showAppToast } = useNotifications();
  const [sending, setSending] = useState(false);
  const [qrImage, setQrImage] = useState<string | null>(null);

  const flash = (msg: string) => showAppToast(msg);

  const fetchStatus = useCallback(async () => {
    try {
      const data = (await api.whatsappAdminStatus()) as WaStatus;
      setStatus(data);
      if (data.qrCode && typeof data.qrCode === 'string') {
        QRCode.toDataURL(data.qrCode, { width: 280, margin: 2 })
          .then(setQrImage)
          .catch(() => setQrImage(null));
      } else {
        setQrImage(null);
      }
      return data as WaStatus;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'MASTER') {
      navigate('/');
      return;
    }
    fetchStatus();
    const t = setInterval(fetchStatus, status?.status === 'qr_ready' || status?.status === 'connecting' ? 2500 : 8000);
    return () => clearInterval(t);
  }, [fetchStatus, navigate, status?.status]);

  const connect = async () => {
    setConnecting(true);
    try {
      await api.whatsappConnect();
      flash('Conectando… escanea el QR cuando aparezca');
      await fetchStatus();
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setConnecting(false);
    }
  };

  const clean = async () => {
    if (!confirm('¿Limpiar credenciales? Tendrás que escanear QR de nuevo.')) return;
    setCleaning(true);
    try {
      const r = await api.whatsappClean();
      flash(r.message || 'Credenciales limpiadas');
      await fetchStatus();
    } catch (e) {
      flash((e as Error).message);
    } finally {
      setCleaning(false);
    }
  };

  const toggleBot = async () => {
    setBotPauseLoading(true);
    try {
      const paused = !status?.botPaused;
      await api.whatsappBotPause(paused);
      flash(paused ? 'Bot pausado' : 'Bot activo');
      await fetchStatus();
    } finally {
      setBotPauseLoading(false);
    }
  };

  const sendMsg = async () => {
    if (!phoneNumber.trim() || !message.trim()) return;
    setSending(true);
    try {
      const r = await api.whatsappSend(phoneNumber.trim(), message.trim());
      if (r.success) flash('Mensaje enviado ✓');
      else flash(r.error || 'No se pudo enviar');
    } finally {
      setSending(false);
    }
  };

  const loadHistory = async () => {
    const rows = await api.whatsappMessages();
    setMessages(rows as WaMessage[]);
  };

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab]);

  const statusColor =
    status?.isConnected ? 'text-[#25D366]' :
    status?.status === 'qr_ready' ? 'text-reto-gold' :
    status?.status === 'connecting' ? 'text-reto-cyan' : 'text-white/50';

  return (
    <AppShell>
      <PageContainer>
        <PageTopBar onBack={() => navigate('/admin')} backLabel="Admin" />

        <h1 className="text-xl font-black gradient-text flex items-center gap-2 mb-1">
          <MessageCircle size={22} className="text-[#25D366]" /> WhatsApp
        </h1>
        <p className="text-xs text-white/45 mb-4">Mismo sistema Baileys que Musikales Pro — QR, sesión persistente y envíos automáticos.</p>

        <div className="flex gap-2 mb-4">
          {(['status', 'send', 'history'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold ${tab === t ? 'glass-strong text-white' : 'glass-btn text-white/50'}`}
            >
              {t === 'status' ? 'Estado' : t === 'send' ? 'Enviar' : 'Historial'}
            </button>
          ))}
        </div>

        {loading && !status ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-reto-pink" /></div>
        ) : tab === 'status' ? (
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-bold flex items-center gap-2 ${statusColor}`}>
                  {status?.isConnected ? <Wifi size={18} /> : <WifiOff size={18} />}
                  {status?.isConnected ? 'Conectado' : status?.status === 'qr_ready' ? 'Escanea el QR' : status?.status === 'connecting' ? 'Conectando…' : 'Desconectado'}
                </p>
                {status?.phoneNumber && <p className="text-xs text-white/50 mt-1 flex items-center gap-1"><Phone size={12} /> +{status.phoneNumber}</p>}
              </div>
              <button type="button" onClick={() => fetchStatus()} className="glass-btn p-2 rounded-xl"><RefreshCw size={16} /></button>
            </div>

            {status?.lastCloseDiagnostic && (
              <div className="glass rounded-xl p-3 text-xs text-reto-gold flex gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{status.lastCloseDiagnostic.summary}</span>
              </div>
            )}

            {qrImage && status?.status === 'qr_ready' && (
              <div className="text-center">
                <img src={qrImage} alt="QR WhatsApp" className="mx-auto rounded-xl ring-2 ring-[#25D366]/30" />
                <p className="text-[11px] text-white/45 mt-2">WhatsApp → Dispositivos vinculados → Vincular</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={connecting || status?.isConnected} onClick={connect}
                className="py-3 rounded-xl font-bold text-sm disabled:opacity-40 btn-whatsapp">
                {connecting ? '…' : 'Conectar'}
              </button>
              <button type="button" disabled={cleaning} onClick={clean} className="glass-btn py-3 rounded-xl text-sm font-semibold">
                {cleaning ? '…' : 'Limpiar credenciales'}
              </button>
            </div>

            <button type="button" disabled={botPauseLoading || !status?.isConnected} onClick={toggleBot}
              className="w-full glass-btn py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-40">
              {status?.botPaused ? <Play size={16} /> : <Pause size={16} />}
              {status?.botPaused ? 'Reanudar envíos automáticos' : 'Pausar bot automático'}
            </button>

            {status?.isConnected && (
              <p className="text-xs text-reto-cyan flex items-center gap-1"><CheckCircle size={14} /> Listo para credenciales y alertas del Reto</p>
            )}
          </GlassCard>
        ) : tab === 'send' ? (
          <GlassCard className="p-5 space-y-3">
            <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="04141234567" inputMode="tel" />
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Mensaje…" rows={5} className="w-full resize-none" />
            <button type="button" disabled={sending || !status?.isConnected} onClick={sendMsg}
              className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-40 btn-primary">
              {sending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              Enviar manual
            </button>
            {!status?.isConnected && <p className="text-xs text-white/40">Conecta WhatsApp en la pestaña Estado primero.</p>}
          </GlassCard>
        ) : (
          <GlassCard className="p-5 space-y-2 max-h-[60vh] overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-sm text-white/40 text-center py-6"><History size={20} className="mx-auto mb-2 opacity-50" /> Sin mensajes aún</p>
            ) : messages.map((m) => (
              <div key={m.id} className="glass rounded-xl p-3 text-xs">
                <div className="flex justify-between mb-1">
                  <span className="font-bold">{m.phoneNumber}</span>
                  <span className={m.status === 'SENT' ? 'text-[#25D366]' : 'text-reto-red'}>{m.status}</span>
                </div>
                <p className="text-white/60 line-clamp-2">{m.message}</p>
              </div>
            ))}
          </GlassCard>
        )}
      </PageContainer>
    </AppShell>
  );
}
