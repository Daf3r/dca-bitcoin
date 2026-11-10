import { $ } from './estado.js';

// --------------------------------------------------------------- avisos
let avisoTimer = 0;
export const TIEMPO_AVISO = 3500;
let reconectando = false;
/**
 * La barra de aviso de abajo. `accion` + `etiqueta` dan un botón propio (p. ej. «Deshacer»); sin `etiqueta`, la acción es «Reintentar».
 * `temporal` la retira sola a los `ms` (con su barra de tiempo); un aviso temporal sin botón propio no lleva botón.
 */
export function avisar(texto, accion = null, temporal = false, { etiqueta = null, ms = TIEMPO_AVISO } = {}) {
  clearTimeout(avisoTimer);
  reconectando = false;
  const caja = $('aviso');
  $('aviso-txt').textContent = texto;
  caja.hidden = !texto;
  const b = $('aviso-btn');
  b.hidden = !texto || (temporal && !(accion && etiqueta));
  b.textContent = etiqueta ?? (accion ? 'Reintentar' : 'Cerrar');
  b.onclick = accion ?? (() => avisar(''));
  // La barra fina (CSS) dura lo mismo que el aviso; se reinicia si llega otro temporal seguido.
  delete caja.dataset.temporal;
  caja.style.setProperty('--aviso-ms', `${ms}ms`);
  if (temporal && texto) {
    void caja.offsetWidth;
    caja.dataset.temporal = '1';
    avisoTimer = setTimeout(() => avisar(''), ms);
  }
}

// «Reconectando…»: `api()` avisa (evento `libro:red`) cuando una lectura no llega y la reintenta sola. No pisa un aviso que ya está a la vista.
window.addEventListener('libro:red', (e) => {
  const estado = e.detail?.estado;
  if (estado === 'reintentando') {
    if ($('aviso').hidden) { avisar('Reconectando…'); reconectando = true; }
  } else if (reconectando) avisar('');
});
