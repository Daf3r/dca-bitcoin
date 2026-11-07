import { btc, entero, etapasCruzadas, haceCuanto, hora, nombreHito, pct, resumen, usd, usd0, usdSigno } from './lib.js';
import { dibujarMontana, subir } from './montana.js';
import { ofrecerAvisos } from './cuenta.js';
import { $, R, S, fijarR, reducido } from './estado.js';
import { pintarLista } from './lista.js';
import { pintarMercado, pintarValor } from './mercado.js';
import { pintarNovedades } from './novedades.js';
import { pintarCaida, pintarComienzo, pintarEquilibrio, pintarReportes, pintarToca, pintarUbicacion } from './reportes.js';

// ---------------------------------------------------------------- pintar
export function pintar({ montana = false, animar = false, desde = null, festejo = null } = {}) {
  fijarR(resumen(S.compras, S.precio));
  pintarPrecio();
  pintarSaldo(desde);
  if (montana) pintarMontana(animar, desde, festejo);
  pintarToca();
  pintarCaida();
  pintarTramo();
  pintarMercado();
  pintarValor();
  pintarEquilibrio();
  pintarLista();
  pintarUbicacion();
  pintarReportes();
  pintarComienzo();
  pintarNovedades();
  ofrecerAvisos();
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
}

/**
 * Saldo grande: texto normal con cifras tabulares (nada se mide en JS). La cifra final va
 * invisible en la misma celda que la animada y reserva el ancho; si la animación no puede
 * correr (movimiento reducido, pestaña oculta, error), se ve la cifra final directamente.
 */
let contadorRaf = 0;
function pintarCifraGrande(el, desde, hasta, ms = 1400, fmt = entero) {
  const final = fmt(hasta);
  // Caracteres en ancho de dígito tabular: dígito = 1, separador ≈ 0.31 (0.18 em / 0.575 em).
  el.style.setProperty('--n', (final.replace(/\D/g, '').length + final.replace(/\d/g, '').length * 0.31).toFixed(2));
  if (!el.querySelector('.cg-vivo')) el.innerHTML = '<span class="sr"></span><span class="cg-reserva" aria-hidden="true"></span><span class="cg-vivo" aria-hidden="true"></span>';
  el.querySelector('.sr').textContent = final;
  el.querySelector('.cg-reserva').textContent = final;
  const vivo = el.querySelector('.cg-vivo');
  cancelAnimationFrame(contadorRaf);
  clearTimeout(pintarCifraGrande.seguro);
  if (reducido() || desde == null || desde === hasta) { vivo.textContent = final; return; }
  const t0 = performance.now();
  const paso = (t) => {
    try {
      const k = Math.min(1, (t - t0) / ms);
      vivo.textContent = k < 1 ? fmt(desde + (hasta - desde) * (1 - (1 - k) ** 4)) : final;
      if (k < 1) contadorRaf = requestAnimationFrame(paso);
    } catch {
      vivo.textContent = final;
    }
  };
  vivo.textContent = fmt(desde);
  contadorRaf = requestAnimationFrame(paso);
  // Si requestAnimationFrame no llega a correr (pestaña en segundo plano), se ve la cifra final.
  pintarCifraGrande.seguro = setTimeout(() => { cancelAnimationFrame(contadorRaf); vivo.textContent = final; }, ms + 400);
}

let satsMostrados = null;
// El saldo se puede ver en sats o en BTC (toque en la cifra); se recuerda por dispositivo.
const CLAVE_UNIDAD = 'libro.unidad';
const leerUnidad = () => { try { return localStorage.getItem(CLAVE_UNIDAD) === 'btc' ? 'btc' : 'sats'; } catch { return 'sats'; } };
let unidad = leerUnidad();
const fmtSaldo = () => (unidad === 'btc' ? btc : entero);
function etiquetaUnidad() {
  $('s-unidad').textContent = unidad === 'btc' ? 'BTC' : 'sats';
  $('s-saldo-ayuda').textContent = `Tu saldo. Toca para verlo en ${unidad === 'btc' ? 'sats' : 'BTC'}.`;
}
function alternarUnidad() {
  unidad = unidad === 'btc' ? 'sats' : 'btc';
  try { localStorage.setItem(CLAVE_UNIDAD, unidad); } catch { /* sin almacenamiento: vale para esta visita */ }
  if (S.cargado && !(S.errorCarga && !R.n)) pintarCifraGrande($('s-sats'), null, R.sats, 0, fmtSaldo());
  etiquetaUnidad();
}
$('s-saldo-v').addEventListener('click', alternarUnidad);
$('s-saldo-v').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); alternarUnidad(); } });
function pintarSaldo(desde) {
  const el = $('s-sats');
  const linea = $('s-valor');
  if (!S.cargado) return;
  if (S.errorCarga && !R.n) {
    el.textContent = '—';
    satsMostrados = null;
    linea.textContent = 'No se pudieron cargar tus compras.';
    return;
  }
  if (satsMostrados !== R.sats) {
    pintarCifraGrande(el, desde ?? (satsMostrados === null ? 0 : satsMostrados), R.sats, satsMostrados === null ? 2000 : 1400, fmtSaldo());
    satsMostrados = R.sats;
  }
  etiquetaUnidad();
  if (!R.n) linea.textContent = 'Tu montaña te espera. Anota tu primera compra para empezar a subir.';
  else if (R.valor == null) linea.textContent = `${btc(R.sats)} BTC · invertiste ${usd(R.inv)}`;
  else {
    linea.innerHTML = `valen <b>${usd(R.valor)}</b> · <span data-tono="${R.gan >= 0 ? 'sube' : 'baja'}">${usdSigno(R.gan)}${R.pct == null ? '' : ` (${pct(R.pct)})`}</span>` +
      (R.nVentas ? ` · ya realizaste <span data-tono="${R.realizada >= 0 ? 'sube' : 'baja'}">${usdSigno(R.realizada)}</span>` : '');
  }
}

let anchoMontana = 0;
// Una etapa que sea potencia de 10 desde 1M (1M, 10M, 1 BTC…) es un hito grande.
export const esHito = (m) => m >= 1e6 && Math.abs(Math.log10(m) - Math.round(Math.log10(m))) < 1e-9;
export const MS_SUBIDA = 1400;

export function pintarMontana(animar, desde, festejo = null) {
  const host = $('montana');
  anchoMontana = host.clientWidth;
  const inicio = animar ? 0 : desde ?? R.sats;
  const techo = document.querySelector('.saldo').getBoundingClientRect().bottom - host.getBoundingClientRect().top;
  dibujarMontana(host, { sats: R.sats, meta: R.meta, etapa: R.etapa, inicio, techo });
  let f = null;
  if (festejo && R.sats > festejo.antes) {
    const m = etapasCruzadas(festejo.antes, R.sats).at(-1);
    f = { delta: festejo.delta, etapa: m, nivel: !m ? 'compra' : esHito(m) ? 'hito' : 'etapa' };
  }
  if (inicio !== R.sats) subir(inicio, R.sats, animar ? 2400 : f ? MS_SUBIDA : 1600, f);
}
new ResizeObserver(() => {
  if (S.cargado && $('montana').clientWidth !== anchoMontana) pintarMontana(false);
}).observe($('montana'));

/** Avance de 0 a 1 entre la etapa anterior y la siguiente. */
export const progresoEtapa = () => (R.sats - R.etapaPrev) / (R.etapa - R.etapaPrev);

function pintarTramo() {
  $('tramo').hidden = !S.cargado || (S.errorCarga && !R.n);
  const prog = progresoEtapa();
  $('t-meta').textContent = R.etapa >= 1e8 ? nombreHito(R.etapa) : `${nombreHito(R.etapa)} sats`;
  $('t-falta').textContent = `faltan ${entero(R.etapa - R.sats)}`;
  requestAnimationFrame(() => { $('t-barra').style.transform = `scaleX(${Math.max(0, Math.min(1, prog))})`; });
  $('t-ritmo').textContent = R.proyeccion
    ? `Al ritmo de los últimos 6 meses${R.nExtra ? ', sin contar tus compras extra,' : ''} (${entero(R.satsMes)} sats al mes) llegas en ${plazo(R.proyeccion)}.`
    : R.n ? `Vas en ${(prog * 100).toFixed(1)}% de este tramo.` : 'El primer campamento está en 100k sats.';
}
export const plazo = (m) => (m < 1 ? 'menos de un mes' : `${Math.round(m)} ${Math.round(m) === 1 ? 'mes' : 'meses'}`);
