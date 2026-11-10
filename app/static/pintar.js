import { aFecha, acentoDe, btc, cruzo1Btc, entero, etapasCruzadas, hayAurora, haceCuanto, hoyISO, hora, nombreHito, pct, resumen, numCorto, serieValor, tocaComprar, usd, usd0, usdSigno, usdSignoCorto, variacionAyer } from './lib.js';
import { pintarAnillo } from './anillo.js';
import { ico } from './iconos.js';
import { dual, miniLinea } from './cifras.js';
import { dibujarMontana, subir } from './montana.js';
import { pintarOdometro } from './odometro.js';
import { ofrecerAvisos } from './cuenta.js';
import { $, R, S, esAdmin, fijarR, reducido } from './estado.js';
import { actualizarIndice } from './indice.js';
import { pintarLista } from './lista.js';
import { pintarMercado, pintarSatsDolar, pintarValor, pintarVistas } from './mercado.js';
import { pintarNovedades } from './novedades.js';
import { pintarCaida, pintarComienzo, pintarEquilibrio, pintarReportes, pintarToca, pintarUbicacion } from './reportes.js';

// ---------------------------------------------------------------- pintar
export function pintar({ montana = false, animar = false, desde = null, festejo = null } = {}) {
  fijarR(resumen(S.compras, S.precio));
  $('sk-cards').hidden = S.cargado; // las formas grises de carga se van cuando llegan los datos
  pintarPrecio();
  pintarSaldo(desde);
  if (montana) pintarMontana(animar, desde, festejo);
  if (!acentoRetenido) pintarAcento();
  pintarToca();
  pintarCaida();
  pintarTramo();
  pintarSatsDolar();
  pintarMercado();
  pintarValor();
  pintarVistas();
  pintarEquilibrio();
  pintarLista();
  pintarUbicacion();
  pintarReportes();
  pintarComienzo();
  pintarNovedades();
  ofrecerAvisos();
  pintarMinicab();
  pintarTitulo();
  actualizarIndice();
}

// Título de la pestaña con el saldo y el precio («121,567 sats · $75,928»): útil en la computadora con otra pestaña a la vista.
// Con una pantalla compartida el saldo quedaría a la vista, así que se puede apagar en «Tu cuenta» (por dispositivo).
const CLAVE_TITULO = 'libro.titulo';
export const tituloConSaldo = () => { try { return localStorage.getItem(CLAVE_TITULO) !== '0'; } catch { return true; } };
export function fijarTituloConSaldo(si) {
  try { if (si) localStorage.removeItem(CLAVE_TITULO); else localStorage.setItem(CLAVE_TITULO, '0'); } catch { /* vale para esta visita */ }
  pintarTitulo();
}
export function pintarTitulo() {
  const hay = S.cargado && R.n && !(S.errorCarga && !R.n);
  document.title = tituloConSaldo() && hay ? `${entero(R.sats)} sats · ${S.precio ? usd0(S.precio) : 'Libro DCA'}` : 'Libro DCA';
}
/** El texto de la mini-cabecera: el saldo en la unidad que elegiste y el precio de BTC. */
export function pintarMinicab() {
  const u = unidadVista();
  const hay = S.cargado && R.n && !(S.errorCarga && !R.n);
  const saldo = hay ? `${fmtUnidad[u](valorSaldo(u))} ${ETIQUETA_UNIDAD[u]}` : '';
  const precio = S.precio ? usd0(S.precio) : '';
  $('minicab-saldo').textContent = saldo;
  $('minicab-precio').textContent = precio;
}

export function pintarPrecio() {
  const estado = S.precio ? (S.viejo || S.errorPrecio ? 'viejo' : 'vivo') : S.errorPrecio ? 'error' : 'cargando';
  $('cotizacion').dataset.estado = estado;
  $('precio').textContent = S.precio ? usd0(S.precio) : '—';
  $('precio-meta').textContent = {
    vivo: `${S.fuente} · ${haceCuanto(S.precioTs)}`,
    viejo: `sin actualizar desde las ${hora(S.precioTs)}`,
    error: 'no disponible',
    cargando: 'consultando…',
  }[estado];
  // Cuánto subió o bajó desde el cierre de ayer (con menos de 3 días de histórico, no se muestra).
  const v = S.precio && estado !== 'error' ? variacionAyer(S.historico, S.precio) : null;
  const el24 = $('precio-24');
  el24.hidden = !v;
  if (v) {
    const plano = Math.abs(v.pct) < 0.05; // casi igual: sin flecha ni color
    el24.innerHTML = `${plano ? '•' : ico(v.pct > 0 ? 'sube' : 'baja')} ${pct(v.pct)} vs ayer`;
    el24.dataset.tono = plano ? '' : v.pct > 0 ? 'sube' : 'baja';
  }
}

/**
 * Saldo grande: un odómetro (odometro.js) con cifras tabulares; nada se mide en JS. La cifra final reserva el ancho de cada
 * dígito en flujo normal, así que el saldo nunca queda invisible. Si la animación no puede correr (movimiento reducido,
 * pestaña oculta), se ve la cifra final directamente.
 */
function pintarCifraGrande(el, desde, hasta, ms = 1400, fmt = entero) {
  const final = fmt(hasta);
  // Caracteres en ancho de dígito tabular: dígito = 1, separador ≈ 0.31 (0.18 em / 0.575 em).
  el.style.setProperty('--n', (final.replace(/\D/g, '').length + final.replace(/\d/g, '').length * 0.31).toFixed(2));
  pintarOdometro(el, desde, hasta, fmt, { ms });
}

// El saldo se puede ver en sats, en BTC o en dólares (toque en la cifra, en ese orden); se recuerda por dispositivo.
// En dólares es lo que vale hoy y cambia con el precio en vivo; sin precio se queda en sats.
const CLAVE_UNIDAD = 'libro.unidad';
const UNIDADES = ['sats', 'btc', 'usd'];
const leerUnidad = () => { try { const u = localStorage.getItem(CLAVE_UNIDAD); return UNIDADES.includes(u) ? u : 'sats'; } catch { return 'sats'; } };
let unidad = leerUnidad();
/** La unidad que se ve de verdad: «usd» necesita precio. */
const unidadVista = () => (unidad === 'usd' && R.valor == null ? 'sats' : unidad);
const fmtUnidad = { sats: entero, btc, usd };
const valorSaldo = (u) => (u === 'usd' ? R.valor : R.sats);
const NOMBRE_SIGUIENTE = { sats: 'BTC', btc: 'dólares', usd: 'sats' };
const ETIQUETA_UNIDAD = { sats: 'sats', btc: 'BTC', usd: 'USD' };
let mostrado = null; // lo que muestra la cifra grande, en la unidad `unidadPintada`
let unidadPintada = null;
let valorMostrado = null; // el valor en dólares de la línea de abajo
function etiquetaUnidad() {
  const u = unidadVista();
  $('s-unidad').textContent = ETIQUETA_UNIDAD[u];
  $('s-unidad').dataset.vivo = u === 'usd' ? '1' : ''; // el punto «en vivo»: el valor sigue al precio
  $('s-saldo-ayuda').textContent = `Tu saldo${u === 'usd' ? ' en dólares, al precio en vivo' : ''}. Toca para verlo en ${NOMBRE_SIGUIENTE[u]}.`;
}
function alternarUnidad() {
  let sig = UNIDADES[(UNIDADES.indexOf(unidad) + 1) % UNIDADES.length];
  if (sig === 'usd' && R.valor == null) sig = 'sats'; // sin precio no hay dólares
  unidad = sig;
  try { localStorage.setItem(CLAVE_UNIDAD, unidad); } catch { /* sin almacenamiento: vale para esta visita */ }
  if (S.cargado && !(S.errorCarga && !R.n)) {
    const u = unidadVista();
    pintarCifraGrande($('s-sats'), null, valorSaldo(u), 0, fmtUnidad[u]);
    mostrado = valorSaldo(u);
    unidadPintada = u;
    pintarMinicab();
    pintarLinea();
  }
  etiquetaUnidad();
}
$('s-saldo-v').addEventListener('click', alternarUnidad);
$('s-saldo-v').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternarUnidad(); } });
function pintarSaldo(desde) {
  const el = $('s-sats');
  if (!S.cargado) return;
  if (S.errorCarga && !R.n) {
    el.textContent = '—';
    mostrado = null;
    unidadPintada = null;
    $('s-valor').textContent = 'No se pudieron cargar tus compras.';
    return;
  }
  const u = unidadVista();
  const valor = valorSaldo(u);
  if (mostrado !== valor || unidadPintada !== u) {
    if (mostrado === null) pintarCifraGrande(el, 0, valor, 2000, fmtUnidad[u]); // la primera vez, sube desde cero
    else if (unidadPintada !== u) pintarCifraGrande(el, null, valor, 0, fmtUnidad[u]); // cambió la unidad: sin conteo
    else pintarCifraGrande(el, (u === 'sats' ? desde : null) ?? mostrado, valor, u === 'usd' ? 900 : 1400, fmtUnidad[u]);
    mostrado = valor;
    unidadPintada = u;
  }
  etiquetaUnidad();
  pintarLinea();
  pintarProx();
}
/** La línea bajo el saldo: lo que valen tus sats (con su propio odómetro) y la ganancia, con formas cortas en pantallas muy pequeñas. */
export function pintarLinea() {
  const linea = $('s-valor');
  if (!R.n) { linea.textContent = 'Tu montaña te espera. Anota tu primera compra para empezar a subir.'; return; }
  if (R.valor == null) { linea.textContent = `${btc(R.sats)} BTC · invertiste ${usd(R.inv)}`; return; }
  const b = document.createElement('b');
  if (unidadVista() === 'usd') {
    b.textContent = `${entero(R.sats)} sats`; // el saldo grande ya dice cuánto vale: aquí, cuántos sats son
    linea.replaceChildren(b);
  } else {
    pintarOdometro(b, valorMostrado != null && valorMostrado !== R.valor ? valorMostrado : null, R.valor, usd, { ms: 900 });
    linea.replaceChildren('valen ', b);
  }
  valorMostrado = R.valor;
  const gan = document.createElement('span');
  gan.dataset.tono = R.gan >= 0 ? 'sube' : 'baja';
  dual(gan, usdSigno(R.gan), usdSignoCorto(R.gan));
  if (R.pct != null) gan.append(` (${pct(R.pct)})`);
  linea.append(' · ', gan);
  if (R.nVentas) {
    const real = document.createElement('span');
    real.dataset.tono = R.realizada >= 0 ? 'sube' : 'baja';
    dual(real, usdSigno(R.realizada), usdSignoCorto(R.realizada));
    linea.append(' · ya realizaste ', real);
  }
  // Mini línea del valor de tu saldo en los últimos 30 días (solo con histórico; en pantallas muy pequeñas se oculta).
  if (R.nCompras >= 3 && S.histEstado === 'ok' && S.precio) {
    const serie = serieValor(R.items, S.historico, S.precio, hoyISO()).slice(-30);
    const mini = miniLinea(serie.map((d) => d.valor), serie.length ? `Valor de tu saldo en los últimos ${serie.length} días: de ${usd0(serie[0].valor)} a ${usd0(serie.at(-1).valor)}` : '');
    if (mini) linea.append(mini);
  }
}

/** «Última compra: hace 3 días · próxima, en 8 días» (solo admin, con 3 compras o más; la próxima es el último día que mantiene tu racha). */
function pintarProx() {
  const el = $('prox');
  const toca = S.cargado && esAdmin() && R.nCompras >= 3 ? tocaComprar(R) : null;
  const ultima = toca ? R.items.filter((c) => c.tipo !== 'venta').at(-1) : null;
  if (!ultima) { el.textContent = ''; return; }
  const dias = Math.max(0, Math.round((aFecha(hoyISO()) - aFecha(ultima.fecha)) / 864e5));
  let txt = `Última compra: ${dias === 0 ? 'hoy' : dias === 1 ? 'ayer' : `hace ${dias} días`}`;
  if (toca.estado !== 'perdida') {
    const faltan = ((7 - aFecha(hoyISO()).getDay()) % 7) + 7 * R.venceSemanas; // hasta el domingo que mantiene la racha
    txt += faltan === 0 ? ' · próxima: hoy es el último día' : faltan === 1 ? ' · próxima: mañana es el último día' : ` · próxima, en ${faltan} días`;
  }
  el.textContent = txt;
}

let anchoMontana = 0, altoMontana = 0;
// Idea 32: desde 1 BTC el acento de la app es dorado (variables de color en el CSS, `html[data-acento="oro"]`). Con la celebración
// de 1 BTC en marcha se retiene el cambio hasta que acabe.
let acentoRetenido = false;
export function pintarAcento() {
  document.documentElement.dataset.acento = acentoDe(R.sats);
}
// Una etapa que sea potencia de 10 desde 1M (1M, 10M, 1 BTC…) es un hito grande.
export const esHito = (m) => m >= 1e6 && Math.abs(Math.log10(m) - Math.round(Math.log10(m))) < 1e-9;
export const MS_SUBIDA = 1400;

export function pintarMontana(animar, desde, festejo = null) {
  const host = $('montana');
  anchoMontana = host.clientWidth;
  altoMontana = host.clientHeight;
  const inicio = animar ? 0 : desde ?? R.sats;
  const techo = document.querySelector('.saldo').getBoundingClientRect().bottom - host.getBoundingClientRect().top;
  const fechas = Object.fromEntries(R.camino.map((h) => [h.m, h.fecha]));
  dibujarMontana(host, { sats: R.sats, meta: R.meta, etapa: R.etapa, inicio, techo, fechas, compras: R.nCompras, plantar: Boolean(festejo), tocable: true, aurora: hayAurora(R.racha) });
  let f = null;
  if (festejo && R.sats > festejo.antes) {
    const m = etapasCruzadas(festejo.antes, R.sats).at(-1);
    f = { delta: festejo.delta, etapa: m, nivel: cruzo1Btc(festejo.antes, R.sats) ? 'epico' : !m ? 'compra' : esHito(m) ? 'hito' : 'etapa' };
    // El acento dorado llega cuando acaba la celebración de 1 BTC, no antes.
    if (f.nivel === 'epico') { acentoRetenido = true; setTimeout(() => { acentoRetenido = false; pintarAcento(); }, reducido() ? 0 : MS_SUBIDA + 1800); }
  }
  if (inicio !== R.sats) subir(inicio, R.sats, animar ? 2400 : f ? MS_SUBIDA : 1600, f);
}
new ResizeObserver(() => {
  // Se redibuja si cambia el ancho **o el alto** (una barra del navegador que aparece, las herramientas de desarrollo, un cambio de
  // ventana): el SVG se dibuja a la medida de la caja y, si solo cambiara el alto, se vería cortado y con una franja de cielo.
  const m = $('montana');
  if (S.cargado && (m.clientWidth !== anchoMontana || Math.abs(m.clientHeight - altoMontana) > 2)) pintarMontana(false);
}).observe($('montana'));

/** Avance de 0 a 1 entre la etapa anterior y la siguiente. */
export const progresoEtapa = () => (R.sats - R.etapaPrev) / (R.etapa - R.etapaPrev);

function pintarTramo() {
  $('tramo').hidden = !S.cargado || (S.errorCarga && !R.n);
  const prog = progresoEtapa();
  $('t-meta').textContent = R.etapa >= 1e8 ? nombreHito(R.etapa) : `${nombreHito(R.etapa)} sats`;
  const falta = $('t-falta');
  falta.textContent = 'faltan ';
  dual(falta, entero(R.etapa - R.sats), numCorto(R.etapa - R.sats));
  const p = Math.max(0, Math.min(1, prog));
  requestAnimationFrame(() => pintarAnillo($('t-anillo-svg'), [{ clase: 'an-naranja', desde: 0, hasta: p }]));
  $('t-pct').textContent = `${p > 0 && p < 0.01 ? '<1' : Math.floor(p * 100)}%`;
  $('t-anillo').setAttribute('aria-label', `Vas en ${(p * 100).toFixed(1)}% del camino a ${nombreHito(R.etapa)}${R.etapa >= 1e8 ? '' : ' sats'}`);
  $('t-ritmo').textContent = R.proyeccion
    ? `Al ritmo de los últimos 6 meses${R.nExtra ? ', sin contar tus compras extra,' : ''} (${entero(R.satsMes)} sats al mes) llegas en ${plazo(R.proyeccion)}.`
    : R.n ? `Vas en ${(prog * 100).toFixed(1)}% de este tramo.` : 'El primer campamento está en 100k sats.';
}
export const plazo = (m) => (m < 1 ? 'menos de un mes' : `${Math.round(m)} ${Math.round(m) === 1 ? 'mes' : 'meses'}`);
