// Dos vistas del gráfico que comparten dibujo: «cómo cambia tu costo promedio» (línea entre compras) y «tus sats» (escalera
// que sube con cada compra y baja con cada venta). Cada una es una serie de puntos con fecha; se lee con puntero y teclado.
import { aFecha } from './lib.js';
import { ilustracion } from './iconos.js';

const f1 = (n) => n.toFixed(1);
const dfMes = new Intl.DateTimeFormat('es-SV', { month: 'short', year: 'numeric' });
const mes = (f) => dfMes.format(aFecha(f)).replace('.', '');
const EST = new WeakMap();

/** Marcas redondas (1, 2 o 5 × 10ⁿ) dentro de [lo, hi], hasta unas 3. */
function marcas(lo, hi) {
  const raw = (hi - lo) / 3;
  if (!(raw > 0)) return [];
  const mag = 10 ** Math.floor(Math.log10(raw));
  const paso = [1, 2, 5, 10].find((k) => k * mag >= raw) * mag;
  const out = [];
  for (let v = Math.ceil(lo / paso) * paso; v <= hi + 1e-9; v += paso) out.push(v);
  return out;
}

/**
 * Dibuja la serie en `host`. `puntos`: [{ fecha, v }] ordenados; `escalon`: la línea queda horizontal hasta el siguiente punto;
 * `desdeCero`: el eje parte de 0 (sats) o se ajusta al rango (costo); `fmtEje`: cómo escribir una marca; `texto(p)`: la lectura de un
 * punto; `defecto`: la lectura en reposo; `sr`: la zona que anuncia a los lectores de pantalla.
 */
export function dibujarEscalera(host, lectura, sr, { puntos, escalon, desdeCero, fmtEje, texto, defecto, aria }) {
  const W = Math.max(280, host.clientWidth);
  const H = W < 560 ? 220 : W < 900 ? 260 : 280;
  if (puntos.length < 2) { host.innerHTML = `<p class="g-vacio">${ilustracion('grafico')}Aún no hay suficientes compras para este gráfico.</p>`; EST.delete(host); lectura.textContent = ''; return; }
  const vs = puntos.map((p) => p.v);
  let lo = desdeCero ? 0 : Math.min(...vs), hi = Math.max(...vs);
  const pad = (hi - lo) * 0.12 || hi * 0.1 || 1;
  if (!desdeCero) lo -= pad;
  hi += pad;
  const m = { t: 18, r: 12, b: 28, l: 10 };
  const t0 = aFecha(puntos[0].fecha).getTime(), t1 = aFecha(puntos.at(-1).fecha).getTime();
  const x = (f) => m.l + ((aFecha(f).getTime() - t0) / Math.max(1, t1 - t0)) * (W - m.l - m.r);
  const y = (v) => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
  const base = H - m.b;
  let d = `M${f1(x(puntos[0].fecha))} ${f1(y(puntos[0].v))}`;
  for (let i = 1; i < puntos.length; i++) {
    if (escalon) d += `L${f1(x(puntos[i].fecha))} ${f1(y(puntos[i - 1].v))}`;
    d += `L${f1(x(puntos[i].fecha))} ${f1(y(puntos[i].v))}`;
  }
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">`;
  s += '<defs><linearGradient id="s-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sa-1"/><stop offset="1" class="sa-2"/></linearGradient></defs>';
  const n = W < 560 ? 3 : 5;
  for (let k = 0; k < n; k++) {
    const p = puntos[Math.round((k / (n - 1)) * (puntos.length - 1))];
    s += `<text class="g-t" x="${f1(x(p.fecha))}" y="${H - 8}" text-anchor="${k === 0 ? 'start' : k === n - 1 ? 'end' : 'middle'}">${mes(p.fecha)}</text>`;
  }
  const ticks = marcas(lo, hi * 0.97).filter((v) => y(v) < base - 16); // la marca pegada a la base (p. ej. «0 sats») solo estorba al primer punto
  for (const v of ticks) s += `<line class="v-rej" x1="${m.l}" x2="${W - m.r}" y1="${f1(y(v))}" y2="${f1(y(v))}"/>`;
  s += `<line class="v-base" x1="${m.l}" x2="${W - m.r}" y1="${base}" y2="${base}"/>`;
  if (desdeCero) s += `<path class="s-area" d="${d}L${f1(x(puntos.at(-1).fecha))} ${base}L${f1(x(puntos[0].fecha))} ${base}Z"/>`;
  s += `<path class="s-linea" d="${d}"/>`;
  const r = puntos.length > 120 ? 2.4 : puntos.length > 30 ? 3.2 : 4.5;
  s += `<path class="s-puntos" d="${puntos.slice(0, -1).map((p) => `M${f1(x(p.fecha) - r)} ${f1(y(p.v))}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`).join('')}"/>`;
  for (const v of ticks) s += `<text class="g-t v-eje" x="${m.l}" y="${f1(y(v) - 6)}">${fmtEje(v)}</text>`;
  const u = puntos.at(-1);
  s += `<circle class="s-hoy" cx="${f1(x(u.fecha))}" cy="${f1(y(u.v))}" r="5"/>`;
  s += `<g class="g-cursor" visibility="hidden"><line y1="${m.t}" y2="${base}"/><circle class="vc-v" r="5.5"/></g></svg>`;
  host.innerHTML = s;
  host.setAttribute('aria-label', aria);
  EST.set(host, { host, lectura, sr, puntos, x, y, W, defecto, texto, sel: null });
  lectura.innerHTML = defecto;
}

function marcar(host, i, anunciar = false) {
  const g = EST.get(host);
  if (!g) return;
  g.sel = i;
  const cur = host.querySelector('.g-cursor');
  if (i == null) { cur.setAttribute('visibility', 'hidden'); g.lectura.innerHTML = g.defecto; return; }
  const p = g.puntos[i];
  const px = g.x(p.fecha);
  cur.setAttribute('visibility', 'visible');
  const [ln, c] = cur.children;
  ln.setAttribute('x1', f1(px)); ln.setAttribute('x2', f1(px));
  c.setAttribute('cx', f1(px)); c.setAttribute('cy', f1(g.y(p.v)));
  g.lectura.innerHTML = g.texto(p);
  if (anunciar && g.sr) g.sr.textContent = g.lectura.textContent;
}

function cercano(g, ev) {
  const caja = g.host.querySelector('svg').getBoundingClientRect();
  const px = ((ev.clientX - caja.left) / caja.width) * g.W;
  let mejor = 0;
  for (let i = 1; i < g.puntos.length; i++) if (Math.abs(g.x(g.puntos[i].fecha) - px) < Math.abs(g.x(g.puntos[mejor].fecha) - px)) mejor = i;
  return mejor;
}

/** Lectura con puntero (dedo o ratón) y con teclado (flechas, Inicio, Fin). */
export function instalarEscalera(host) {
  const g = () => EST.get(host);
  host.addEventListener('pointermove', (e) => g() && marcar(host, cercano(g(), e)));
  host.addEventListener('pointerdown', (e) => g() && marcar(host, cercano(g(), e)));
  host.addEventListener('pointerleave', () => g() && document.activeElement !== host && marcar(host, null));
  host.addEventListener('blur', () => g() && marcar(host, null));
  host.addEventListener('keydown', (e) => {
    const e0 = g();
    if (!e0) return;
    const ult = e0.puntos.length - 1, act = e0.sel ?? ult;
    const sig = { ArrowLeft: act - 1, ArrowRight: act + 1, Home: 0, End: ult }[e.key];
    if (sig == null) return;
    e.preventDefault();
    marcar(host, Math.max(0, Math.min(ult, sig)), true);
  });
}

