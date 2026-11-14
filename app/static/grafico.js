// Gráfico del precio de BTC con tus compras encima y tu costo promedio.
import { usd, usd0, usdSigno, entero, pct, fechaLarga, fechaCorta, ubicar, muestrear, aFecha, tramosCaida, ticksPrecio } from './lib.js';
import { sinMovimiento } from './movimiento.js';
import { ilustracion } from './iconos.js';

const f1 = (n) => n.toFixed(1);
const dfMes = new Intl.DateTimeFormat('es-SV', { month: 'short', year: 'numeric' });
const mes = (f) => dfMes.format(aFecha(f)).replace('.', '');
// Cada gráfico (el de la página y el de pantalla completa) guarda su propio estado, asociado a su contenedor.
const EST = new WeakMap();
let primeraVez = true;

/**
 * serie: [{fecha, p}] con el precio en vivo al final; compras: items de resumen();
 * rango: días visibles (0 = todo). `log`: escala logarítmica. `alto`: alto fijo (pantalla completa). `tarjeta` y `sr`: la tarjeta
 * flotante y la zona que anuncia a los lectores de pantalla (fuera del contenedor, que es `role="img"`). `editar(id)`: abrir una
 * compra para editarla (solo el admin).
 */
export function dibujarGrafico(host, lectura, { serie, compras, ventas = [], promedio, rango, hoy, maximo30 = null, log = false, alto = null, tarjeta = null, sr = null, editar = null }) {
  const W = Math.max(280, host.clientWidth);
  const H = alto ? Math.max(200, Math.round(alto)) : W < 560 ? 250 : W < 900 ? 300 : 340;
  const previo = EST.get(host) ?? null;
  const corte = rango ? new Date(aFecha(hoy).getTime() - rango * 864e5) : null;
  const desde = corte ? serie.findIndex((x) => aFecha(x.fecha) >= corte) : 0;
  const visible = serie.slice(Math.max(0, desde));
  const bandas = serie.length > 1 ? tramosCaida(serie) : [];
  if (visible.length < 2) { host.innerHTML = `<p class="g-vacio">${ilustracion('grafico')}Aún no hay suficiente histórico para este rango.</p>`; EST.delete(host); if (tarjeta) tarjeta.hidden = true; return; }
  // Con años de datos diarios, ~2 puntos por cada 3 px bastan y el móvil va fluido.
  const pts = muestrear(visible, Math.min(300, Math.round(W / 3)));
  const enRango = compras.filter((c) => ubicar(c.fecha, visible) >= 0);
  const ventasRango = ventas.filter((c) => ubicar(c.fecha, visible) >= 0);
  const ps = pts.map((x) => x.p).concat(enRango.map((c) => c.precio), ventasRango.map((c) => c.precio));
  let lo = Math.min(...ps), hi = Math.max(...ps);
  const promDentro = promedio && promedio > lo * 0.7 && promedio < hi * 1.3;
  if (promDentro) { lo = Math.min(lo, promedio); hi = Math.max(hi, promedio); }
  if (maximo30 && maximo30.max > lo) hi = Math.max(hi, maximo30.max); // el máximo de 30 días, si hay gran caída, siempre cabe
  // Escala logarítmica (opcional, para «Todo»): las subidas grandes dejan de aplastar los movimientos antiguos.
  const f = log ? (v) => Math.log(Math.max(v, 1)) : (v) => v;
  lo = f(lo); hi = f(hi);
  const pad = (hi - lo) * 0.1 || hi * 0.05;
  lo -= pad; hi += pad * 1.4;
  const m = { t: 22, r: 12, b: 28, l: 10 };
  const t0 = aFecha(pts[0].fecha).getTime(), t1 = aFecha(pts.at(-1).fecha).getTime();
  const x = (f) => m.l + ((aFecha(f).getTime() - t0) / Math.max(1, t1 - t0)) * (W - m.l - m.r);
  const y = (p) => m.t + (1 - (f(p) - lo) / (hi - lo)) * (H - m.t - m.b);
  const linea = pts.map((s, i) => `${i ? 'L' : 'M'}${f1(x(s.fecha))} ${f1(y(s.p))}`).join('');

  // Al cambiar de rango (no en cada repintado) el dibujo anterior se desvanece mientras entra el nuevo.
  const viejo = host.querySelector('svg');
  const cambioRango = Boolean(viejo && previo && previo.rango !== rango && !sinMovimiento());
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
  if (log) s += `<text class="g-escala" x="${m.l}" y="${m.t - 8}">Escala logarítmica</text>`;
  const n = W < 560 ? 3 : 5;
  for (let k = 0; k < n; k++) {
    const p = pts[Math.round((k / (n - 1)) * (pts.length - 1))];
    s += `<text class="g-t" x="${f1(x(p.fecha))}" y="${H - 8}" text-anchor="${k === 0 ? 'start' : k === n - 1 ? 'end' : 'middle'}">${rango && rango <= 182 ? fechaCorta(p.fecha) : mes(p.fecha)}</text>`;
  }
  // Escala de precios: líneas de referencia suaves con cifra redonda al borde derecho (no estorban a «Tu costo» ni al máximo).
  const evita = [promDentro ? y(promedio) : null, maximo30 ? y(maximo30.max) : null].filter((v) => v != null);
  const ticksP = ticksPrecio(log ? Math.exp(lo) : lo, log ? Math.exp(hi) : hi, log)
    .map((v) => ({ v, yy: y(v) }))
    .filter(({ yy }) => yy > m.t + 12 && yy < H - m.b - 8 && evita.every((e) => Math.abs(yy - e) > 17));
  for (const { yy } of ticksP) s += `<line class="v-rej g-rej" x1="${m.l}" x2="${W - m.r}" y1="${f1(yy)}" y2="${f1(yy)}"/>`;
  s += `<path class="g-area" d="${linea}L${f1(x(pts.at(-1).fecha))} ${H - m.b}L${f1(x(pts[0].fecha))} ${H - m.b}Z"/>`;
  // Entre el precio y tu costo promedio: sombra lisa por encima de tu costo (vas ganando) y rayas por debajo (vas perdiendo).
  if (promDentro) {
    const cerrada = `${linea}L${f1(xf)} ${f1(yPromedio)}L${f1(xi)} ${f1(yPromedio)}Z`;
    s += `<path class="g-zona-g" clip-path="url(#g-clip-g)" d="${cerrada}"/><path class="g-zona-p" clip-path="url(#g-clip-p)" d="${cerrada}"/>`;
  }
  s += `<path class="g-linea" d="${linea}"/>`;
  for (const { v, yy } of ticksP) s += `<text class="g-t v-eje g-eje" x="${W - m.r}" y="${f1(yy - 5)}" text-anchor="end">${usd0(v)}</text>`;
  // Máximo de 30 días (solo con la tarjeta de gran caída): una línea punteada suave con su etiqueta.
  if (maximo30) {
    const ym = y(maximo30.max);
    const txtM = `Máx. ${maximo30.dias} días ${usd0(maximo30.max)}`;
    s += `<line class="g-max" x1="${m.l}" x2="${W - m.r}" y1="${f1(ym)}" y2="${f1(ym)}"/><text class="g-max-t" x="${W - m.r}" y="${f1(ym - 6)}" text-anchor="end">${txtM}</text>`;
  }
  let etiquetaCosto = '';
  if (promedio) {
    const yp = promDentro ? y(promedio) : f(promedio) < lo ? H - m.b - 4 : m.t + 4;
    if (promDentro) s += `<line class="g-prom" x1="${m.l}" x2="${W - m.r}" y1="${f1(yp)}" y2="${f1(yp)}"/>`;
    const txt = `Tu costo ${usd0(promedio)}${promDentro ? '' : f(promedio) < lo ? ' ↓' : ' ↑'}`;
    const ty = promDentro ? yp - 24 : f(promedio) < lo ? yp - 22 : yp;
    etiquetaCosto = `<g class="g-prom-tag"><rect x="${m.l}" y="${f1(ty)}" width="${f1(txt.length * 7 + 16)}" height="20" rx="10"/><text x="${m.l + 8}" y="${f1(ty + 14)}">${txt}</text></g>`;
  }
  // Las compras van a su propio precio: un único path de círculos, ligero aunque sean cientos.
  const r = enRango.length > 120 ? 2.6 : enRango.length > 30 ? 3.6 : 5.5;
  const cxy = enRango.map((c) => [x(visible[ubicar(c.fecha, visible)].fecha), y(c.precio)]);
  // El tamaño de cada punto sigue a los sats de esa compra (raíz cuadrada: el área, no el radio, es proporcional), entre 0.75 y 1.45 veces el normal.
  const mediana = (() => { const v = enRango.map((c) => c.sats).filter((q) => q > 0).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : 1; })();
  const rs = enRango.map((c) => r * Math.min(1.45, Math.max(0.75, Math.sqrt((c.sats || mediana) / mediana))));
  if (cxy.length) s += `<path class="g-compras" d="${cxy.map(([cx, cy], i) => `M${f1(cx - rs[i])} ${f1(cy)}a${f1(rs[i])} ${f1(rs[i])} 0 1 0 ${f1(2 * rs[i])} 0a${f1(rs[i])} ${f1(rs[i])} 0 1 0 ${f1(-2 * rs[i])} 0`).join('')}"/>`;
  // Las compras extra (por una caída) llevan un anillo naranja alrededor del punto.
  const extras = cxy.map((p, i) => [p, rs[i] + 3.2, enRango[i].extra]).filter((q) => q[2]);
  if (extras.length) s += `<path class="g-extras" d="${extras.map(([[cx, cy], re]) => `M${f1(cx - re)} ${f1(cy)}a${f1(re)} ${f1(re)} 0 1 0 ${f1(2 * re)} 0a${f1(re)} ${f1(re)} 0 1 0 ${f1(-2 * re)} 0`).join('')}"/>`;
  // Las ventas van como rombos huecos a su precio de venta.
  const vxy = ventasRango.map((c) => [x(visible[ubicar(c.fecha, visible)].fecha), y(c.precio)]);
  const rv = r + 1.5;
  const puntos = [...enRango.map((c, i) => ({ c, x: cxy[i][0], y: cxy[i][1] })), ...ventasRango.map((c, i) => ({ c, x: vxy[i][0], y: vxy[i][1] }))];
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
  const ley = host.closest('section')?.querySelector('.leyenda');
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
  const est = { host, lectura, pts, x, y, W, H, visible, enRango, defecto, sel: null, rango, puntos, tarjeta, sr, editar, fijada: null };
  EST.set(host, est);
  lectura.innerHTML = defecto;
  // Si había una compra fijada y sigue ahí tras repintar (el precio se refresca cada 30 s), se conserva su tarjeta.
  const idFijada = previo?.fijada?.id;
  const punto = idFijada ? puntos.find((q) => q.c.id === idFijada) : null;
  if (punto) fijar(est, punto, false); else if (tarjeta) { tarjeta.hidden = true; tarjeta.dataset.modo = ''; }
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


// ---------------------------------------------------------------- lectura: tarjeta flotante y compra fijada
// La tarjeta (`.g-tarjeta`) vive FUERA del contenedor del gráfico, que es `role="img"`: dentro no podría llevar botones.
// Hay dos modos: «lectura» (sigue al dedo o al ratón, no se toca) y «fija» (una compra tocada, con «Editar» para el admin).
const tx = (t, clase, texto) => { const el = t.querySelector(clase); if (el) el.textContent = texto; };

function posicionar(t, px) {
  t.style.setProperty('--cx', `${f1(px)}px`); // el CSS la mantiene dentro del gráfico (clamp) y por encima del dedo
}

function tarjetaLectura(g, p, compra, desde) {
  const t = g.tarjeta;
  if (!t || g.fijada) return;
  t.dataset.modo = 'lectura';
  t.removeAttribute('role');
  t.removeAttribute('aria-label');
  t.setAttribute('aria-hidden', 'true');
  tx(t, '.gt-fecha', p.vivo ? 'Ahora' : fechaLarga(p.fecha));
  tx(t, '.gt-precio', `BTC ${usd0(p.p)}`);
  tx(t, '.gt-sub', p.vivo ? '' : `Desde entonces ${pct(desde)}`);
  tx(t, '.gt-nota', compra ? `Compraste ${entero(compra.sats)} sats a ${usd0(compra.precio)}` : '');
  posicionar(t, g.x(p.fecha));
  t.hidden = false;
}

/** Fija la tarjeta en una compra (o venta): sus datos, y «Editar» si quien mira puede (`opciones.editar`). */
function fijar(g, punto, anunciar = true) {
  const t = g.tarjeta;
  const c = punto.c;
  g.fijada = c;
  if (!t) return;
  const venta = c.tipo === 'venta';
  t.dataset.modo = 'fija';
  t.removeAttribute('aria-hidden');
  t.setAttribute('role', 'group');
  t.setAttribute('aria-label', venta ? 'Detalle de la venta o gasto' : 'Detalle de la compra');
  tx(t, '.gt-fecha', `${venta ? 'Venta o gasto' : c.extra ? 'Compra extra' : 'Compra'} · ${fechaLarga(c.fecha)}`);
  tx(t, '.gt-precio', `${venta ? '−' : '+'}${entero(c.sats)} sats`);
  const hoy = g.pts.at(-1).p;
  const valorHoy = (c.sats / 1e8) * hoy;
  tx(t, '.gt-sub', `${usd(c.monto)} a ${usd0(c.precio)}`);
  tx(t, '.gt-nota', [venta ? '' : `Hoy ${usdSigno(valorHoy - c.monto)} (${pct((valorHoy / c.monto - 1) * 100)})`, c.nota ? `«${c.nota}»` : ''].filter(Boolean).join(' · '));
  const editar = t.querySelector('.gt-editar');
  if (editar) { editar.hidden = !g.editar; editar.dataset.id = String(c.id ?? ''); }
  posicionar(t, punto.x);
  t.hidden = false;
  if (anunciar && g.sr) g.sr.textContent = `${t.querySelector('.gt-fecha').textContent}. ${t.querySelector('.gt-precio').textContent}. ${t.querySelector('.gt-sub').textContent}. ${t.querySelector('.gt-nota').textContent}`;
}

function desfijar(g) {
  g.fijada = null;
  if (g.tarjeta) { g.tarjeta.hidden = true; g.tarjeta.dataset.modo = ''; }
}

/** `teclado`: la lectura viene de las flechas (además de la tarjeta, se anuncia a los lectores de pantalla). */
function marcar(host, i, teclado = false) {
  const g = EST.get(host);
  if (!g) return;
  g.sel = i;
  const cur = host.querySelector('.g-cursor');
  if (i == null) {
    cur.setAttribute('visibility', 'hidden');
    if (!g.tarjeta) g.lectura.innerHTML = g.defecto;
    if (g.tarjeta && !g.fijada) g.tarjeta.hidden = true;
    return;
  }
  const p = g.pts[i];
  const px = g.x(p.fecha);
  cur.setAttribute('visibility', 'visible');
  const [ln, cp, cc] = cur.children;
  ln.setAttribute('x1', f1(px)); ln.setAttribute('x2', f1(px));
  cp.setAttribute('cx', f1(px)); cp.setAttribute('cy', f1(g.y(p.p)));
  // ¿Hubo compra cerca de ese punto? (la serie está decimada: se mira el tramo que representa)
  const ini = i ? g.pts[i - 1].fecha : p.fecha, fin = i < g.pts.length - 1 ? g.pts[i + 1].fecha : p.fecha;
  const compra = g.enRango.filter((c) => c.fecha > ini && c.fecha < fin || c.fecha === p.fecha).at(-1);
  cc.setAttribute('visibility', compra ? 'visible' : 'hidden');
  if (compra) { cc.setAttribute('cx', f1(px)); cc.setAttribute('cy', f1(g.y(compra.precio))); }
  const desde = (g.pts.at(-1).p / p.p - 1) * 100;
  // El dato va en la tarjeta y se anuncia a los lectores de pantalla; el texto de arriba NO cambia (si cambiara de alto, el gráfico
  // y la leyenda se correrían bajo el dedo y el toque caería en otro sitio). Sin tarjeta, se escribe ahí como antes.
  const texto = `${p.vivo ? 'Ahora' : fechaLarga(p.fecha)} · BTC ${usd0(p.p)}${p.vivo ? '' : ` · desde entonces ${pct(desde)}`}` +
    (compra ? `. Compraste ${entero(compra.sats)} sats a ${usd0(compra.precio)} el ${fechaCorta(compra.fecha)} (hoy ${usdSigno((compra.sats / 1e8) * g.pts.at(-1).p - compra.monto)})` : '');
  if (!g.tarjeta) g.lectura.textContent = texto;
  tarjetaLectura(g, p, compra, desde);
  if (teclado && g.sr) g.sr.textContent = texto;
}

function aSvg(g, ev) {
  const caja = g.host.querySelector('svg').getBoundingClientRect();
  return { px: ((ev.clientX - caja.left) / caja.width) * g.W, py: ((ev.clientY - caja.top) / caja.height) * g.H };
}

function cercano(g, ev) {
  const { px } = aSvg(g, ev);
  let lo = 0, hi = g.pts.length - 1;
  while (lo < hi) { const md = (lo + hi) >> 1; if (g.x(g.pts[md].fecha) < px) lo = md + 1; else hi = md; }
  return lo > 0 && Math.abs(g.x(g.pts[lo - 1].fecha) - px) < Math.abs(g.x(g.pts[lo].fecha) - px) ? lo - 1 : lo;
}

/** El punto de compra o venta más cercano al toque, si cae dentro de la zona táctil (24 px de radio, 48 de diámetro). */
function puntoTocado(g, ev) {
  const { px, py } = aSvg(g, ev);
  let mejor = null, d2 = 24 * 24;
  for (const q of g.puntos) {
    const d = (q.x - px) ** 2 + (q.y - py) ** 2;
    if (d <= d2) { d2 = d; mejor = q; }
  }
  return mejor;
}

/**
 * Lectura con puntero (dedo o ratón) y con teclado (flechas, Inicio, Fin; Intro fija la compra de ese día). Tocar un punto de compra
 * fija su tarjeta; tocar en otro sitio, Esc o «Cerrar» la quita. El botón «Editar» sale si el dibujo recibió `editar(id)` (solo el admin).
 */
export function instalarLectura(host) {
  const dueno = () => EST.get(host);
  host.addEventListener('pointermove', (e) => { const g = dueno(); if (g) marcar(host, cercano(g, e)); });
  // El punto tocado se decide al bajar el dedo (antes de que nada se mueva) y se usa en el `click`.
  host.addEventListener('pointerdown', (e) => { const g = dueno(); if (g) { g.alBajar = puntoTocado(g, e); marcar(host, cercano(g, e)); } });
  host.addEventListener('pointerleave', () => dueno() && document.activeElement !== host && marcar(host, null));
  host.addEventListener('blur', () => dueno() && marcar(host, null));
  host.addEventListener('click', (e) => {
    const g = dueno();
    if (!g) return;
    const q = g.alBajar ?? puntoTocado(g, e);
    g.alBajar = null;
    if (q) fijar(g, q); else if (g.fijada) desfijar(g);
  });
  host.addEventListener('keydown', (e) => {
    const g = dueno();
    if (!g) return;
    if (e.key === 'Escape' && g.fijada) { e.preventDefault(); desfijar(g); return; }
    const ult = g.pts.length - 1, act = g.sel ?? ult;
    if (e.key === 'Enter' && g.sel != null) {
      const p = g.pts[g.sel];
      const ini = g.sel ? g.pts[g.sel - 1].fecha : p.fecha, fin = g.sel < ult ? g.pts[g.sel + 1].fecha : p.fecha;
      const q = g.puntos.find((z) => z.c.fecha > ini && z.c.fecha < fin || z.c.fecha === p.fecha);
      if (q) { e.preventDefault(); fijar(g, q); }
      return;
    }
    const paso = Math.max(1, Math.round(g.pts.length / 60));
    const sig = { ArrowLeft: act - paso, ArrowRight: act + paso, Home: 0, End: ult }[e.key];
    if (sig == null) return;
    e.preventDefault();
    marcar(host, Math.max(0, Math.min(ult, sig)), true);
  });
  // Los botones de la tarjeta (editar y cerrar) se atienden desde el contenedor de la tarjeta, que no es hijo del gráfico.
  document.addEventListener('click', (e) => {
    const g = dueno();
    const card = g?.tarjeta;
    if (!card?.contains(e.target)) return;
    if (e.target.closest('.gt-cerrar')) { desfijar(g); host.focus({ preventScroll: true }); }
    else if (e.target.closest('.gt-editar')) { const id = Number(card.querySelector('.gt-editar').dataset.id); desfijar(g); g.editar?.(id); }
  });
}
