import { $ } from './estado.js';

// --------------------------------------------------------------- avisos
let avisoTimer = 0;
export function avisar(texto, accion = null, temporal = false) {
  clearTimeout(avisoTimer);
  $('aviso-txt').textContent = texto;
  $('aviso').hidden = !texto;
  const b = $('aviso-btn');
  b.hidden = temporal || !texto;
  b.textContent = accion ? 'Reintentar' : 'Cerrar';
  b.onclick = accion ?? (() => avisar(''));
  if (temporal) avisoTimer = setTimeout(() => avisar(''), 3500);
}
