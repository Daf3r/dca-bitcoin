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
    // El recordatorio trae «Anotar compra» (Android y computadora; iPhone no muestra botones en las notificaciones).
    actions: Array.isArray(d.acciones) && d.acciones.includes('anotar') ? [{ action: 'anotar', title: 'Anotar compra' }] : [],
  })]));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const anotar = e.action === 'anotar';
  e.waitUntil((async () => {
    const abiertas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of abiertas) {
      if (!('focus' in c)) continue;
      const w = await c.focus();
      if (anotar) (w ?? c).postMessage({ tipo: 'anotar' }); // la app ya está abierta: le pedimos la hoja
      return w;
    }
    return self.clients.openWindow(anotar ? '/#anotar' : '/');
  })());
});
