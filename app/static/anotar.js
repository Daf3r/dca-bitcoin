// «Anotar compra» desde el botón del recordatorio (idea 144): la notificación abre la app en `/#anotar` (o, si la app ya estaba abierta,
// le manda un mensaje). Solo el admin llega a la hoja: un lector no tiene botón ni hoja. Espera a que se sepa el rol y a que no haya otro
// diálogo abierto (la bienvenida, «Qué hay de nuevo»), y quita `#anotar` de la dirección para que recargar no la abra otra vez.
import { S, esAdmin } from './estado.js';
import { abrirHoja, hoja } from './hoja.js';

const ESPERA_MAX = 20_000;
let esperando = false;

function limpiarHash() {
  try { if (location.hash === '#anotar') history.replaceState(null, '', location.pathname + location.search); } catch { /* da igual */ }
}

export function anotarCuandoSePueda() {
  if (esperando) return;
  esperando = true;
  const t0 = Date.now();
  const intento = () => {
    if (Date.now() - t0 > ESPERA_MAX) { esperando = false; limpiarHash(); return; }
    // rol desconocido, datos sin cargar o algún diálogo abierto: se vuelve a mirar en un momento
    if (!S.rol || !S.cargado || document.querySelector('dialog[open]')) { setTimeout(intento, 250); return; }
    esperando = false;
    limpiarHash();
    if (esAdmin() && hoja.hidden) abrirHoja();
  };
  intento();
}

if (location.hash === '#anotar') anotarCuandoSePueda();
window.addEventListener('hashchange', () => { if (location.hash === '#anotar') anotarCuandoSePueda(); });
try {
  navigator.serviceWorker?.addEventListener('message', (e) => { if (e.data?.tipo === 'anotar') anotarCuandoSePueda(); });
} catch { /* sin service worker: solo vale la dirección */ }
