// Odómetro: un número como columnas de dígitos que ruedan hasta el valor nuevo. Todo el movimiento es CSS (transform en
// una columna de 30 filas, con tres copias de 0 a 9); JS solo decide de qué fila a qué fila y nunca mide nada.
// Cada dígito reserva su ancho con la cifra final invisible (en una celda en flujo normal), así el ancho es siempre el
// correcto y el saldo no puede quedar invisible. Los separadores (coma, punto, $) son texto normal.
import { sinMovimiento } from './movimiento.js';

const FILAS = '0123456789'.repeat(3).split('');

/** Dígitos de un texto, de derecha a izquierda. */
const digitos = (txt) => [...txt].filter((c) => c >= '0' && c <= '9').map(Number).reverse();

/**
 * Pinta `fmt(hasta)` en `el`. Si hay `desde` y se puede animar, cada dígito rueda desde su valor anterior (hacia arriba si el
 * número sube, hacia abajo si baja); si no, se ve el valor final al instante. `el` queda con el texto final en un `.sr`.
 */
export function pintarOdometro(el, desde, hasta, fmt, { ms = 1200 } = {}) {
  const final = fmt(hasta);
  const animar = desde != null && desde !== hasta && !sinMovimiento() && document.visibilityState !== 'hidden';
  const viejos = animar ? digitos(fmt(desde)) : [];
  const sube = hasta >= (desde ?? 0);
  const nuevos = digitos(final);
  el.textContent = '';
  const sr = document.createElement('span');
  sr.className = 'sr';
  sr.textContent = final;
  const num = document.createElement('span');
  num.className = 'od-num';
  num.setAttribute('aria-hidden', 'true');
  const columnas = [];
  let k = nuevos.length; // posición contando desde la derecha
  for (const c of final) {
    if (c < '0' || c > '9') {
      const sep = document.createElement('span');
      sep.className = 'od-sep';
      sep.textContent = c;
      num.append(sep);
      continue;
    }
    k -= 1;
    const nuevo = Number(c);
    const viejo = animar ? (viejos[k] ?? 0) : nuevo; // un lugar que aparece rueda desde 0
    const od = document.createElement('span');
    od.className = 'od';
    const reserva = document.createElement('span');
    reserva.className = 'od-r';
    reserva.textContent = c;
    const col = document.createElement('span');
    col.className = 'od-col';
    for (const f of FILAS) {
      const i = document.createElement('i');
      i.textContent = f;
      col.append(i);
    }
    const final10 = 10 + nuevo;
    const salto = sube ? (nuevo - viejo + 10) % 10 : -((viejo - nuevo + 10) % 10);
    col.style.setProperty('--fila', String(animar ? 10 + viejo : final10));
    if (animar) {
      col.classList.add('od-quieta');
      col.style.setProperty('--od-ms', `${ms}ms`);
      columnas.push([col, 10 + viejo + salto, k]);
    }
    od.append(reserva, col);
    num.append(od);
  }
  el.append(sr, num);
  if (!animar) return;
  void num.offsetWidth; // el estado de partida se pinta antes de soltar la transición
  for (const [col, fila, pos] of columnas) {
    col.style.setProperty('--od-retraso', `${pos * 45}ms`); // las unidades arrancan primero
    col.classList.remove('od-quieta');
    col.style.setProperty('--fila', String(fila));
  }
}
