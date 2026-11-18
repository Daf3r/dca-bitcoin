// Reporta al servidor los errores de JavaScript de este dispositivo (idea 74), para que el admin los vea en «Estado del sistema».
// Solo manda la pantalla y el mensaje (el servidor le quita enlaces, correos y números largos); como mucho 5 distintos por carga;
// nunca rompe la app: todo va con try/catch. Script clásico en <head> para atrapar también errores del arranque.
(() => {
  const vistos = new Set();
  // Avisos benignos por especificación, no errores de la app: el navegador lo dice cuando un observador de tamaño cambia un tamaño
  // dentro de su propia notificación y deja el resto para el cuadro siguiente (el segundo es el nombre que le daban los navegadores de
  // antes). Reportarlos taparía los de verdad en «Estado del sistema»; tampoco gastan uno de los 5 por carga.
  const BENIGNOS = new Set(['ResizeObserver loop completed with undelivered notifications.', 'ResizeObserver loop limit exceeded']);
  const enviar = (mensaje) => {
    try {
      const m = String(mensaje || '').slice(0, 300);
      if (!m || BENIGNOS.has(m) || vistos.has(m) || vistos.size >= 5) return;
      vistos.add(m);
      fetch('/api/errores', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Libro': '1' }, credentials: 'same-origin', keepalive: true,
        body: JSON.stringify({ pantalla: location.pathname, mensaje: m }),
      }).catch(() => {});
    } catch { /* un reporte nunca rompe la app */ }
  };
  addEventListener('error', (e) => enviar(e.message || 'error de carga'));
  addEventListener('unhandledrejection', (e) => enviar(`Promesa rechazada: ${e.reason?.message ?? e.reason}`));
})();
