import { $ } from './estado.js';

// --------------------------------------------------------------- avisos
let avisoTimer = 0;
export const TIEMPO_AVISO = 3500;
export function avisar(texto, accion = null, temporal = false) {
  clearTimeout(avisoTimer);
  $('aviso-txt').textContent = texto;
  $('aviso').hidden = !texto;
  const b = $('aviso-btn');
  b.hidden = temporal || !texto;
  b.textContent = accion ? 'Reintentar' : 'Cerrar';
  b.onclick = accion ?? (() => avisar(''));
  // La barra fina (CSS) dura lo mismo que el aviso; se reinicia si llega otro temporal seguido.
  const caja = $('aviso');
  delete caja.dataset.temporal;
  if (temporal && texto) {
    void caja.offsetWidth;
    caja.dataset.temporal = '1';
    avisoTimer = setTimeout(() => avisar(''), TIEMPO_AVISO);
  }
}
