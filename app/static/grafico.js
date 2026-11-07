// Gráfico del precio de BTC con tus compras encima y tu costo promedio.
import { usd0, usdSigno, entero, pct, fechaLarga, fechaCorta, ubicar, muestrear, aFecha, tramosCaida } from './lib.js';
import { sinMovimiento } from './movimiento.js';

const f1 = (n) => n.toFixed(1);
const dfMes = new Intl.DateTimeFormat('es-SV', { month: 'short', year: 'numeric' });
const mes = (f) => dfMes.format(aFecha(f)).replace('.', '');
let G = null;
let primeraVez = true;

/**
 * serie: [{fecha, p}] con el precio en vivo al final; compras: items de resumen();
 * rango: días visibles (0 = todo).
 */
export function dibujarGrafico(host, lectura, { serie, compras, ventas = [], promedio, rango, hoy, maximo30 = null }) {
  const W = Math.max(280, host.clientWidth);
  const H = W < 560 ? 250 : W < 900 ? 300 : 340;
  const corte = rango ? new Date(aFecha(hoy).getTime() - rango * 864e5) : null;
  const desde = corte ? serie.findIndex((x) => aFecha(x.fecha) >= corte) : 0;
  const visible = serie.slice(Math.max(0, desde));
  const bandas = serie.length > 1 ? tramosCaida(serie) : [];
  if (visible.length < 2) { host.innerHTML = '<p class="g-vacio">Aún no hay suficiente histórico para este rango.</p>'; G = null; return; }
  // Con años de datos diarios, ~2 puntos por cada 3 px bastan y el móvil va fluido.
  const pts = muestrear(visible, Math.min(300, Math.round(W / 3)));
  const enRango = compras.filter((c) => ubicar(c.fecha, visible) >= 0);
  const ventasRango = ventas.filter((c) => ubicar(c.fecha, visible) >= 0);
  const ps = pts.map((x) => x.p).concat(enRango.map((c) => c.precio), ventasRango.map((c) => c.precio));
  let lo = Math.min(...ps), hi = Math.max(...ps);
  const promDentro = promedio && promedio > lo * 0.7 && promedio < hi * 1.3;
  if (promDentro) { lo = Math.min(lo, promedio); hi = Math.max(hi, promedio); }
  if (maximo30 && maximo30.max > lo) hi = Math.max(hi, maximo30.max); // el máximo de 30 días, si hay gran caída, siempre cabe
  const pad = (hi - lo) * 0.1 || hi * 0.05;
  lo -= pad; hi += pad * 1.4;
  const m = { t: 22, r: 12, b: 28, l: 10 };
  const t0 = aFecha(pts[0].fecha).getTime(), t1 = aFecha(pts.at(-1).fecha).getTime();
  const x = (f) => m.l + ((aFecha(f).getTime() - t0) / Math.max(1, t1 - t0)) * (W - m.l - m.r);
  const y = (p) => m.t + (1 - (p - lo) / (hi - lo)) * (H - m.t - m.b);
  const linea = pts.map((s, i) => `${i ? 'L' : 'M'}${f1(x(s.fecha))} ${f1(y(s.p))}`).join('');

  // Al cambiar de rango (no en cada repintado) el dibujo anterior se desvanece mientras entra el nuevo.
  const viejo = host.querySelector('svg');
  const cambioRango = Boolean(viejo && G && G.rango !== rango && !sinMovimiento());
  const fantasma = cambioRango ? viejo.cloneNode(true) : null;
  let s = `<svg${cambioRango ? ' class="g-entra"' : ''} viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">`;
  // El brillo de la línea sigue la tendencia (más apagada donde baja, plena donde sube): no depende del color.
  const ult = pts.length - 1, ven = Math.max(2, Math.round(pts.length / 16));
  let paradas = '';
  for (let k = 0; k <= 12; k++) {
    const i = Math.round((k / 12) * ult);
    const rel = (pts[Math.min(ult, i + ven)].p - pts[Math.max(0, i - ven)].p) / pts[i].p;
    paradas += `<stop offset="${(k / 12).toFixed(3)}" class="gt" stop-opacity="${(0.55 + 0.45 * Math.max(0, Math.min(1, (rel + 0.04) / 0.08))).toFixed(2)}"/>`;
  }
  const xi = x(pts[0].fecha), xf = x(pts.at(-1).fecha);
  const yPromedio = promDentro ? y(promedio) : null;
  s += `<defs><linearGradient id="g-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="ga-1"/><stop offset="1" class="ga-2"/></linearGradient>` +
    `<linearGradient id="g-trend" gradientUnits="userSpaceOnUse" x1="${f1(xi)}" y1="0" x2="${f1(xf)}" y2="0">${paradas}</linearGradient>` +
    (promDentro ? `<pattern id="g-rayas" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line class="g-raya" x1="0" y1="0" x2="0" y2="6"/></pattern>` +
      `<clipPath id="g-clip-g"><rect x="0" y="0" width="${W}" height="${f1(yPromedio)}"/></clipPath><clipPath id="g-clip-p"><rect x="0" y="${f1(yPromedio)}" width="${W}" height="${f1(H - yPromedio)}"/></clipPath>` : '') +
    `</defs>`;
  // Bandas tenues en los tramos de gran caída (15 % o más bajo el máximo de 30 días): solo informan.
  // (las fechas son texto AAAA-MM-DD: se comparan como texto, no con Math.max)
  const primera = pts[0].fecha, ultima = pts.at(-1).fecha;
  const bandasVis = bandas.map((b) => [b.desde > primera ? b.desde : primera, b.hasta < ultima ? b.hasta : ultima]).filter(([d, h]) => d <= h);
  for (const [d, h] of bandasVis) s += `<rect class="g-banda" x="${f1(x(d))}" y="${m.t}" width="${f1(Math.max(2, x(h) - x(d)))}" height="${H - m.t - m.b}"/>`;
  const n = W < 560 ? 3 : 5;
  for (let k = 0; k < n; k++) {
    const p = pts[Math.round((k / (n - 1)) * (pts.length - 1))];
    s += `<text class="g-t" x="${f1(x(p.fecha))}" y="${H - 8}" text-anchor="${k === 0 ? 'start' : k === n - 1 ? 'end' : 'middle'}">${rango && rango <= 182 ? fechaCorta(p.fecha) : mes(p.fecha)}</text>`;
  }
  s += `<path class="g-area" d="${linea}L${f1(x(pts.at(-1).fecha))} ${H - m.b}L${f1(x(pts[0].fecha))} ${H - m.b}Z"/>`;
  // Entre el precio y tu costo promedio: sombra lisa por encima de tu costo (vas ganando) y rayas por debajo (vas perdiendo).
  if (promDentro) {
    const cerrada = `${linea}L${f1(xf)} ${f1(yPromedio)}L${f1(xi)} ${f1(yPromedio)}Z`;
    s += `<path class="g-zona-g" clip-path="url(#g-clip-g)" d="${cerrada}"/><path class="g-zona-p" clip-path="url(#g-clip-p)" d="${cerrada}"/>`;
  }
  s += `<path class="g-linea" d="${linea}"/>`;
  // Máximo de 30 días (solo con la tarjeta de gran caída): una línea punteada suave con su etiqueta.
  if (maximo30) {
    const ym = y(maximo30.max);
    const txtM = `Máx. ${maximo30.dias} días ${usd0(maximo30.max)}`;
    s += `<line class="g-max" x1="${m.l}" x2="${W - m.r}" y1="${f1(ym)}" y2="${f1(ym)}"/><text class="g-max-t" x="${W - m.r}" y="${f1(ym - 6)}" text-anchor="end">${txtM}</text>`;
  }
  let etiquetaCosto = '';
  if (promedio) {
    const yp = promDentro ? y(promedio) : promedio < lo ? H - m.b - 4 : m.t + 4;
    if (promDentro) s += `<line class="g-prom" x1="${m.l}" x2="${W - m.r}" y1="${f1(yp)}" y2="${f1(yp)}"/>`;
    const txt = `Tu costo ${usd0(promedio)}${promDentro ? '' : promedio < lo ? ' ↓' : ' ↑'}`;
    const ty = promDentro ? yp - 24 : promedio < lo ? yp - 22 : yp;
    etiquetaCosto = `<g class="g-prom-tag"><rect x="${m.l}" y="${f1(ty)}" width="${f1(txt.length * 7 + 16)}" height="20" rx="10"/><text x="${m.l + 8}" y="${f1(ty + 14)}">${txt}</text></g>`;
  }
  // Las compras van a su propio precio: un único path de círculos, ligero aunque sean cientos.
  const r = enRango.length > 120 ? 2.6 : enRango.length > 30 ? 3.6 : 5.5;
  const cxy = enRango.map((c) => [x(visible[ubicar(c.fecha, visible)].fecha), y(c.precio)]);
  if (cxy.length) s += `<path class="g-compras" d="${cxy.map(([cx, cy]) => `M${f1(cx - r)} ${f1(cy)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`).join('')}"/>`;
  // Las compras extra (por una caída) llevan un anillo naranja alrededor del punto.
  const extras = cxy.filter((_, i) => enRango[i].extra);
  const re = r + 3.2;
  if (extras.length) s += `<path class="g-extras" d="${extras.map(([cx, cy]) => `M${f1(cx - re)} ${f1(cy)}a${re} ${re} 0 1 0 ${2 * re} 0a${re} ${re} 0 1 0 ${-2 * re} 0`).join('')}"/>`;
  // Las ventas van como rombos huecos a su precio de venta.
  const vxy = ventasRango.map((c) => [x(visible[ubicar(c.fecha, visible)].fecha), y(c.precio)]);
  const rv = r + 1.5;
  if (vxy.length) s += `<path class="g-ventas" d="${vxy.map(([cx, cy]) => `M${f1(cx)} ${f1(cy - rv)}L${f1(cx + rv)} ${f1(cy)}L${f1(cx)} ${f1(cy + rv)}L${f1(cx - rv)} ${f1(cy)}Z`).join('')}"/>`;
  // La etiqueta del costo va encima de los puntos para que siempre se lea.
  if (promedio) s += etiquetaCosto;
  if (enRango.length && enRango.length <= 2) {
    const c = enRango.at(-1), [cx, cy] = cxy.at(-1);
    const k = compras.length === 1 ? 'Tu primera compra' : 'Tu última compra';
    const l2 = `a ${usd0(c.precio)} · ${fechaCorta(c.fecha)}`;
    const ancho = Math.max(k.length * 7.6, l2.length * 7.2) + 8;
    // Se prueban varias posiciones (a cada lado y a distintas alturas, incluida la pegada al fondo o al techo) y gana la que
    // menos roza la línea del precio y no se sale del gráfico; a igualdad, la de siempre (arriba, hacia el lado con más sitio).
    const lado0 = cx > W * 0.55;
    const alturas = [cy - 46, cy + 40, cy - 90, m.t + 16, H - m.b - 22];
    const candidatos = [lado0, !lado0].flatMap((izq0, l) => alturas.map((ty0, a) => {
      const tx0 = izq0 ? cx - 12 : cx + 12;
      const x0 = izq0 ? tx0 - ancho : tx0, x1 = izq0 ? tx0 : tx0 + ancho, y0 = ty0 - 15, y1 = ty0 + 22;
      const fuera = x0 < m.l || x1 > W - m.r || y0 < m.t || y1 > H - m.b;
      const roces = pts.filter((q) => { const px = x(q.fecha), py = y(q.p); return px >= x0 - 3 && px <= x1 + 3 && py >= y0 - 3 && py <= y1 + 3; }).length;
      return { izq0, tx0, ty0, puntos: roces * 10 + (fuera ? 10000 : 0) + l * 5 + a };
    }));
    const { izq0: izq, tx0: tx, ty0: ty } = candidatos.reduce((a, b) => (b.puntos < a.puntos ? b : a));
    s += `<g class="g-nota"><line x1="${f1(cx)}" y1="${f1(cy)}" x2="${f1(tx)}" y2="${f1(ty + (ty > cy ? -12 : 10))}"/>` +
      `<text x="${f1(tx)}" y="${f1(ty)}" text-anchor="${izq ? 'end' : 'start'}"><tspan class="gn-k" x="${f1(tx)}">${k}</tspan>` +
      `<tspan x="${f1(tx)}" dy="17">${l2}</tspan></text></g>`;
  }
  const u = pts.at(-1);
  s += `<circle class="g-pulso" cx="${f1(x(u.fecha))}" cy="${f1(y(u.p))}" r="5"/><circle class="g-hoy" cx="${f1(x(u.fecha))}" cy="${f1(y(u.p))}" r="5"/>`;
  s += `<g class="g-cursor" visibility="hidden"><line y1="${m.t}" y2="${H - m.b}"/><circle class="gc-p" r="6"/><circle class="gc-c" r="5" visibility="hidden"/></g></svg>`;
  host.innerHTML = s;
  if (fantasma) {
    fantasma.classList.add('g-sale');
    fantasma.classList.remove('g-entra');
    host.append(fantasma);
    setTimeout(() => fantasma.remove(), 450);
  }
  // La leyenda enseña solo lo que hay dibujado.
  const ley = host.parentElement.querySelector('.leyenda');
  const mostrar = (clase, si) => { const el = ley?.querySelector(clase); if (el) el.hidden = !si; };
  mostrar('.k-x', extras.length > 0);
  mostrar('.k-g', promDentro);
  mostrar('.k-l', promDentro);
  mostrar('.k-b', bandasVis.length > 0);
  mostrar('.k-m', Boolean(maximo30));

  const cambio = (u.p / pts[0].p - 1) * 100;
  const periodo = { 30: 'en el último mes', 182: 'en los últimos 6 meses', 365: 'en el último año' }[rango] ?? `desde ${mes(pts[0].fecha)}`;
  const defecto = `BTC <b>${usd0(u.p)}</b> hoy, <b data-tono="${cambio >= 0 ? 'sube' : 'baja'}">${pct(cambio)}</b> ${periodo}.` +
    (enRango.length ? ` <span class="lec-tuya">${enRango.length} ${enRango.length === 1 ? 'compra tuya' : 'compras tuyas'} aquí.</span>` : '');
  G = { host, lectura, pts, x, y, W, visible, enRango, defecto, sel: null, rango };
  lectura.innerHTML = defecto;
  if (primeraVez && !sinMovimiento()) {
    const p = host.querySelector('.g-linea');
    const L = p.getTotalLength();
    p.style.strokeDasharray = `${L} ${L}`;
    p.style.strokeDashoffset = L;
    p.getBoundingClientRect();
    p.style.transition = 'stroke-dashoffset 1.3s cubic-bezier(0.6, 0, 0.2, 1)';
    p.style.strokeDashoffset = 0;
  }
  primeraVez = false;
}

function marcar(i, anunciar = false) {
  if (!G) return;
  G.sel = i;
  const cur = G.host.querySelector('.g-cursor');
  if (i == null) { cur.setAttribute('visibility', 'hidden'); G.lectura.innerHTML = G.defecto; return; }
  const p = G.pts[i];
  const px = G.x(p.fecha);
  cur.setAttribute('visibility', 'visible');
  const [ln, cp, cc] = cur.children;
  ln.setAttribute('x1', f1(px)); ln.setAttribute('x2', f1(px));
  cp.setAttribute('cx', f1(px)); cp.setAttribute('cy', f1(G.y(p.p)));
  // ¿Hubo compra cerca de ese punto? (la serie está decimada: se mira el tramo que representa)
  const ini = i ? G.pts[i - 1].fecha : p.fecha, fin = i < G.pts.length - 1 ? G.pts[i + 1].fecha : p.fecha;
  const compra = G.enRango.filter((c) => c.fecha > ini && c.fecha < fin || c.fecha === p.fecha).at(-1);
  cc.setAttribute('visibility', compra ? 'visible' : 'hidden');
  if (compra) { cc.setAttribute('cx', f1(px)); cc.setAttribute('cy', f1(G.y(compra.precio))); }
  const desde = (G.pts.at(-1).p / p.p - 1) * 100;
  G.lectura.innerHTML = `${p.vivo ? 'Ahora' : fechaLarga(p.fecha)} · BTC <b>${usd0(p.p)}</b>` +
    (p.vivo ? '' : ` · desde entonces <b data-tono="${desde >= 0 ? 'sube' : 'baja'}">${pct(desde)}</b>`) +
    (compra ? `<br><span class="lec-tuya">Compraste ${entero(compra.sats)} sats a ${usd0(compra.precio)} el ${fechaCorta(compra.fecha)}` +
      ` (hoy ${usdSigno((compra.sats / 1e8) * G.pts.at(-1).p - compra.monto)})</span>` : '');
  if (anunciar) document.getElementById('g-sr').textContent = G.lectura.textContent;
}

function cercano(ev) {
  const caja = G.host.querySelector('svg').getBoundingClientRect();
  const px = ((ev.clientX - caja.left) / caja.width) * G.W;
  let lo = 0, hi = G.pts.length - 1;
  while (lo < hi) { const md = (lo + hi) >> 1; if (G.x(G.pts[md].fecha) < px) lo = md + 1; else hi = md; }
  return lo > 0 && Math.abs(G.x(G.pts[lo - 1].fecha) - px) < Math.abs(G.x(G.pts[lo].fecha) - px) ? lo - 1 : lo;
}

/** Lectura con puntero (dedo o ratón) y con teclado (flechas, Inicio, Fin). */
export function instalarLectura(host) {
  host.addEventListener('pointermove', (e) => G && marcar(cercano(e)));
  host.addEventListener('pointerdown', (e) => G && marcar(cercano(e)));
  host.addEventListener('pointerleave', () => G && document.activeElement !== host && marcar(null));
  host.addEventListener('blur', () => G && marcar(null));
  host.addEventListener('keydown', (e) => {
    if (!G) return;
    const ult = G.pts.length - 1, act = G.sel ?? ult;
    const paso = Math.max(1, Math.round(G.pts.length / 60));
    const sig = { ArrowLeft: act - paso, ArrowRight: act + paso, Home: 0, End: ult }[e.key];
    if (sig == null) return;
    e.preventDefault();
    marcar(Math.max(0, Math.min(ult, sig)), true);
  });
}
