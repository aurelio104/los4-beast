/* Push + badge — iOS/Android PWA (importado por Workbox) */

function parsePushData(event) {
  const fallback = {
    title: 'Reto',
    body: 'Nueva actividad en el reto',
    url: '/',
    tag: 'reto',
    badgeCount: 1
  };
  try {
    if (event.data) return { ...fallback, ...event.data.json() };
  } catch {
    /* ignore */
  }
  return fallback;
}

function notifyClients(payload) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    list.forEach((client) => {
      client.postMessage({ type: 'RETO_PUSH', payload });
    });
  });
}

async function setBadgeCount(count) {
  try {
    if (self.registration && typeof self.registration.setAppBadge === 'function') {
      if (count > 0) await self.registration.setAppBadge(count);
      else if (typeof self.registration.clearAppBadge === 'function') await self.registration.clearAppBadge();
      return;
    }
    if (typeof navigator.setAppBadge === 'function') {
      if (count > 0) await navigator.setAppBadge(count);
      else if (typeof navigator.clearAppBadge === 'function') await navigator.clearAppBadge();
    }
  } catch {
    /* no soportado */
  }
}

self.addEventListener('push', (event) => {
  const data = parsePushData(event);

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const foreground = clients.some((c) => c.visibilityState === 'visible');

      await notifyClients(data);

      const count = typeof data.badgeCount === 'number' ? data.badgeCount : 1;
      await setBadgeCount(count);

      if (foreground) return;

      await self.registration.showNotification(data.title, {
        body: data.body,
        icon: '/logoR.png',
        badge: '/pwa-192.png',
        image: data.image,
        tag: data.tag || 'reto-alert',
        renotify: true,
        silent: false,
        vibrate: [120, 60, 120, 60, 200],
        timestamp: Date.now(),
        data: { url: data.url || '/', tag: data.tag, badgeCount: count },
        requireInteraction: false,
        actions: [{ action: 'open', title: 'Abrir' }]
      });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      await setBadgeCount(0);
      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of list) {
        client.postMessage({ type: 'RETO_PUSH_OPEN', url });
        if ('focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'RETO_BADGE_SYNC') {
    event.waitUntil(setBadgeCount(event.data.count || 0));
  }
});
