// La pila: 100 cuadros hacia la próxima meta. Se llena de abajo arriba.
import { entero } from './lib.js';

export const HITOS = [
  [1e5, '100k'],
  [1e6, '1M'],
  [1e7, '10M'],
  [1e8, '1 BTC'],
  [1e9, '10 BTC'],
];

export const meta = (sats) => (HITOS.find(([m]) => m > sats && m >= 1e6) ?? HITOS.at(-1))[0];

const LADO = 10;
const HUECO = 1.4;
const CUADRO = (100 - HUECO * (LADO - 1)) / LADO;
const f = (n) => +n.toFixed(2);

/**
 * previo: sats antes de la última compra; fantasma: sats que añadiría la compra
 * que se está escribiendo. Devuelve los rects de la última compra para animarlos.
 */
export function dibujarPila(host, { sats, previo, fantasma = 0 }) {
  const tope = meta(sats);
  const u = tope / 100;
  const tramos = [
    [0, previo, 'c-lleno'],
    [previo, sats, 'c-ultimo'],
    [sats, Math.min(tope, sats + fantasma), 'c-fantasma'],
  ];
  let s = `<svg viewBox="0 0 100 100" aria-hidden="true">`;
  for (let i = 0; i < 100; i++) {
    const x = f((i % LADO) * (CUADRO + HUECO));
    const y = (LADO - 1 - Math.floor(i / LADO)) * (CUADRO + HUECO);
    s += `<rect class="c-vacio" x="${x}" y="${f(y)}" width="${f(CUADRO)}" height="${f(CUADRO)}"/>`;
    for (const [desde, hasta, clase] of tramos) {
      const a = Math.max(desde, i * u);
      const b = Math.min(hasta, (i + 1) * u);
      if (b - a < u * 0.02) continue;
      const fa = (a - i * u) / u;
      const fb = (b - i * u) / u;
      s += `<rect class="${clase}" data-i="${i}" x="${x}" y="${f(y + CUADRO * (1 - fb))}" width="${f(CUADRO)}" height="${f(CUADRO * (fb - fa))}"/>`;
    }
  }
  host.innerHTML = s + '</svg>';
  host.setAttribute('aria-label', `${entero(sats)} de ${entero(tope)} sats, ${((sats / tope) * 100).toFixed(1)}% de la meta`);
  return { tope, unidad: u, nuevos: host.querySelectorAll('.c-ultimo') };
}
