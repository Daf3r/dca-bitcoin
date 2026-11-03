// Gráfico de invertido frente a valor, en SVG propio.
import { aFecha, fechaLarga } from './lib.js';

const DIA = 864e5;

function escala(max) {
  const bruto = max / 3;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= bruto);
  return Array.from({ length: Math.ceil(max / paso) + 1 }, (_, i) => i * paso);
}

const etiqueta = (v) => (v >= 1000 ? `$${+(v / 1000).toFixed(1)}k` : `$${v}`);
const f = (n) => n.toFixed(1);

/** Dibuja en `host` y devuelve las posiciones x y una función para marcar un punto. */
export function dibujar(host, pts) {
  const W = Math.max(280, Math.round(host.clientWidth || 600));
  const H = W < 480 ? 190 : 240;
  const m = { t: 22, r: 8, b: 26, l: 2 };
  const ts = pts.map((p) => aFecha(p.fecha).getTime());
  const t1 = ts.at(-1);
  const t0 = Math.min(ts[0], t1 - DIA);
  const ticks = escala(Math.max(...pts.map((p) => Math.max(p.inv, p.valor))));
  const tope = ticks.at(-1);
  const x = (t) => m.l + ((t - t0) / (t1 - t0)) * (W - m.l - m.r);
  const y = (v) => m.t + (1 - v / tope) * (H - m.t - m.b);
  const xs = ts.map(x);

  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">`;
  for (const t of ticks) {
    s += `<line class="g-rejilla${t ? '' : ' g-base'}" x1="0" x2="${W}" y1="${f(y(t))}" y2="${f(y(t))}"/>`;
    if (t) s += `<text x="0" y="${f(y(t) - 6)}">${etiqueta(t)}</text>`;
  }
  s += `<text x="0" y="${H - 6}">${fechaLarga(pts[0].fecha)}</text>`;
  s += `<text x="${W}" y="${H - 6}" text-anchor="end">${pts.at(-1).hoy ? 'Hoy' : fechaLarga(pts.at(-1).fecha)}</text>`;

  // Lo invertido solo cambia el día de cada compra: escalón, no pendiente.
  let dInv = `M${f(xs[0])} ${f(y(pts[0].inv))}`;
  for (let i = 1; i < pts.length; i++) dInv += `H${f(xs[i])}V${f(y(pts[i].inv))}`;
  const dVal = pts.map((p, i) => `${i ? 'L' : 'M'}${f(xs[i])} ${f(y(p.valor))}`).join('');
  s += `<path class="g-inv" d="${dInv}"/><path class="g-val" d="${dVal}"/>`;
  if (pts.length <= 60) {
    for (let i = 0; i < pts.length; i++) s += `<circle class="g-punto" cx="${f(xs[i])}" cy="${f(y(pts[i].valor))}" r="2.5"/>`;
  }
  s += `<g class="g-marca" visibility="hidden"><line y1="${m.t - 8}" y2="${H - m.b}"/>`;
  s += `<circle class="g-m-inv" r="4"/><circle class="g-m-val" r="4.5"/></g></svg>`;
  host.innerHTML = s;

  const marca = host.querySelector('.g-marca');
  const [linea, cInv, cVal] = marca.children;
  return {
    ancho: W,
    xs,
    marcar(i) {
      if (i == null) return marca.setAttribute('visibility', 'hidden');
      linea.setAttribute('x1', f(xs[i]));
      linea.setAttribute('x2', f(xs[i]));
      cInv.setAttribute('cx', f(xs[i]));
      cInv.setAttribute('cy', f(y(pts[i].inv)));
      cVal.setAttribute('cx', f(xs[i]));
      cVal.setAttribute('cy', f(y(pts[i].valor)));
      marca.setAttribute('visibility', 'visible');
    },
  };
}
