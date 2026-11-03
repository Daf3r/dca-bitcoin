// La pila: 100 cuadros hacia la próxima meta. Se llena de abajo arriba.
import { entero } from './lib.js';

/** Próxima potencia de 10 por encima de lo acumulado, como mínimo 1M sats. */
export const meta = (sats) => Math.max(1e6, 10 ** (Math.floor(Math.log10(Math.max(1, sats))) + 1));

export const nombreMeta = (m) =>
  m >= 1e8 ? `${entero(m / 1e8)} BTC` : m >= 1e6 ? `${m / 1e6}M sats` : `${m / 1e3}k sats`;

/** Escalera de hitos: los cuatro últimos hasta la meta, al menos hasta 1 BTC. */
export function hitos(tope) {
  const out = [];
  for (let m = 1e5; m <= Math.max(1e8, tope); m *= 10) out.push(m);
  return out.slice(-4);
}

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
  let s = `<svg viewBox="-0.5 -0.5 101 101" aria-hidden="true">`;
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
      s += `<rect class="${clase}" x="${x}" y="${f(y + CUADRO * (1 - fb))}" width="${f(CUADRO)}" height="${f(CUADRO * (fb - fa))}"/>`;
    }
  }
  host.innerHTML = s + '</svg>';
  host.setAttribute('aria-label', `${entero(sats)} de ${entero(tope)} sats, ${((sats / tope) * 100).toFixed(1)}% de la meta`);
  return { tope, unidad: u, nuevos: host.querySelectorAll('.c-ultimo') };
}

export const etiquetaHito = (m) => (m >= 1e8 ? `${entero(m / 1e8)} BTC` : m >= 1e6 ? `${m / 1e6}M` : `${m / 1e3}k`);
