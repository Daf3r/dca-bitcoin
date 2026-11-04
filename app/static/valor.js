// Gráfico «lo que pusiste y lo que vale»: el invertido neto frente al saldo de sats valorado a cada día.
import { usd0, usdSigno, pct, fechaLarga, muestrear, aFecha, ticksDolares } from './lib.js';

const f1 = (n) => n.toFixed(1);
const dfMes = new Intl.DateTimeFormat('es-SV', { month: 'short', year: 'numeric' });
const mes = (f) => dfMes.format(aFecha(f)).replace('.', '');
let V = null;
let primeraVez = true;

/** serie: salida de `serieValor` (con el precio vivo en el último punto). */
export function dibujarValor(host, lectura, { serie }) {
  const W = Math.max(280, host.clientWidth);
  const H = W < 560 ? 220 : W < 900 ? 260 : 280;
  if (serie.length < 2) { host.innerHTML = '<p class="g-vacio">Aún no hay suficiente histórico para este gráfico.</p>'; V = null; return; }
  const pts = muestrear(serie, Math.min(300, Math.round(W / 3)));
  const alto = Math.max(...pts.map((s) => Math.max(s.valor, s.inv))) * 1.1 || 1;
  const m = { t: 18, r: 12, b: 28, l: 10 };
  const t0 = aFecha(pts[0].fecha).getTime(), t1 = aFecha(pts.at(-1).fecha).getTime();
  const x = (f) => m.l + ((aFecha(f).getTime() - t0) / Math.max(1, t1 - t0)) * (W - m.l - m.r);
  const y = (d) => m.t + (1 - d / alto) * (H - m.t - m.b);
  const trazo = (clave) => pts.map((s, i) => `${i ? 'L' : 'M'}${f1(x(s.fecha))} ${f1(y(s[clave]))}`).join('');
  const base = H - m.b;

  let s = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">`;
  s += '<defs><linearGradient id="v-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="va-1"/><stop offset="1" class="va-2"/></linearGradient></defs>';
  const n = W < 560 ? 3 : 5;
  for (let k = 0; k < n; k++) {
    const p = pts[Math.round((k / (n - 1)) * (pts.length - 1))];
    s += `<text class="g-t" x="${f1(x(p.fecha))}" y="${H - 8}" text-anchor="${k === 0 ? 'start' : k === n - 1 ? 'end' : 'middle'}">${mes(p.fecha)}</text>`;
  }
  // Escala en dólares: líneas de referencia suaves con su cifra redonda; la cifra lleva un halo para leerse sobre las líneas.
  const ticks = ticksDolares(alto);
  for (const v of ticks) s += `<line class="v-rej" x1="${m.l}" x2="${W - m.r}" y1="${f1(y(v))}" y2="${f1(y(v))}"/>`;
  s += `<line class="v-base" x1="${m.l}" x2="${W - m.r}" y1="${base}" y2="${base}"/>`;
  s += `<path class="v-area" d="${trazo('valor')}L${f1(x(pts.at(-1).fecha))} ${base}L${f1(x(pts[0].fecha))} ${base}Z"/>`;
  s += `<path class="v-inv" d="${trazo('inv')}"/><path class="v-valor" d="${trazo('valor')}"/>`;
  for (const v of ticks) s += `<text class="g-t v-eje" x="${m.l}" y="${f1(y(v) - 6)}">${usd0(v)}</text>`;
  const u = pts.at(-1);
  s += `<circle class="v-hoy" cx="${f1(x(u.fecha))}" cy="${f1(y(u.valor))}" r="5"/>`;
  s += `<g class="g-cursor" visibility="hidden"><line y1="${m.t}" y2="${base}"/><circle class="vc-v" r="5.5"/><circle class="vc-i" r="4.5"/></g></svg>`;
  host.innerHTML = s;

  const gan = u.valor - u.inv, p = u.inv ? (gan / u.inv) * 100 : null;
  const defecto = `Hoy pusiste <b>${usd0(u.inv)}</b> y tu saldo vale <b>${usd0(u.valor)}</b>` +
    (p == null ? '.' : ` (<b data-tono="${gan >= 0 ? 'sube' : 'baja'}">${pct(p)}</b>).`);
  V = { host, lectura, pts, x, y, W, defecto, sel: null };
  lectura.innerHTML = defecto;
  // La primera vez, la línea del valor se dibuja de izquierda a derecha (sin movimiento reducido).
  if (primeraVez && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const l = host.querySelector('.v-valor');
    const L = l.getTotalLength();
    l.style.strokeDasharray = `${L} ${L}`;
    l.style.strokeDashoffset = L;
    l.getBoundingClientRect();
    l.style.transition = 'stroke-dashoffset 1.3s cubic-bezier(0.6, 0, 0.2, 1)';
    l.style.strokeDashoffset = 0;
  }
  primeraVez = false;
}

function marcar(i, anunciar = false) {
  if (!V) return;
  V.sel = i;
  const cur = V.host.querySelector('.g-cursor');
  if (i == null) { cur.setAttribute('visibility', 'hidden'); V.lectura.innerHTML = V.defecto; return; }
  const p = V.pts[i];
  const px = V.x(p.fecha);
  cur.setAttribute('visibility', 'visible');
  const [ln, cv, ci] = cur.children;
  ln.setAttribute('x1', f1(px)); ln.setAttribute('x2', f1(px));
  cv.setAttribute('cx', f1(px)); cv.setAttribute('cy', f1(V.y(p.valor)));
  ci.setAttribute('cx', f1(px)); ci.setAttribute('cy', f1(V.y(p.inv)));
  const gan = p.valor - p.inv;
  V.lectura.innerHTML = `${p.vivo ? 'Ahora' : fechaLarga(p.fecha)} · pusiste <b>${usd0(p.inv)}</b>, valía <b>${usd0(p.valor)}</b>` +
    (p.inv ? ` (<b data-tono="${gan >= 0 ? 'sube' : 'baja'}">${usdSigno(gan)}</b>)` : '');
  if (anunciar) document.getElementById('v-sr').textContent = V.lectura.textContent;
}

function cercano(ev) {
  const caja = V.host.querySelector('svg').getBoundingClientRect();
  const px = ((ev.clientX - caja.left) / caja.width) * V.W;
  let lo = 0, hi = V.pts.length - 1;
  while (lo < hi) { const md = (lo + hi) >> 1; if (V.x(V.pts[md].fecha) < px) lo = md + 1; else hi = md; }
  return lo > 0 && Math.abs(V.x(V.pts[lo - 1].fecha) - px) < Math.abs(V.x(V.pts[lo].fecha) - px) ? lo - 1 : lo;
}

/** Lectura con puntero (dedo o ratón) y con teclado (flechas, Inicio, Fin). */
export function instalarLecturaValor(host) {
  host.addEventListener('pointermove', (e) => V && marcar(cercano(e)));
  host.addEventListener('pointerdown', (e) => V && marcar(cercano(e)));
  host.addEventListener('pointerleave', () => V && document.activeElement !== host && marcar(null));
  host.addEventListener('blur', () => V && marcar(null));
  host.addEventListener('keydown', (e) => {
    if (!V) return;
    const ult = V.pts.length - 1, act = V.sel ?? ult;
    const paso = Math.max(1, Math.round(V.pts.length / 60));
    const sig = { ArrowLeft: act - paso, ArrowRight: act + paso, Home: 0, End: ult }[e.key];
    if (sig == null) return;
    e.preventDefault();
    marcar(Math.max(0, Math.min(ult, sig)), true);
  });
}
