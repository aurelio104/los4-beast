import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  addAlert,
  getRecentAlerts,
  getUnreadCount,
  getUnreadCountByTag,
  markAllRead,
  markReadByTag,
  subscribeAlerts,
  syncAppBadge,
  type AlertPayload,
  type StoredAlert
} from '../lib/notification-center';
import { playNotificationSound } from '../lib/sounds';
import { haptic } from '../lib/haptics';
import { api } from '../lib/api';

function deliverAlert(payload: AlertPayload, foreground: boolean) {
  addAlert(payload);
  if (foreground) {
    playNotificationSound();
    haptic('notification');
  }
}

export function useNotificationCenter() {
  const [unread, setUnread] = useState(getUnreadCount);
  const [chatUnread, setChatUnread] = useState(() => getUnreadCountByTag('chat'));
  const [recent, setRecent] = useState<StoredAlert[]>(getRecentAlerts);
  const [toast, setToast] = useState<AlertPayload | null>(null);
  const toastTimer = useRef<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const showToast = useCallback((payload: AlertPayload) => {
    setToast(payload);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 5000);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const refresh = useCallback(() => {
    setUnread(getUnreadCount());
    setChatUnread(getUnreadCountByTag('chat'));
    setRecent(getRecentAlerts());
  }, []);

  useEffect(() => subscribeAlerts(refresh), [refresh]);

  useEffect(() => {
    void syncAppBadge();
  }, [unread]);

  useEffect(() => {
    if (location.pathname === '/chat') {
      markReadByTag('chat');
      refresh();
    }
  }, [location.pathname, refresh]);

  useEffect(() => {
    const onMsg = (event: MessageEvent) => {
      const data = event.data;
      if (!data?.type) return;

      if (data.type === 'RETO_PUSH' && data.payload) {
        const payload = data.payload as AlertPayload;
        const foreground = document.visibilityState === 'visible';
        deliverAlert(payload, foreground);
        if (foreground) showToast(payload);
        refresh();
      }

      if (data.type === 'RETO_PUSH_OPEN' && data.url) {
        markAllRead();
        refresh();
        navigate(data.url);
      }
    };

    navigator.serviceWorker?.addEventListener('message', onMsg);
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg);
  }, [navigate, refresh, showToast]);

  // Chat en vivo cuando la app está abierta (sin depender solo del push)
  useEffect(() => {
    if (location.pathname === '/chat') return;
    let lastAt = localStorage.getItem('reto_chat_cursor') || '';
    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await api.chatMessages(lastAt || undefined);
        if (!res.success || !res.messages?.length) return;
        const list = res.messages as { id: string; body: string; createdAt: string; isOwn: boolean; user: { name: string } }[];
        const incoming = list.filter((m) => !m.isOwn && (!lastAt || m.createdAt > lastAt));
        if (!incoming.length) {
          if (list.length) lastAt = list[list.length - 1].createdAt;
          return;
        }
        const last = incoming[incoming.length - 1];
        lastAt = last.createdAt;
        localStorage.setItem('reto_chat_cursor', lastAt);
        const payload: AlertPayload = {
          title: `💬 ${last.user.name}`,
          body: last.body.slice(0, 120),
          url: '/chat',
          tag: 'chat'
        };
        deliverAlert(payload, true);
        showToast(payload);
        refresh();
      } catch {
        /* offline */
      }
    };
    void poll();
    const id = window.setInterval(poll, 5000);
    return () => window.clearInterval(id);
  }, [location.pathname, refresh, showToast]);

  const openInbox = useCallback(() => {
    markAllRead();
    refresh();
    const first = getRecentAlerts(1)[0];
    navigate(first?.url || '/');
  }, [navigate, refresh]);

  return { unread, chatUnread, recent, toast, openInbox, refresh, markAllRead, dismissToast };
}
