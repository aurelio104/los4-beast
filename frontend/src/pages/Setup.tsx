import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Download, Fingerprint, Loader2, Music2, Volume2, Vibrate,
  Check, ChevronRight, Share, Sparkles, ArrowRight, CircleCheck, MessageCircle
} from 'lucide-react';
import { startRegistration } from '@simplewebauthn/browser';
import { AppShell } from '../components/AppShell';
import { GlassCard } from '../components/GlassCard';
import { RetoLogo } from '../components/RetoLogo';
import { api } from '../lib/api';
import { setPreferences } from '../lib/preferences';
import { markSetupDone } from '../lib/setup';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { usePushNotifications, refreshUserPushState } from '../hooks/usePushNotifications';
import { User } from '../types';

import { openWaMe, whatsAppResultLabel, WhatsAppResult } from '../lib/whatsapp';

const STEPS = ['Instalar', 'Alertas', 'Experiencia', 'Passkey', 'WhatsApp', '¡Listo!'];
type Step = 0 | 1 | 2 | 3 | 4 | 5;

export default function Setup() {
  const navigate = useNavigate();
  const install = useInstallPrompt();
  const push = usePushNotifications();
  const [step, setStep] = useState<Step>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [musicOn, setMusicOn] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [hapticsOn, setHapticsOn] = useState(true);
  const [passkeyDone, setPasskeyDone] = useState(false);
  const [phone, setPhone] = useState('');
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [whatsappDone, setWhatsappDone] = useState(false);
  const [waAutoSend, setWaAutoSend] = useState(false);
  const [lastWaResult, setLastWaResult] = useState<WhatsAppResult | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('user');
    if (!raw) { navigate('/login', { replace: true }); return; }
    const u = JSON.parse(raw) as User;
    setUser(u);
    if (u.hasPasskey) setPasskeyDone(true);
    if (u.phone) setPhone(u.phone.replace(/^\+58/, '0'));
    if (u.whatsappOptIn) setWhatsappDone(true);
    setWhatsappOptIn(u.whatsappOptIn ?? true);
    api.whatsappStatus().then((r) => { if (r.success) setWaAutoSend(r.autoSend); });
    void refreshUserPushState().then(() => push.refresh());
  }, [navigate]);

  useEffect(() => {
    if (step !== 1) return;
    void refreshUserPushState().then((active) => {
      void push.refresh();
      if (active && user) {
        setUser({ ...user, pushOptIn: true });
      }
    });
  }, [step]);

  const finish = async () => {
    if (!user) return;
    await refreshUserPushState();
    markSetupDone(user.id);
    navigate('/', { replace: true });
  };

  const activateExperience = () => {
    setPreferences({ music: musicOn, sound: soundOn, haptics: hapticsOn });
    setStep(3);
  };

  const setupPasskey = async () => {
    setLoading(true);
    setError('');
    try {
      const options = await api.passkeyRegisterOptions();
      if (!options.challenge) throw new Error('Passkey no disponible en este dispositivo');
      const cred = await startRegistration({ optionsJSON: options });
      const reg = await api.passkeyRegister(cred);
      if (!reg.success) throw new Error(reg.error || 'No se pudo guardar');
      const me = await api.me();
      if (me.success) {
        localStorage.setItem('user', JSON.stringify(me.user));
        setUser(me.user as User);
      }
      setPasskeyDone(true);
      setStep(4);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveWhatsApp = async (sendWelcome: boolean) => {
    setLoading(true);
    setError('');
    setLastWaResult(null);
    try {
      if (whatsappOptIn && !phone.trim()) {
        throw new Error('Indica tu número de WhatsApp');
      }
      const res = await api.updateProfile({
        phone: phone.trim() || '',
        whatsappOptIn: whatsappOptIn && !!phone.trim()
      });
      if (!res.success) throw new Error(res.error || 'No se pudo guardar');

      const me = res.user as User;
      localStorage.setItem('user', JSON.stringify(me));
      setUser(me);

      if (sendWelcome && whatsappOptIn && phone.trim()) {
        const wa = await api.whatsappWelcome();
        if (wa.whatsapp) {
          setLastWaResult(wa.whatsapp);
          if (!wa.whatsapp.sent && wa.whatsapp.waMeUrl) openWaMe(wa.whatsapp.waMeUrl);
        }
      }

      setWhatsappDone(!!me.whatsappOptIn);
      setStep(5);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (
    label: string,
    desc: string,
    icon: React.ReactNode,
    on: boolean,
    setOn: (v: boolean) => void
  ) => (
    <button
      type="button"
      onClick={() => setOn(!on)}
      className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all ${on ? 'glass-strong ring-1 ring-reto-cyan/40' : 'glass-btn'}`}
    >
      <span className={on ? 'text-reto-cyan' : 'text-white/40'}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs text-white/45">{desc}</p>
      </div>
      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${on ? 'bg-reto-cyan/20 text-reto-cyan' : 'bg-white/5 text-white/35'}`}>
        {on ? 'ON' : 'OFF'}
      </span>
    </button>
  );

  if (!user) {
    return (
      <AppShell background="beach">
        <div className="min-h-dvh flex items-center justify-center">
          <Loader2 className="animate-spin text-reto-pink" size={36} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell background="beach">
      <div className="auth-screen flex flex-col py-8 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
          <RetoLogo size="lg" animate glow className="mx-auto mb-2" />
          <h1 className="text-xl font-black gradient-text">Configura tu Reto</h1>
          <p className="text-xs text-white/50 mt-1">Activa todo una vez · luego en Perfil</p>
        </motion.div>

        <div className="flex items-center justify-between mb-6 px-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-col items-center flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${i < step ? 'bg-reto-cyan text-black' : i === step ? 'bg-reto-pink text-white ring-2 ring-reto-pink/50' : 'bg-white/10 text-white/40'}`}>
                {i < step ? <Check size={14} strokeWidth={3} /> : i + 1}
              </div>
              <span className={`text-[9px] text-center leading-tight ${i === step ? 'text-white' : 'text-white/35'}`}>{label}</span>
            </div>
          ))}
        </div>

        <GlassCard strong glow="purple" className="p-6 bg-black/30 backdrop-blur-2xl flex-1">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5 text-center py-2">
                <Download size={44} className="mx-auto text-reto-gold" strokeWidth={1.75} />
                <div>
                  <p className="text-lg font-black mb-2">Instala la app</p>
                  <p className="text-sm text-white/55 leading-relaxed">Pantalla completa, acceso rápido y mejor experiencia en el reto.</p>
                </div>
                {install.installed ? (
                  <p className="text-reto-cyan text-sm flex items-center justify-center gap-1"><CircleCheck size={16} /> App instalada</p>
                ) : install.needsIOSGuide ? (
                  <div className="glass rounded-2xl p-4 text-left text-sm text-white/70 space-y-2">
                    <p className="font-semibold flex items-center gap-2"><Share size={16} className="text-reto-cyan" /> iPhone / iPad</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Safari → <strong>Compartir</strong></li>
                      <li><strong>Agregar a pantalla de inicio</strong></li>
                      <li>Confirmar <strong>Agregar</strong></li>
                    </ol>
                  </div>
                ) : install.canNativeInstall ? (
                  <button type="button" onClick={install.install} className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #ffbe0b, #ff006e)' }}>
                    <Download size={20} /> Instalar ahora
                  </button>
                ) : (
                  <p className="text-xs text-white/40">Continúa en el navegador si prefieres</p>
                )}
                <button type="button" onClick={() => setStep(1)} className="w-full glass-btn py-3 rounded-xl font-semibold flex items-center justify-center gap-1">
                  Continuar <ChevronRight size={18} />
                </button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5 text-center py-2">
                <Bell size={44} className="mx-auto text-reto-gold" strokeWidth={1.75} />
                <div>
                  <p className="text-lg font-black mb-2">Activar notificaciones</p>
                  <p className="text-sm text-white/55 leading-relaxed">Eventos del reto, votaciones, drama del grupo y alertas del 29 de agosto.</p>
                </div>
                {push.subscribed || user.pushOptIn ? (
                  <p className="text-reto-cyan text-sm flex items-center justify-center gap-1"><CircleCheck size={16} /> Notificaciones activas en todo el sistema</p>
                ) : push.supported ? (
                  <button
                    type="button"
                    disabled={push.loading}
                    onClick={async () => {
                      const ok = await push.subscribe();
                      if (ok) {
                        await refreshUserPushState();
                        const me = await api.me();
                        if (me.success && me.user) {
                          setUser(me.user as User);
                          localStorage.setItem('user', JSON.stringify(me.user));
                        }
                      }
                    }}
                    className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #8338ec, #ff006e)' }}
                  >
                    {push.loading ? <Loader2 className="animate-spin" /> : <Bell size={20} />}
                    Activar notificaciones
                  </button>
                ) : (
                  <p className="text-xs text-white/40">No disponibles en este navegador</p>
                )}
                <button type="button" onClick={() => setStep(2)} className="w-full glass-btn py-3 rounded-xl font-semibold">
                  {push.subscribed || user.pushOptIn ? 'Continuar' : 'Ahora no'} <ChevronRight size={16} className="inline ml-1" />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-3 py-1">
                <p className="text-sm font-bold text-center mb-2">Experiencia inmersiva</p>
                {toggleRow('Música de fondo', 'Ambiente playa en loop', <Music2 size={20} />, musicOn, setMusicOn)}
                {toggleRow('Sonidos', 'Efectos al ganar Puntos', <Volume2 size={20} />, soundOn, setSoundOn)}
                {toggleRow('Vibración', 'Feedback táctil', <Vibrate size={20} />, hapticsOn, setHapticsOn)}
                <button type="button" onClick={activateExperience} className="w-full mt-4 py-4 rounded-2xl font-bold flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #06d6a0, #8338ec)' }}>
                  Guardar y continuar <ChevronRight size={18} />
                </button>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5 text-center py-2">
                <Fingerprint size={44} className="mx-auto text-reto-purple" strokeWidth={1.75} />
                <div>
                  <p className="text-lg font-black mb-2">Passkey</p>
                  <p className="text-sm text-white/55 leading-relaxed">Entra con Face ID, huella o PIN — sin escribir contraseña.</p>
                </div>
                {passkeyDone ? (
                  <p className="text-reto-cyan text-sm flex items-center justify-center gap-1"><CircleCheck size={16} /> Passkey activa</p>
                ) : (
                  <button type="button" disabled={loading} onClick={setupPasskey} className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 glass-strong">
                    {loading ? <Loader2 className="animate-spin" /> : <Fingerprint size={22} />}
                    Activar Passkey
                  </button>
                )}
                <button type="button" onClick={() => setStep(4)} className="text-xs text-white/40 underline">
                  {passkeyDone ? 'Continuar' : 'Configurar después en Perfil'}
                </button>
                {passkeyDone && (
                  <button type="button" onClick={() => setStep(4)} className="w-full glass-btn py-3 rounded-xl font-semibold">
                    Continuar <ChevronRight size={16} className="inline ml-1" />
                  </button>
                )}
              </motion.div>
            )}

            {step === 4 && (
              <motion.div key="s4" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-5 py-2">
                <div className="text-center">
                  <MessageCircle size={44} className="mx-auto text-[#25D366]" strokeWidth={1.75} />
                  <p className="text-lg font-black mb-2 mt-3">WhatsApp</p>
                  <p className="text-sm text-white/55 leading-relaxed">
                    Recibe contraseñas, credenciales y alertas del reto directo en tu chat.
                  </p>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Número WhatsApp</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="04141234567"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                  <p className="text-[10px] text-white/35 mt-1">Venezuela +58 por defecto si omites el código</p>
                </div>
                <button
                  type="button"
                  onClick={() => setWhatsappOptIn(!whatsappOptIn)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl text-left transition-all ${whatsappOptIn ? 'glass-strong ring-1 ring-[#25D366]/40' : 'glass-btn'}`}
                >
                  <MessageCircle size={20} className={whatsappOptIn ? 'text-[#25D366]' : 'text-white/40'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold">Alertas por WhatsApp</p>
                    <p className="text-xs text-white/45">Cambios de contraseña y notificaciones</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${whatsappOptIn ? 'bg-[#25D366]/20 text-[#25D366]' : 'bg-white/5 text-white/35'}`}>
                    {whatsappOptIn ? 'ON' : 'OFF'}
                  </span>
                </button>
                {waAutoSend ? (
                  <p className="text-[11px] text-white/40 text-center">WhatsApp del Reto conectado — envío automático activo</p>
                ) : (
                  <p className="text-[11px] text-white/40 text-center">El admin debe vincular WhatsApp en Admin → WhatsApp (QR). Si no, se abrirá wa.me.</p>
                )}
                {whatsappDone && (
                  <p className="text-reto-cyan text-sm flex items-center justify-center gap-1"><CircleCheck size={16} /> WhatsApp configurado</p>
                )}
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => saveWhatsApp(true)}
                  className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
                >
                  {loading ? <Loader2 className="animate-spin" /> : <MessageCircle size={20} />}
                  {whatsappOptIn && phone.trim() ? 'Activar y continuar' : 'Continuar sin WhatsApp'}
                </button>
                <button type="button" onClick={() => setStep(5)} className="text-xs text-white/40 underline w-full">
                  Configurar después en Perfil
                </button>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div key="s5" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center py-4">
                <Sparkles size={44} className="mx-auto text-reto-gold" />
                <h2 className="text-xl font-black gradient-text">¡Todo configurado!</h2>
                <p className="text-sm text-white/55">Puedes cambiar todo esto cuando quieras en <strong>Perfil → Configuración</strong>.</p>
                <button type="button" onClick={finish} className="w-full py-4 rounded-2xl font-bold inline-flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #ffbe0b, #ff006e)' }}>
                  Entrar al Reto <ArrowRight size={18} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {error && <p className="text-reto-red text-sm mt-4">{error}</p>}
          {lastWaResult && !lastWaResult.sent && lastWaResult.waMeUrl && (
            <button type="button" onClick={() => openWaMe(lastWaResult.waMeUrl!)} className="text-xs text-[#25D366] mt-2 underline w-full">
              {whatsAppResultLabel(lastWaResult)}
            </button>
          )}
        </GlassCard>

        {step > 0 && step < 5 && (
          <button type="button" onClick={() => setStep((step - 1) as Step)} className="mt-4 text-xs text-white/35 mx-auto block">
            ← Paso anterior
          </button>
        )}
      </div>
    </AppShell>
  );
}
