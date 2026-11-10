// Insignia del icono de la app instalada (idea 41): un punto sobre el icono cuando te toca comprar. Solo para el admin y solo cuando
// `tocaComprar` dice «toca» o «último día»; se quita al comprar o cuando vas al día. Es un recordatorio discreto, sin cifra que
// presione. Donde no hay soporte (casi todo fuera de una PWA instalada) no hace nada. El servicio de avisos la enciende con el
// recordatorio (sw.js) y esta función la corrige cada vez que se pinta la app.
import { tocaComprar } from './lib.js';
import { R, S, esAdmin } from './estado.js';

export const hayInsignia = () => typeof navigator !== 'undefined' && typeof navigator.setAppBadge === 'function';
export function debeLlevarInsignia() {
  if (!S.cargado || !esAdmin() || R.nCompras < 3) return false;
  const t = tocaComprar(R);
  return !!t && (t.estado === 'toca' || t.estado === 'ultimo');
}
export function pintarInsignia() {
  if (!hayInsignia()) return;
  const quiere = debeLlevarInsignia();
  // Se repite siempre (es barato): el servicio de avisos pudo encenderla por su lado.
  try {
    const p = quiere ? navigator.setAppBadge(1) : navigator.clearAppBadge?.();
    p?.catch?.(() => {}); // sin permiso o sin app instalada: no importa
  } catch { /* nada que hacer */ }
}
