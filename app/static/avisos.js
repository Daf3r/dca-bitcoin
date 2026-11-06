// Avisos push en este dispositivo: activar, desactivar y elegir qué categorías llegan.
// El service worker (`/sw.js`) solo se registra cuando la persona activa los avisos y se quita al desactivarlos.
const $ = (id) => document.getElementById(id);

const soporta = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const instalada = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

/** La clave VAPID llega en base64url; el navegador la pide como bytes. */
const aBytes = (s) => {
  const b = atob((s + '='.repeat((4 - (s.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

const igual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
const registroActual = () => navigator.serviceWorker.getRegistration('/');
async function suscripcionActual() {
  const r = await registroActual();
  return r ? r.pushManager.getSubscription() : null;
}

/** Con qué mensaje se explica que aquí no se pueden activar (o null si sí se puede). */
export function motivoNoDisponible() {
  if (soporta()) return Notification.permission === 'denied'
    ? 'Los avisos están bloqueados para esta página. Actívalos en los ajustes del navegador o del teléfono y vuelve aquí.'
    : null;
  return esIOS() && !instalada()
    ? 'En iPhone los avisos funcionan desde la app instalada: toca Compartir, «Añadir a pantalla de inicio», ábrela desde ahí y vuelve a esta pantalla.'
    : 'Este navegador no permite avisos.';
}

/**
 * Conecta la vista «Avisos» de «Tu cuenta». `api` es el único punto de salida de la app (`app.js`).
 * Devuelve `refrescar()`, que se llama cada vez que se abre la vista.
 */
export function montarAvisos(api) {
  let sub = null; // la suscripción de este dispositivo, si existe

  const error = (txt = '') => { $('av-error').textContent = txt; };

  function pintarCategorias(categorias) {
    const caja = $('av-lista');
    caja.replaceChildren();
    for (const c of categorias) {
      const fila = document.createElement('label');
      fila.className = 'av-fila';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = c.activo;
      cb.dataset.cat = c.id;
      const txt = document.createElement('span');
      const b = document.createElement('b');
      b.textContent = c.nombre;
      const s = document.createElement('small');
      s.textContent = c.ayuda;
      txt.append(b, s);
      fila.append(cb, txt);
      caja.append(fila);
    }
    caja.hidden = !categorias.length;
  }

  async function refrescar() {
    error();
    const motivo = motivoNoDisponible();
    $('av-motivo').textContent = motivo ?? '';
    $('av-motivo').hidden = !motivo;
    sub = null;
    let estado = null;
    if (soporta()) {
      try {
        sub = await suscripcionActual();
        if (sub) estado = await api('/api/push/estado', { metodo: 'POST', cuerpo: { endpoint: sub.endpoint } });
      } catch { /* sin red: se muestra como apagado */ }
    }
    const activo = !!estado?.suscrito;
    $('av-interruptor').hidden = !soporta() || Notification.permission === 'denied';
    $('av-interruptor').textContent = activo ? 'Desactivar los avisos en este dispositivo' : 'Activar los avisos en este dispositivo';
    $('av-interruptor').dataset.activo = activo ? '1' : '0';
    $('av-estado').textContent = activo ? 'Los avisos están activados en este dispositivo.' : 'Los avisos están apagados en este dispositivo.';
    pintarCategorias(activo ? estado.categorias : []);
  }

  async function activar() {
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') throw new Error('No diste permiso para los avisos.');
    const { clave } = await api('/api/push/clave');
    let reg = await registroActual();
    reg ??= await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    const clave_b = aBytes(clave);
    let s = await reg.pushManager.getSubscription();
    // Una suscripción hecha con otra clave del servidor ya no sirve: se renueva.
    const vieja = s?.options?.applicationServerKey;
    if (s && vieja && !igual(new Uint8Array(vieja), clave_b)) { await s.unsubscribe(); s = null; }
    s ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: clave_b });
    await api('/api/push/suscribir', { metodo: 'POST', cuerpo: { suscripcion: s.toJSON() } });
  }

  async function desactivar() {
    const s = sub ?? await suscripcionActual();
    if (s) {
      await api('/api/push/baja', { metodo: 'POST', cuerpo: { endpoint: s.endpoint } });
      await s.unsubscribe();
    }
    const reg = await registroActual();
    await reg?.unregister();
  }

  $('av-interruptor').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    error();
    try {
      if (b.dataset.activo === '1') await desactivar(); else await activar();
    } catch (err) {
      error(err.message || 'No se pudo cambiar.');
    }
    b.disabled = false;
    await refrescar();
  });

  $('av-lista').addEventListener('change', async (e) => {
    const cb = e.target.closest('input[data-cat]');
    if (!cb || !sub) return;
    error();
    try {
      await api('/api/push/prefs', { metodo: 'PUT', cuerpo: { endpoint: sub.endpoint, prefs: { [cb.dataset.cat]: cb.checked } } });
    } catch (err) {
      cb.checked = !cb.checked;
      error(err.message || 'No se pudo guardar.');
    }
  });

  return { refrescar };
}
