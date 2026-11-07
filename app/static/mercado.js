import { aFecha, costoVsPromedio, entero, hoyISO, satsPorDolar, serieGrafico, serieSatsPorDolar, serieValor, usd0 } from './lib.js';
import { dibujarGrafico, instalarLectura } from './grafico.js';
import { dibujarValor, instalarLecturaValor } from './valor.js';
import { caidaVisible } from './reportes.js';
import { $, R, S } from './estado.js';

// --------------------------------------------------------------- gráfico
const RANGOS = [30, 182, 365, 0];
function rangoPorDefecto() {
  // El menor rango que contenga la primera compra, nunca menos de 6 meses: con una compra se ve contexto.
  const primera = R.items[0];
  if (!primera) return 365;
  const dias = (aFecha(hoyISO()) - aFecha(primera.fecha)) / 864e5;
  return RANGOS.find((r) => r >= 182 && dias <= r) ?? 0;
}
let anchoGrafico = 0;
export function pintarMercado() {
  const host = $('lienzo');
  if (S.rango === null && S.cargado) S.rango = rangoPorDefecto();
  document.querySelectorAll('#rangos button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.r) === S.rango)));
  const listo = S.histEstado === 'ok' && S.cargado;
  host.classList.toggle('esqueleto', S.histEstado === 'cargando' || !S.cargado);
  if (!listo) {
    host.innerHTML = S.histEstado === 'error' ? '<p class="g-vacio">El histórico de precios no está disponible ahora. Lo demás funciona igual.</p>' : '';
    $('g-lectura').textContent = S.histEstado === 'error' ? '' : 'Cargando el histórico de precios…';
    return;
  }
  anchoGrafico = host.clientWidth;
  dibujarGrafico(host, $('g-lectura'), { serie: serieGrafico(S.historico, S.precio, hoyISO()), compras: R.items.filter((c) => c.tipo !== 'venta'), ventas: R.items.filter((c) => c.tipo === 'venta'), promedio: R.promedio, rango: S.rango, hoy: hoyISO(), maximo30: caidaVisible() });
}
instalarLectura($('lienzo'));

// Lo que pusiste y lo que vale: desde 3 compras y con histórico y precio; si falta algo, la sección no sale.
let anchoValor = 0;
export function pintarValor() {
  const serie = R.nCompras >= 3 && S.cargado && S.histEstado === 'ok' && S.precio ? serieValor(R.items, S.historico, S.precio, hoyISO()) : [];
  $('valor').hidden = serie.length < 2;
  if (serie.length < 2) return;
  anchoValor = $('v-lienzo').clientWidth;
  dibujarValor($('v-lienzo'), $('v-lectura'), { serie });
  const c = costoVsPromedio(R, S.historico, S.precio, hoyISO());
  $('v-vs').hidden = !c;
  if (c) $('v-vs').textContent = textoVs(c);
}
/** Tu costo promedio frente al precio promedio del período, en palabras: sin presumir cuando sale por encima. */
function textoVs(c) {
  const meses = Math.round(c.dias / 30.44);
  const periodo = c.dias < 60 ? `estas ${Math.round(c.dias / 7)} semanas` : `estos ${meses} meses`;
  const base = `Tu costo promedio (${usd0(c.costo)})`;
  const prom = `precio promedio de ${periodo} (${usd0(c.promedio)})`;
  if (Math.abs(c.cambio) < 0.5) return `${base} es casi igual al ${prom}.`;
  const p = Math.abs(c.cambio).toFixed(1);
  return c.cambio < 0
    ? `${base} está un ${p}% por debajo del ${prom}. Es el efecto de comprar poco y seguido: cuando el precio baja, los mismos dólares compran más sats.`
    : `${base} está un ${p}% por encima del ${prom}. Pasa según en qué momentos coincidieron tus compras con las subidas y bajadas del precio.`;
}
instalarLecturaValor($('v-lienzo'));
new ResizeObserver(() => { if ($('v-lienzo').clientWidth && $('v-lienzo').clientWidth !== anchoValor) pintarValor(); }).observe($('v-lienzo'));
$('rangos').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) { S.rango = Number(b.dataset.r); pintarMercado(); }
});
new ResizeObserver(() => { if ($('lienzo').clientWidth !== anchoGrafico) pintarMercado(); }).observe($('lienzo'));

// ----------------------------------------------------- sats por dólar
const SVG_NS = 'http://www.w3.org/2000/svg';
/** Cuántos sats compra $1 hoy y cómo cambió en el último mes, con una línea. Sin precio o con menos de 14 días de histórico, la tarjeta se oculta. */
export function pintarSatsDolar() {
  const hoy = satsPorDolar(S.precio);
  const serie = serieSatsPorDolar(S.historico, S.precio);
  const ver = S.cargado && hoy != null && serie != null;
  $('spd').hidden = !ver;
  if (!ver) return;
  $('spd-v').textContent = entero(hoy);
  const inicio = serie[0], dias = Math.round((aFecha(serie.at(-1).fecha) - aFecha(inicio.fecha)) / 864e5);
  const cambio = (hoy / inicio.spd - 1) * 100;
  $('spd-t').textContent = Math.abs(cambio) < 0.5
    ? `Casi igual que hace ${dias} días (${entero(inicio.spd)} sats).`
    : `Hace ${dias} días eran ${entero(inicio.spd)} sats: hoy son un ${Math.abs(cambio).toFixed(1)}% ${cambio > 0 ? 'más' : 'menos'}.`;
  const lin = $('spd-l');
  const vals = serie.map((p) => p.spd);
  const mn = Math.min(...vals), mx = Math.max(...vals), rango = mx - mn || 1;
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * 120, 36 - ((v - mn) / rango) * 32]);
  lin.setAttribute('aria-label', `Sats por dólar en los últimos ${dias} días: de ${entero(inicio.spd)} a ${entero(hoy)}`);
  const poly = document.createElementNS(SVG_NS, 'polyline');
  poly.setAttribute('points', pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' '));
  const punto = document.createElementNS(SVG_NS, 'circle');
  punto.setAttribute('cx', pts.at(-1)[0].toFixed(1));
  punto.setAttribute('cy', pts.at(-1)[1].toFixed(1));
  punto.setAttribute('r', '3');
  lin.replaceChildren(poly, punto);
}
