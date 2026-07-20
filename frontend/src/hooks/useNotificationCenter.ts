import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  addAlert,
  clearAllAlerts,
  getRecentAlerts,
  getUnreadCount,
  getUnreadCountByTag,
  markAlertRead,
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
  const [recent, setRecent] = useState<StoredAlert[]>(() => getRecentAlerts(20));
  const [toast, setToast] = useState<AlertPayload | null>(null);
  const [appMessage, setAppMessage] = useState<string | null>(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const toastTimer = useRef<number | null>(null);
  const appTimer = useRef<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const showToast = useCallback((payload: AlertPayload) => {
    setToast(payload);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 5200);
  }, []);

  const dismissToast = useCallback(() => {
    setToast(null);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  const showAppToast = useCallback((message: string) => {
    setAppMessage(message);
    if (appTimer.current) window.clearTimeout(appTimer.current);
    appTimer.current = window.setTimeout(() => setAppMessage(null), 3200);
  }, []);

  const dismissAppToast = useCallback(() => {
    setAppMessage(null);
    if (appTimer.current) window.clearTimeout(appTimer.current);
  }, []);

  const refresh = useCallback(() => {
    setUnread(getUnreadCount());
    setChatUnread(getUnreadCountByTag('chat'));
    setRecent(getRecentAlerts(20));
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
        setInboxOpen(false);
        navigate(data.url);
      }
    };

    navigator.serviceWorker?.addEventListener('message', onMsg);
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg);
  }, [navigate, refresh, showToast]);

  useEffect(() => {
    if (location.pathname === '/chat') return;
    if (!localStorage.getItem('token')) return;
    if (location.pathname === '/login' || location.pathname.startsWith('/join')) return;

    let pushActive = false;
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}') as { pushOptIn?: boolean };
      pushActive = !!u.pushOptIn;
    } catch {
      pushActive = false;
    }

    let lastAt = localStorage.getItem('reto_chat_cursor') || '';
    const poll = async () => {
      if (document.hidden) return;
      try {
        const res = await api.chatMessages(lastAt || undefined);
        if (!res.success || !res.messages?.length) return;
        const list = res.messages as {
          id: string;
          body: string;
          createdAt: string;
          isOwn: boolean;
          user: { name: string };
        }[];
        const incoming = list.filter((m) => !m.isOwn && (!lastAt || m.createdAt > lastAt));
        if (!incoming.length) {
          if (list.length) lastAt = list[list.length - 1].createdAt;
          return;
        }
        const last = incoming[incoming.length - 1];
        lastAt = last.createdAt;
        localStorage.setItem('reto_chat_cursor', lastAt);
        const payload: AlertPayload = {
          title: last.user.name,
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
    const intervalMs = pushActive ? 20_000 : 12_000;
    const id = window.setInterval(poll, intervalMs);
    return () => window.clearInterval(id);
  }, [location.pathname, refresh, showToast]);

  const openInbox = useCallback(() => {
    haptic('light');
    setInboxOpen(true);
    refresh();
  }, [refresh]);

  const closeInbox = useCallback(() => {
    setInboxOpen(false);
  }, []);

  const openAlert = useCallback(
    (alert: StoredAlert) => {
      markAlertRead(alert.id);
      refresh();
      setInboxOpen(false);
      navigate(alert.url || '/');
    },
    [navigate, refresh]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead();
    refresh();
    haptic('light');
  }, [refresh]);

  const handleClearAll = useCallback(() => {
    clearAllAlerts();
    refresh();
    haptic('light');
  }, [refresh]);

  return {
    unread,
    chatUnread,
    recent,
    toast,
    appMessage,
    inboxOpen,
    openInbox,
    closeInbox,
    openAlert,
    refresh,
    markAllRead: handleMarkAllRead,
    clearAll: handleClearAll,
    dismissToast,
    showAppToast,
    dismissAppToast
  };
}
