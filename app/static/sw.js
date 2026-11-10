// Service worker del Libro DCA: SOLO recibe avisos push. No intercepta peticiones ni guarda nada en caché
// (no hay evento `fetch` a propósito: así nunca puede servir JS viejo).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = {}; }
  const titulo = typeof d.titulo === 'string' && d.titulo ? d.titulo : 'Libro DCA';
  // El recordatorio de compra enciende el punto del icono (idea 41); la app lo quita al abrirse si ya compraste.
  const insignia = d.etiqueta === 'recordatorio' && typeof self.navigator?.setAppBadge === 'function'
    ? self.navigator.setAppBadge(1).catch(() => {}) : null;
  e.waitUntil(Promise.all([insignia, self.registration.showNotification(titulo, {
    body: typeof d.cuerpo === 'string' ? d.cuerpo : '',
    tag: typeof d.etiqueta === 'string' ? d.etiqueta : undefined, // la misma etiqueta reemplaza el aviso anterior
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: '/' },
  })]));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const abiertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abiertas) if ('focus' in c) return c.focus();
    return self.clients.openWindow('/');
  })());
});
