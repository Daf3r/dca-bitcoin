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

/**
 * (Campamento 39, idea 135) Si se entró desde el almanaque de la guía (`libro.almanaque`), un aviso dice qué día y hora se está viendo y
 * ofrece volver a hoy (quita el día, la hora y la marca). Las pruebas fijan `libro.hora` y `libro.dia` sin la marca: a ellas no les sale.
 */
function avisoAlmanaque() {
  let dia = null, hora = null;
  try { if (localStorage.getItem('libro.almanaque') !== '1') return; dia = localStorage.getItem('libro.dia'); hora = Number.parseFloat(localStorage.getItem('libro.hora')); } catch { return; }
  const h = Number.isFinite(hora) ? ` a las ${Math.floor(hora)}:${String(Math.round((hora % 1) * 60)).padStart(2, '0')}` : '';
  avisar(`Estás viendo otro día: ${dia ?? 'hoy'}${h}.`, () => {
    try { for (const k of ['libro.dia', 'libro.hora', 'libro.almanaque']) localStorage.removeItem(k); } catch { /* sin almacenamiento */ }
    location.reload();
  }, false, { etiqueta: 'Volver a hoy' });
}
if (document.getElementById('aviso')) setTimeout(avisoAlmanaque, 1200);
