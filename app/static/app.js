import {
  usd, usd0, usdSigno, pct, entero, btc, hora, hoyISO, aFecha, fechaLarga, fechaCorta,
  resumen, nombreHito, etapasCruzadas, etapaSiguiente, etapaAnterior, metaSiguiente, novedades, avisosAlAnotar, serieGrafico, textoMeses, compacto, precioDelDia, estimarMonto, mempoolUrl, extraerTxid,
} from './lib.js';
import { dibujarMontana, subir } from './montana.js';
import { dibujarGrafico, instalarLectura } from './grafico.js';

const $ = (id) => document.getElementById(id);
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const S = {
  compras: [], cargado: false, errorCarga: false,
  precio: null, precioTs: 0, fuente: '', viejo: false, errorPrecio: false,
  historico: [], histEstado: 'cargando', histDesde: null, rango: null,
  verTodas: false,
  usuario: null, rol: null,
};
let R = resumen([], null);

// ------------------------------------------------------------------ API
/**
 * Único punto de salida hacia el servidor. Si algún día la app tiene login propio,
 * aquí se trata el 401 (redirigir o pedir la contraseña) para toda la app.
 */
async function api(ruta, { metodo = 'GET', cuerpo, tipo = 'application/json' } = {}) {
  // X-Libro obliga a un preflight CORS: otra web no puede escribir aquí aunque tengas sesión.
  const opt = { method: metodo, headers: { Accept: 'application/json', 'X-Libro': '1' }, cache: 'no-store' };
  if (cuerpo !== undefined) {
    opt.headers['Content-Type'] = tipo;
    opt.body = tipo === 'application/json' ? JSON.stringify(cuerpo) : cuerpo;
  }
  let r;
  try {
    r = await fetch(ruta, opt);
  } catch {
    // Con la sesión de Cloudflare Access vencida, fetch falla por la redirección al login.
    throw Object.assign(new Error('Sin conexión con el servidor. Si tu sesión venció, recarga la página.'), { status: 0 });
  }
  if (r.status === 204) return null;
  const j = await r.json().catch(() => null);
  if (r.status === 401) {
    location.assign('/login');
    throw Object.assign(new Error('Tu sesión venció.'), { status: 401 });
  }
  if (!r.ok) throw Object.assign(new Error(j?.error || `Error ${r.status}.`), { status: r.status, datos: j });
  return j;
}

// Hasta saber el rol, la interfaz se muestra como solo lectura.
const esAdmin = () => S.rol === 'admin';

const normalizar = (c) => ({ ...c, id: Number(c.id), sats: c.sats > 0 ? c.sats : Math.round((c.monto / c.precio) * 1e8) });

async function cargarCompras() {
  try {
    S.compras = (await api('/api/compras')).map(normalizar);
    S.errorCarga = false;
    avisar('');
  } catch (e) {
    S.errorCarga = true;
    avisar(`No se pudieron cargar tus compras. ${e.status === 0 ? e.message : ''}`.trim(), cargarCompras);
  }
  const primeraVez = !S.cargado;
  S.cargado = true;
  pintar({ montana: true, animar: primeraVez });
  if (primeraVez) cargarHistorico();
}

/** Desde la primera compra (o un año, si es más reciente), con el tope de 10 años del servidor. */
function desdeHistorico() {
  const hoy = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const anio = iso(new Date(hoy - 365 * 864e5));
  const tope = iso(new Date(hoy - 3650 * 864e5));
  const primera = R.items[0]?.fecha;
  return primera && primera < anio ? (primera < tope ? tope : primera) : anio;
}

async function cargarHistorico(intento = 0) {
  const desde = desdeHistorico();
  try {
    const j = await api(`/api/historico?desde=${desde}`);
    S.historico = j.precios;
    S.histDesde = desde;
    // El servidor rellena en segundo plano: se vuelve a preguntar mientras diga «cargando».
    if (j.cargando && intento < 10) setTimeout(() => cargarHistorico(intento + 1), 3000);
    S.histEstado = j.precios.length > 1 ? 'ok' : j.cargando && intento < 10 ? 'cargando' : 'error';
  } catch {
    S.histEstado = S.historico.length > 1 ? 'ok' : 'error';
  }
  pintarMercado();
}

async function consultarPrecio() {
  try {
    const j = await api('/api/precio');
    Object.assign(S, { precio: j.precio, precioTs: j.ts, fuente: j.fuente, viejo: j.viejo, errorPrecio: false });
  } catch {
    S.errorPrecio = true;
  }
  pintar();
}

// --------------------------------------------------------------- avisos
let avisoTimer = 0;
function avisar(texto, accion = null, temporal = false) {
  clearTimeout(avisoTimer);
  $('aviso-txt').textContent = texto;
  $('aviso').hidden = !texto;
  const b = $('aviso-btn');
  b.hidden = temporal || !texto;
  b.textContent = accion ? 'Reintentar' : 'Cerrar';
  b.onclick = accion ?? (() => avisar(''));
  if (temporal) avisoTimer = setTimeout(() => avisar(''), 3500);
}

// ---------------------------------------------------------------- pintar
function pintar({ montana = false, animar = false, desde = null, festejo = null } = {}) {
  R = resumen(S.compras, S.precio);
  pintarPrecio();
  pintarSaldo(desde);
  if (montana) pintarMontana(animar, desde, festejo);
  pintarTramo();
  pintarMercado();
  pintarLista();
  pintarReportes();
  pintarComienzo();
  pintarNovedades();
}

function pintarPrecio() {
  const estado = S.precio ? (S.viejo || S.errorPrecio ? 'viejo' : 'vivo') : S.errorPrecio ? 'error' : 'cargando';
  $('cotizacion').dataset.estado = estado;
  $('precio').textContent = S.precio ? usd0(S.precio) : '—';
  $('precio-meta').textContent = {
    vivo: `${S.fuente}, ${hora(S.precioTs)}`,
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
function pintarCifraGrande(el, desde, hasta, ms = 1400) {
  const final = entero(hasta);
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
      vivo.textContent = k < 1 ? entero(desde + (hasta - desde) * (1 - (1 - k) ** 4)) : final;
      if (k < 1) contadorRaf = requestAnimationFrame(paso);
    } catch {
      vivo.textContent = final;
    }
  };
  vivo.textContent = entero(desde);
  contadorRaf = requestAnimationFrame(paso);
  // Si requestAnimationFrame no llega a correr (pestaña en segundo plano), se ve la cifra final.
  pintarCifraGrande.seguro = setTimeout(() => { cancelAnimationFrame(contadorRaf); vivo.textContent = final; }, ms + 400);
}

let satsMostrados = null;
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
    pintarCifraGrande(el, desde ?? (satsMostrados === null ? 0 : satsMostrados), R.sats, satsMostrados === null ? 2000 : 1400);
    satsMostrados = R.sats;
  }
  if (!R.n) linea.textContent = 'Tu montaña te espera. Anota tu primera compra para empezar a subir.';
  else if (R.valor == null) linea.textContent = `${btc(R.sats)} BTC · invertiste ${usd(R.inv)}`;
  else {
    linea.innerHTML = `valen <b>${usd(R.valor)}</b> · <span data-tono="${R.gan >= 0 ? 'sube' : 'baja'}">${usdSigno(R.gan)}${R.pct == null ? '' : ` (${pct(R.pct)})`}</span>` +
      (R.nVentas ? ` · ya realizaste <span data-tono="${R.realizada >= 0 ? 'sube' : 'baja'}">${usdSigno(R.realizada)}</span>` : '');
  }
}

let anchoMontana = 0;
// Una etapa que sea potencia de 10 desde 1M (1M, 10M, 1 BTC…) es un hito grande.
const esHito = (m) => m >= 1e6 && Math.abs(Math.log10(m) - Math.round(Math.log10(m))) < 1e-9;
const MS_SUBIDA = 1400;

function pintarMontana(animar, desde, festejo = null) {
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
const progresoEtapa = () => (R.sats - R.etapaPrev) / (R.etapa - R.etapaPrev);

function pintarTramo() {
  $('tramo').hidden = !S.cargado || (S.errorCarga && !R.n);
  const prog = progresoEtapa();
  $('t-meta').textContent = R.etapa >= 1e8 ? nombreHito(R.etapa) : `${nombreHito(R.etapa)} sats`;
  $('t-falta').textContent = `faltan ${entero(R.etapa - R.sats)}`;
  requestAnimationFrame(() => { $('t-barra').style.transform = `scaleX(${Math.max(0, Math.min(1, prog))})`; });
  $('t-ritmo').textContent = R.proyeccion
    ? `Al ritmo de los últimos 6 meses (${entero(R.satsMes)} sats al mes) llegas en ${plazo(R.proyeccion)}.`
    : R.n ? `Vas en ${(prog * 100).toFixed(1)}% de este tramo.` : 'El primer campamento está en 100k sats.';
}
const plazo = (m) => (m < 1 ? 'menos de un mes' : `${Math.round(m)} ${Math.round(m) === 1 ? 'mes' : 'meses'}`);

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
function pintarMercado() {
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
  dibujarGrafico(host, $('g-lectura'), { serie: serieGrafico(S.historico, S.precio, hoyISO()), compras: R.items.filter((c) => c.tipo !== 'venta'), ventas: R.items.filter((c) => c.tipo === 'venta'), promedio: R.promedio, rango: S.rango, hoy: hoyISO() });
}
instalarLectura($('lienzo'));
$('rangos').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) { S.rango = Number(b.dataset.r); pintarMercado(); }
});
new ResizeObserver(() => { if ($('lienzo').clientWidth !== anchoGrafico) pintarMercado(); }).observe($('lienzo'));

// ----------------------------------------------------------------- lista
const VISIBLES = 8;
function pintarLista() {
  const host = $('lista');
  $('csv-out').hidden = !R.n;
  if (!R.n) {
    host.innerHTML = `<li class="vacio">${!S.cargado ? 'Cargando compras…' : S.errorCarga ? 'No se pudieron cargar tus compras.' : 'Aún no hay compras. Anota la primera o importa un CSV.'}</li>`;
    $('ver-todas').hidden = true;
    return;
  }
  const enFoco = document.activeElement?.closest?.('#lista .fila')?.dataset.id;
  const recientes = [...R.items].reverse();
  const mostradas = S.verTodas ? recientes : recientes.slice(0, VISIBLES);
  host.innerHTML = mostradas.map((c) => {
    const venta = c.tipo === 'venta';
    // Compra: cómo va frente al precio de hoy. Venta: la ganancia que realizó.
    const v = venta ? c.realizada : S.precio ? (S.precio / c.precio - 1) * 100 : null;
    const textoV = v == null ? '' : venta ? usdSigno(v) : pct(v);
    const etiqueta = esAdmin() ? 'button type="button"' : 'div';
    return `<li><${etiqueta} class="fila" data-id="${c.id}" data-tipo="${venta ? 'venta' : 'compra'}">` +
      (esAdmin() ? `<span class="sr">Editar la ${venta ? 'venta' : 'compra'} del </span>` : '') + `<span class="f-fecha">${fechaCorta(c.fecha)}</span>` +
      `<span class="f-sats">${venta ? '−' : '+'}${entero(c.sats)} <small>sats</small></span>` +
      `<span class="f-det">${venta ? 'Venta · ' : ''}${usd(c.monto)} a ${usd0(c.precio)}${c.nota ? ` · ${esc(c.nota)}` : ''}</span>` +
      `<span class="f-var"${v == null ? '' : ` data-tono="${v >= 0 ? 'sube' : 'baja'}"`}>${textoV}</span></${esAdmin() ? 'button' : 'div'}>` +
      (mempoolUrl(c.txid) ? `<div class="f-txw"><a class="f-tx" href="${mempoolUrl(c.txid)}" target="_blank" rel="noopener noreferrer">Ver en mempool.space <span aria-hidden="true">↗</span><span class="sr"> (se abre en otra pestaña)</span></a><span class="f-est" data-txid="${c.txid}"></span></div>` : '') + '</li>';
  }).join('');
  const vt = $('ver-todas');
  vt.hidden = mostradas.length >= R.n;
  vt.textContent = `Ver los ${R.n} movimientos`;
  if (enFoco) host.querySelector(`.fila[data-id="${enFoco}"]`)?.focus();
  pintarEstadoTx();
  verificarTx();
}

// Verificación de los TXID: el servidor consulta mempool.space (y lo guarda); aquí solo se pinta el estado.
const estadoTx = {}; // txid → respuesta del servidor, o 'error'; una vez por carga de la página
const enColaTx = new Set();
function textoEstadoTx(t) {
  if (t === 'error') return { txt: 'No se pudo verificar ahora', estado: 'error' };
  const fee = t.comision != null ? ` · comisión ${entero(t.comision)} sats` : '';
  const viejo = t.desactualizado ? ' (dato guardado)' : '';
  if (t.estado === 'confirmada') return { txt: `Confirmada${t.confirmaciones ? ` · ${entero(t.confirmaciones)} ${t.confirmaciones === 1 ? 'confirmación' : 'confirmaciones'}` : ''}${fee}${viejo}`, estado: 'confirmada' };
  if (t.estado === 'pendiente') return { txt: `Pendiente de confirmar${fee}${viejo}`, estado: 'pendiente' };
  return { txt: `No encontrada en mempool.space${viejo}`, estado: 'no_encontrada' };
}
function pintarEstadoTx() {
  document.querySelectorAll('.f-est[data-txid]').forEach((el) => {
    const t = estadoTx[el.dataset.txid];
    if (!t) return;
    const { txt, estado } = textoEstadoTx(t);
    el.textContent = txt;
    el.dataset.estado = estado;
  });
}
async function verificarTx() {
  const faltan = [...new Set([...document.querySelectorAll('.f-est[data-txid]')].map((e) => e.dataset.txid))]
    .filter((t) => !(t in estadoTx) && !enColaTx.has(t)).slice(0, 12);
  faltan.forEach((t) => enColaTx.add(t));
  let i = 0;
  const trabajador = async () => {
    while (i < faltan.length) {
      const t = faltan[i++];
      try { estadoTx[t] = await api(`/api/tx/${t}`); } catch { estadoTx[t] = 'error'; }
      enColaTx.delete(t);
      pintarEstadoTx();
    }
  };
  await Promise.all([trabajador(), trabajador()]); // de dos en dos, para ser amable con mempool.space
}
$('lista').addEventListener('click', (e) => {
  const b = e.target.closest('.fila');
  if (b && esAdmin()) abrirHoja(Number(b.dataset.id));
});
$('ver-todas').addEventListener('click', () => {
  S.verTodas = true;
  pintarLista();
  $('lista').querySelectorAll('.fila')[VISIBLES]?.focus();
});

// ------------------------------------------------------------- hoja de anotar
const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const H = { tipo: 'compra', nota: '', sats: '', usd: '', txid: '', usdTocado: false, editando: null, guardando: false, origen: null, confirmadoPara: '' };
const hoja = $('hoja');

function abrirHoja(id = null, tipoInicial = 'compra') {
  const c = id ? S.compras.find((x) => x.id === id) : null;
  Object.assign(H, { editando: c?.id ?? null, usdTocado: false, guardando: false, origen: document.activeElement, confirmadoPara: '' });
  H.sats = c ? String(c.sats) : '';
  H.usd = c ? String(c.monto) : '';
  H.txid = c?.txid ?? '';
  H.tipo = c?.tipo ?? (tipoInicial === 'venta' ? 'venta' : 'compra');
  H.nota = c?.nota ?? '';
  $('h-nota').value = H.nota;
  $('h-tipo').hidden = !!c;
  $('h-txid').value = H.txid;
  $('h-sats').value = H.sats ? entero(Number(H.sats)) : '';
  $('h-usd').value = H.usd;
  $('h-avanzado').open = !!c;
  $('h-fecha').value = c?.fecha ?? hoyISO();
  $('h-fecha').max = hoyISO();
  $('hoja-t').textContent = c ? 'Editar compra' : 'Anotar compra';
  $('h-borrar').hidden = !c;
  limpiarError();
  pintarHoja();
  hoja.hidden = false;
  requestAnimationFrame(() => hoja.classList.add('abierta'));
  // Dentro del toque que abre la hoja, para que el iPhone muestre su teclado numérico.
  $('h-sats').focus({ preventScroll: true });
  ajustarTeclado();
}
function cerrarHoja() {
  hoja.classList.remove('abierta');
  document.activeElement?.blur?.();
  setTimeout(() => { hoja.hidden = true; hoja.style.removeProperty('--kb'); H.origen?.focus?.({ preventScroll: true }); }, reducido() ? 0 : 260);
}
// En iPhone el teclado tapa lo de abajo sin cambiar el viewport de maquetación: se sube la hoja la altura del teclado.
function ajustarTeclado() {
  const vv = window.visualViewport;
  if (!vv || hoja.hidden) return;
  hoja.style.setProperty('--kb', `${Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))}px`);
}
window.visualViewport?.addEventListener('resize', ajustarTeclado);
window.visualViewport?.addEventListener('scroll', ajustarTeclado);

function datosHoja() {
  const sats = Math.round(Number(H.sats)) || 0;
  if (!sats) return null;
  const u = Number(H.usd) || 0;
  if (u > 0) return { sats, monto: u, precio: (u * 1e8) / sats, exacto: true };
  const p = precioDelDia($('h-fecha').value, S.historico, S.precio);
  if (!p) return { sats, sinPrecio: true };
  return { sats, monto: estimarMonto(sats, p.precio), precio: p.precio, fuente: p.fuente, dia: p.dia };
}
/** Lo que se va a guardar, para saber si el aviso ya confirmado sigue valiendo (si cambias algo, vuelve a avisar). */
const claveHoja = () => `${H.tipo}|${H.sats}|${$('h-fecha').value}`;
const confirmando = () => H.confirmadoPara !== '' && H.confirmadoPara === claveHoja();
function limpiarError() {
  const e = $('hoja-error');
  e.textContent = '';
  e.classList.remove('hoja-aviso');
  H.confirmadoPara = '';
}
function textoAvisos(avisos) {
  const partes = avisos.map((a) => a.tipo === 'duplicado'
    ? `ya anotaste ${a.n === 1 ? 'otra compra' : `${a.n} compras`} ese día (${entero(a.sats)} sats).`
    : `esto es ${a.veces} veces ${a.sentido === 'mas' ? 'más' : 'menos'} que tu compra habitual (unos ${entero(a.mediana)} sats). ¿Faltó o sobró un cero?`);
  return `Ojo: ${partes.join(' Además, ')} Si está bien, toca «Sí, guardar así».`;
}
function pintarHoja() {
  const d = datosHoja();
  const venta = H.tipo === 'venta';
  const previa = H.editando ? S.compras.find((x) => x.id === H.editando) : null;
  // Saldo sin el movimiento que se edita (una venta editada devuelve sus sats, una compra editada los quita).
  const saldo = R.sats - (previa ? (previa.tipo === 'venta' ? -previa.sats : previa.sats) : 0);
  const sinSaldo = venta && d && d.sats > saldo;
  $('hoja-t').textContent = venta ? (H.editando ? 'Editar venta' : 'Registrar venta o gasto') : H.editando ? 'Editar compra' : 'Anotar compra';
  $('h-sats-l').textContent = venta ? 'Sats que salieron' : 'Sats que recibiste';
  $('h-nota-l').hidden = !venta;
  document.querySelectorAll('#h-tipo button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tipo === H.tipo)));
  const resto = d && !d.sinPrecio ? saldo + (venta ? -d.sats : d.sats) : 0;
  $('hoja-calc').textContent = !d ? (venta ? 'Escribe los sats que salieron; los dólares se calculan solos con el precio del día.' : 'Escribe los sats que recibiste; los dólares se calculan solos con el precio del día.')
    : d.sinPrecio ? 'Sin precio disponible ahora: abre «Más detalles» y escribe los dólares.'
      : sinSaldo ? `No tienes tantos sats: tu saldo es ${entero(saldo)}.`
        : `${d.exacto ? '' : '≈ '}${usd(d.monto)}${venta ? ' por la venta' : ''} · 1 BTC a ${usd0(d.precio)}${d.fuente === 'cierre' ? ` (cierre del ${fechaCorta(d.dia)})` : d.fuente === 'hoy' ? ' (sin precio de ese día: uso el de hoy)' : ''} · saldo ${entero(resto)} sats`;
  $('guardar').disabled = !d || d.sinPrecio || sinSaldo || H.guardando;
  $('guardar').textContent = H.guardando ? 'Guardando…' : confirmando() ? 'Sí, guardar así' : H.editando ? 'Guardar cambios' : venta ? 'Guardar venta' : 'Guardar';
}
$('h-tipo').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) { H.tipo = b.dataset.tipo; limpiarError(); pintarHoja(); }
});
$('h-nota').addEventListener('input', (e) => { H.nota = e.target.value; });
/** Pone separadores de miles al escribir sin mover el cursor de su sitio. */
function formatearSats(inp) {
  const antes = inp.value.slice(0, inp.selectionStart ?? inp.value.length).replace(/\D/g, '').length;
  const d = inp.value.replace(/\D/g, '').slice(0, 15);
  H.sats = d ? String(Number(d)) : '';
  inp.value = H.sats ? entero(Number(H.sats)) : '';
  let i = 0;
  for (let c = 0; i < inp.value.length && c < antes; i++) if (/\d/.test(inp.value[i])) c++;
  inp.setSelectionRange(i, i);
}
$('h-sats').addEventListener('input', (e) => {
  formatearSats(e.target);
  // Si corriges los sats de una compra y no tocaste los dólares, se recalculan con el precio del día.
  if (H.editando && !H.usdTocado && H.usd) { H.usd = ''; $('h-usd').value = ''; }
  limpiarError();
  pintarHoja();
});
$('h-usd').addEventListener('input', (e) => {
  const v = e.target.value.replace(',', '.');
  if (/^\d{0,10}(\.\d{0,2})?$/.test(v)) { H.usd = v; e.target.value = v; } else e.target.value = H.usd;
  H.usdTocado = true;
  pintarHoja();
});
$('h-txid').addEventListener('input', (e) => { H.txid = e.target.value.trim(); $('hoja-error').textContent = ''; });
// Al salir del campo, si pegaron un enlace de un explorador se deja solo el TXID.
$('h-txid').addEventListener('change', (e) => { e.target.value = H.txid = extraerTxid(e.target.value); });
$('h-fecha').addEventListener('input', () => { limpiarError(); pintarHoja(); });
hoja.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') return cerrarHoja();
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'date') { e.preventDefault(); $('guardar').click(); }
});
$('anotar').addEventListener('click', () => abrirHoja());
document.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrarHoja));

$('guardar').addEventListener('click', async () => {
  const d = datosHoja();
  const fecha = $('h-fecha').value;
  if (!d || H.guardando) return;
  if (!fecha || fecha > hoyISO()) { $('hoja-error').textContent = 'Elige una fecha de hoy o anterior.'; return; }
  // Antes de guardar: si algo se ve raro (cifra 10 veces fuera de lo normal, compra repetida ese día), se avisa
  // una vez y se pide confirmar con un segundo toque. No bloquea: tú decides.
  if (!confirmando()) {
    const avisos = avisosAlAnotar(S.compras, { tipo: H.tipo, sats: d.sats, fecha, editando: H.editando });
    if (avisos.length) {
      const e = $('hoja-error');
      e.textContent = textoAvisos(avisos);
      e.classList.add('hoja-aviso');
      H.confirmadoPara = claveHoja();
      pintarHoja();
      return;
    }
  }
  H.guardando = true; pintarHoja();
  const antes = R;
  try {
    const cuerpo = { fecha, monto: d.monto, sats: d.sats, txid: extraerTxid(H.txid), tipo: H.tipo, nota: H.tipo === 'venta' ? H.nota.trim() : '' };
    const g = normalizar(H.editando ? await api(`/api/compras/${H.editando}`, { metodo: 'PUT', cuerpo }) : await api('/api/compras', { metodo: 'POST', cuerpo }));
    S.compras = H.editando ? S.compras.map((x) => (x.id === g.id ? g : x)) : [...S.compras, g];
    const editando = H.editando;
    H.guardando = false;
    cerrarHoja();
    // Una compra nueva se celebra en la montaña: si estás más abajo, se sube con suavidad a verla.
    const festejo = !editando && g.tipo === 'compra' ? { antes: antes.sats, delta: g.sats } : null;
    if (festejo && !reducido() && window.scrollY > 40) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await new Promise((ok) => setTimeout(ok, 480));
    }
    pintar({ montana: true, desde: antes.sats, festejo });
    if (festejo && !reducido()) setTimeout(() => destello(), MS_SUBIDA);
    if (S.histDesde && desdeHistorico() < S.histDesde) cargarHistorico();
    const texto = (editando ? 'Movimiento corregido.' : g.tipo === 'venta' ? `Venta registrada: −${entero(g.sats)} sats` : `Anotado: +${entero(g.sats)} sats · ${Math.floor(Math.max(0, Math.min(1, progresoEtapa())) * 100)}% del camino a ${nombreMeta(R.etapa)}`) + (g.txid_repetido?.length ? ' Ojo: ese TXID ya está en otra compra.' : '');
    // Con celebración, el aviso de abajo espera a que acabe para no tapar el sendero.
    if (festejo && !reducido()) setTimeout(() => avisar(texto, null, true), MS_SUBIDA + 1300);
    else avisar(texto, null, true);
    celebrar(antes);
  } catch (err) {
    H.guardando = false;
    $('hoja-error').classList.remove('hoja-aviso');
    $('hoja-error').textContent = err.message;
    pintarHoja();
  }
});

// ----------------------------------------------------------------- borrar
const dialogo = $('d-borrar');
$('h-borrar').addEventListener('click', () => {
  const c = S.compras.find((x) => x.id === H.editando);
  if (!c) return;
  $('d-texto').textContent = `${fechaLarga(c.fecha)} · ${usd(c.monto)} · ${entero(c.sats)} sats`;
  dialogo.returnValue = '';
  dialogo.showModal();
});
dialogo.addEventListener('close', async () => {
  const id = H.editando;
  if (dialogo.returnValue !== 'si' || !id) return;
  const antes = R;
  try {
    await api(`/api/compras/${id}`, { metodo: 'DELETE' });
  } catch (err) {
    if (err.status !== 404) { $('hoja-error').textContent = err.message; return; }
  }
  S.compras = S.compras.filter((x) => x.id !== id);
  H.origen = $('t-compras');
  cerrarHoja();
  pintar({ montana: true, desde: antes.sats });
  avisar('Compra anulada. Queda en el historial.', null, true);
});

// --------------------------------------------------------------- reportes
const MESES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const nombreMeta = (m) => (m >= 1e8 ? nombreHito(m) : `${nombreHito(m)} sats`);
const semanas = (n) => `${n} ${n === 1 ? 'semana' : 'semanas'}`;
// La racha cuenta semanas o quincenas según tu ritmo (`R.paso`).
const rachaTxt = (n) => (R.paso === 2 ? `${n} ${n === 1 ? 'quincena' : 'quincenas'}` : semanas(n));
// Por encima de 1 BTC se habla en BTC: «4.8B sats» es ambiguo en español.
const satsCorto = (s) => (s >= 1e8 ? `${(s / 1e8).toFixed(s >= 1e10 ? 0 : 1)} BTC` : `${compacto(s)} sats`);

function pintarGanancia() {
  const ver = R.nVentas > 0;
  $('rep-ganancia').hidden = !ver;
  if (!ver) return;
  const fila = (id, n) => { const el = $(id); el.textContent = n == null ? '—' : usdSigno(n); el.dataset.tono = n == null ? '' : n >= 0 ? 'sube' : 'baja'; };
  fila('gan-real', R.realizada); fila('gan-noreal', R.gan); fila('gan-total', R.total);
  $('gan-inv').textContent = usd(R.inv);
}

function pintarReportes() {
  // Con menos de tres compras los reportes serían casi vacíos: su lugar lo ocupa «Siguiente paso».
  $('reportes').hidden = R.nCompras < 3;
  if (R.nCompras < 3) { $('rep-anios').hidden = true; $('rep-ganancia').hidden = true; return; }
  pintarGanancia();
  $('hitos').innerHTML = R.camino.map((h) => {
    const estado = h.fecha ? 'hecho' : h.m === R.etapa ? 'siguiente' : 'lejos';
    const detalle = h.fecha ? `${fechaLarga(h.fecha)} · ${textoMeses(h.meses)}`
      : estado === 'siguiente' ? (R.proyeccion ? `faltan ${entero(h.m - R.sats)} sats · a tu ritmo, en ${plazo(R.proyeccion)}` : `faltan ${entero(h.m - R.sats)} sats`)
        : 'más arriba';
    return `<li data-estado="${estado}"><b>${nombreMeta(h.m)}</b><span>${detalle}</span></li>`;
  }).join('');

  // Con un solo mes de compras no hay nada que comparar todavía.
  const mesesConCompra = R.anios.reduce((t, a) => t + a.meses.filter(Boolean).length, 0);
  $('rep-anios').hidden = mesesConCompra < 2;
  const maxMes = Math.max(...R.anios.flatMap((a) => a.meses));
  $('anios').innerHTML = [...R.anios].reverse().map((a) =>
    `<div class="anio"><b class="an-y">${a.anio}</b><div class="an-barras" aria-hidden="true">` +
    a.meses.map((v, i) => `<i class="${v ? '' : 'vacio'}" data-h="${v / maxMes}" title="${MESES[i]}: ${usd(v)}"></i>`).join('') +
    `</div><p class="an-tot"><span><b>+${satsCorto(a.sats)}</b></span><span>${usd0(a.usd)} · ${a.n} ${a.n === 1 ? 'compra' : 'compras'}</span></p></div>`).join('');
  $('anios').querySelectorAll('[data-h]').forEach((i) => { i.style.height = `${Math.max(Number(i.dataset.h) * 100, 6)}%`; });

  // Ventana de 52 semanas desde la primera compra si es más reciente: sin huellas vacías antes de empezar.
  const ventana = R.ultimas52.slice(-Math.min(52, Math.max(R.semanasDesdePrimera - (R.semanaEnCurso ? 0 : 1), 1)));
  $('semanas').innerHTML = ventana.map((v) => `<i${v ? ' class="con"' : ''}></i>`).join('');
  $('semanas').style.setProperty('--n', String(Math.max(ventana.length, 13)));
  const con = ventana.filter(Boolean).length;
  $('const-racha').textContent = R.racha;
  $('const-unidad').textContent = R.paso === 2 ? (R.racha === 1 ? 'quincena seguida' : 'quincenas seguidas') : R.racha === 1 ? 'semana seguida' : 'semanas seguidas';
  const resumenSemanas = con === ventana.length && ventana.length < 52
    ? `Has comprado todas las semanas desde que empezaste (${ventana.length}). `
    : `Compraste en <b>${con}</b> de ${ventana.length === 52 ? 'las últimas 52 semanas' : `tus ${ventana.length} semanas`}. `;
  $('const-txt').innerHTML = resumenSemanas +
    (R.mejorRacha > R.racha ? `Tu mejor racha: <b>${rachaTxt(R.mejorRacha)}</b>.` : '') + (R.semanaEnCurso || !R.racha ? '' : ` Tu próxima compra, antes del ${domingo(R.venceSemanas)}, mantiene la racha.`);

  const ext = $('extremos');
  const tarjeta = (c, titulo) => {
    const v = S.precio ? (S.precio / c.precio - 1) * 100 : null;
    return `<div class="ext"><small>${titulo}</small><b>${usd0(c.precio)}</b><span>${fechaLarga(c.fecha)} · ${entero(c.sats)} sats</span>` +
      (v == null ? '' : `<span data-tono="${v >= 0 ? 'sube' : 'baja'}">${pct(v)} desde entonces</span>`) + '</div>';
  };
  ext.innerHTML = tarjeta(R.mejor, 'Mejor precio') + tarjeta(R.peor, 'Precio más alto');
}

// ------------------------------------------------------------ siguiente paso
const dfDomingo = new Intl.DateTimeFormat('es-SV', { weekday: 'long', day: 'numeric', month: 'short' });
/** Domingo que cierra la semana en curso (+7 días por cada semana más). */
function domingo(semanasMas = 0) {
  const d = aFecha(hoyISO());
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7) + 7 * semanasMas);
  return dfDomingo.format(d).replace('.', '');
}

function pintarComienzo() {
  const ver = R.nCompras > 0 && R.nCompras < 3;
  $('comienzo').hidden = !ver;
  if (!ver) return;
  const falta = R.etapa - R.sats;
  const porCompra = R.satsComprados / R.nCompras;
  const compras = Math.max(1, Math.ceil(falta / porCompra));
  $('t-comienzo').textContent = `${compras === 1 ? 'Una compra más' : `${compras} compras más`} para ${R.etapa === 1e5 ? 'tu primer campamento' : `los ${nombreMeta(R.etapa)}`}`;
  $('com-txt').textContent = `Te faltan ${entero(falta)} sats para ${nombreMeta(R.etapa)}. Tus compras rondan ${entero(porCompra)} sats cada una.`;
  $('com-racha').textContent = rachaTxt(R.racha);
  $('com-racha-sub').textContent = R.racha
    ? `sigue si vuelves a comprar antes del ${domingo(R.venceSemanas)}`
    : `empieza de nuevo con tu próxima compra`;
  const despues = R.hitos.filter((h) => !h.fecha && h.m > R.meta && h.m <= 1e8).map((h) => nombreHito(h.m));
  const lista = despues.length > 1 ? `${despues.slice(0, -1).join(', ')} y ${despues.at(-1)}` : despues[0] ?? nombreHito(1e8);
  $('com-despues').textContent = lista.replace(/ BTC/g, '\u00a0BTC');
}
$('com-anotar').addEventListener('click', () => abrirHoja());

// -------------------------------------------------------------- celebración
/** Solo cuando la acción de esta sesión cruza un hito; breve y sin bloquear nada. */
function celebrar(antes) {
  // Cualquier etapa (100k, 250k, 500k, 1M…) que se cruce hacia arriba; si son varias, la más alta.
  const m = etapasCruzadas(antes.sats, R.sats).at(-1);
  if (!m) return;
  const el = $('hito-cel');
  const hito = esHito(m);
  $('hc-k').textContent = hito ? 'Nuevo hito' : 'Nueva etapa';
  $('hc-txt').textContent = m >= 1e8 ? nombreHito(m) : `${nombreHito(m)} sats`;
  el.classList.toggle('grande', hito);
  // Aparece cuando tu punto llega a la bandera, no antes.
  clearTimeout(celebrar.t);
  celebrar.t = setTimeout(() => {
    // Siempre bajo el saldo, sin tapar la cabecera, la cifra ni la etiqueta de la cumbre. En móvil y tablet va
    // centrada; en escritorio, alineada a la izquierda con el saldo.
    const saldo = document.querySelector('.saldo-d')?.getBoundingClientRect();
    if (saldo) el.style.top = `${Math.round(Math.max(saldo.bottom, 0) + 12)}px`;
    else el.style.removeProperty('top');
    if (saldo && innerWidth >= 1100) { el.style.justifyItems = 'start'; el.style.paddingLeft = `${Math.round(saldo.left)}px`; }
    else { el.style.removeProperty('justify-items'); el.style.removeProperty('padding-left'); }
    el.hidden = false;
    el.classList.remove('va'); void el.offsetWidth; el.classList.add('va');
    celebrar.t = setTimeout(() => { el.hidden = true; }, hito ? 2600 : 2000);
  }, reducido() ? 0 : MS_SUBIDA);
}

/** La barra del tramo se llena con un destello cuando tu punto llega. */
function destello() {
  const b = document.querySelector('.tr-barra');
  if (!b) return;
  b.classList.remove('destello'); void b.offsetWidth; b.classList.add('destello');
  setTimeout(() => b.classList.remove('destello'), 1000);
}

// ---------------------------------------------------- vista previa temporal
// Reproduce la celebración con datos inventados y luego vuelve al estado real. No guarda nada ni toca la
// auditoría. Es temporal: para quitarla, borra este bloque, el `#dc-previa` de index.html, su regla
// `.dc-previa` en styles.css y la línea de `dc-previa` en cargarYo.
let previaActiva = false;
const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function vistaPrevia(nivel) {
  if (previaActiva) return;
  previaActiva = true;
  const base = Math.max(0, R.sats);
  let antes, despues;
  if (nivel === 'etapa') { const m = etapaSiguiente(base); antes = Math.max(0, m - 20_000); despues = m + 10_000; }
  else if (nivel === 'hito') { let m = 1e6; while (m <= base) m *= 10; antes = m - 30_000; despues = m + 5_000; }
  else { antes = base; despues = base + Math.max(1000, Math.min(30_000, Math.floor((etapaSiguiente(base) - base) / 2))); }
  R = { ...R, sats: despues, meta: metaSiguiente(despues), etapa: etapaSiguiente(despues), etapaPrev: etapaAnterior(despues) };
  if (window.scrollY > 40) { window.scrollTo({ top: 0, behavior: reducido() ? 'auto' : 'smooth' }); await pausa(480); }
  avisar('Vista previa de la celebración: no se guarda nada.', null, true);
  pintarMontana(false, antes, { antes, delta: despues - antes });
  if (!reducido()) setTimeout(() => destello(), MS_SUBIDA);
  celebrar({ sats: antes });
  await pausa(nivel === 'hito' ? 6500 : 5200);
  pintar({ montana: true }); // vuelve al estado real
  previaActiva = false;
}
$('dc-previa').addEventListener('click', (e) => {
  const b = e.target.closest('[data-previa]');
  if (!b) return;
  dCuenta.close();
  setTimeout(() => vistaPrevia(b.dataset.previa), 350);
});

// ------------------------------------------------------------- novedades
// Para los lectores: al abrir la web, un resumen de lo que pasó desde su última visita (si pasó algo).
// «Entendido» (o cerrar) lo marca como visto en el servidor, así que sale igual desde el móvil y el PC.
const dNov = $('d-novedades');
let novedadesMostradas = false;
function pintarNovedades() {
  // Espera al precio (o a su error) para poder decir cuánto vale; pintar() vuelve a llamar cuando llega.
  if (novedadesMostradas || S.rol !== 'lector' || !S.cargado || S.visto === undefined || !(S.precio || S.errorPrecio) || dNov.open) return;
  novedadesMostradas = true;
  const n = novedades(R.items, S.visto);
  if (!n) return;
  $('nov-titulo').textContent = n.primera ? 'Así va el libro' : `Desde tu última visita${n.dias > 0 ? ` (hace ${n.dias} ${n.dias === 1 ? 'día' : 'días'})` : ''}`;
  const partes = [n.compras && `${n.compras} ${n.compras === 1 ? 'compra' : 'compras'}`, n.ventas && `${n.ventas} ${n.ventas === 1 ? 'venta' : 'ventas'}`].filter(Boolean);
  $('nov-sub').textContent = n.primera ? 'Los últimos movimientos:' : `${partes.join(' y ')} ${n.compras + n.ventas === 1 ? 'nueva' : 'nuevas'}:`;
  const lista = $('nov-lista');
  lista.textContent = '';
  for (const c of n.nuevos) {
    const li = document.createElement('li');
    li.textContent = `${fechaCorta(c.fecha)} · ${c.tipo === 'venta' ? '−' : '+'}${entero(c.sats)} sats (${usd(c.monto)})${c.nota ? ` · ${c.nota}` : ''}${c.tipo === 'venta' ? ' · venta' : ''}`;
    lista.append(li);
  }
  if (n.masNuevos) { const li = document.createElement('li'); li.textContent = `y ${n.masNuevos} más`; lista.append(li); }
  const filas = [['Saldo', `${entero(R.sats)} sats`], ['En BTC', `${btc(R.sats)} BTC`]];
  if (R.valor != null) {
    filas.push(['Vale hoy', usd(R.valor)]);
    filas.push(['Ganancia', `${usdSigno(R.gan)}${R.pct == null ? '' : ` (${pct(R.pct)})`}`]);
    if (R.nVentas) filas.push(['Ya realizada', usdSigno(R.realizada)]);
  }
  filas.push(['Avance', `${Math.floor(Math.max(0, Math.min(1, progresoEtapa())) * 100)}% del camino a ${nombreMeta(R.etapa)}`]);
  if (R.racha) filas.push(['Racha', `${rachaTxt(R.racha)} ${R.racha === 1 ? 'seguida' : 'seguidas'}`]);
  const dl = $('nov-resumen');
  dl.textContent = '';
  for (const [k, v] of filas) {
    const dt = document.createElement('dt'), dd = document.createElement('dd');
    dt.textContent = k; dd.textContent = v;
    dl.append(dt, dd);
  }
  dNov.showModal();
}
$('nov-ok').addEventListener('click', () => dNov.close());
dNov.addEventListener('close', async () => {
  try { S.visto = (await api('/api/visto', { metodo: 'POST', cuerpo: {} })).visto; } catch { /* sin red: saldrá otra vez */ }
});

// -------------------------------------------------------------------- CSV
$('csv-in').addEventListener('change', async (e) => {
  const archivo = e.target.files[0];
  e.target.value = '';
  if (!archivo) return;
  try {
    const r = await api('/api/import', { metodo: 'POST', cuerpo: await archivo.text(), tipo: 'text/csv' });
    const antes = R.sats;
    S.compras = (await api('/api/compras')).map(normalizar);
    pintar({ montana: true, desde: antes });
    const omit = r.omitidas.length;
    avisar(`Importadas: ${r.nuevas} · repetidas: ${r.repetidas} · omitidas: ${omit}` + (omit ? `. ${r.omitidas.slice(0, 3).join('. ')}${omit > 3 ? '…' : ''}` : '.'));
  } catch (err) {
    avisar(`No se pudo importar. ${err.message}`);
  }
});

// ---------------------------------------------------------------- arranque
// ------------------------------------------------------------------ cuenta
const dfAudit = new Intl.DateTimeFormat('es-SV', { timeZone: 'America/El_Salvador', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const dCuenta = $('d-cuenta');
function vistaCuenta(cual) {
  $('dc-menu').hidden = cual !== 'menu';
  $('f-clave').hidden = cual !== 'clave';
  $('dc-hist').hidden = cual !== 'historial';
}
async function cargarYo() {
  try {
    const yo = await api('/api/yo');
    Object.assign(S, { usuario: yo.usuario, rol: yo.rol, visto: yo.visto ?? null });
    document.body.dataset.rol = yo.rol;
    $('cuenta-btn').textContent = yo.usuario;
    $('cuenta-btn').setAttribute('aria-label', `Tu cuenta: ${yo.usuario}`);
    $('cuenta-btn').hidden = false;
    $('dc-quien').textContent = `${yo.usuario} · ${yo.rol === 'admin' ? 'administrador' : 'solo lectura'}`;
    $('dc-historial').hidden = yo.rol !== 'admin';
    $('dc-previa').hidden = yo.rol !== 'admin'; // vista previa temporal
    $('fc-usuario').value = yo.usuario;
    pintar();
  } catch { /* el 401 ya redirige; si falla la red, la app sigue en solo lectura */ }
}
$('cuenta-btn').addEventListener('click', () => { vistaCuenta('menu'); dCuenta.showModal(); });

const txCorto = (t) => (t ? `${t.slice(0, 8)}…${t.slice(-6)}` : 'sin TXID');
/** Describe un movimiento de la auditoría: «20,000 sats ($15.52) del 4 nov 2026 · TXID 01234567…abcdef · «nota»». */
function textoMov(x) {
  if (!x?.sats) return '';
  return `${entero(x.sats)} sats (${usd(x.monto)}) del ${fechaLarga(x.fecha)}` +
    (x.txid ? ` · TXID ${txCorto(x.txid)}` : '') + (x.nota ? ` · «${x.nota}»` : '');
}
/** Qué cambió en una edición: solo los campos que difieren. */
function cambiosEdicion(antes, despues) {
  if (!antes || !despues) return '';
  const c = [];
  if (antes.sats !== despues.sats) c.push(`${entero(antes.sats)} → ${entero(despues.sats)} sats`);
  if (antes.monto !== despues.monto) c.push(`${usd(antes.monto)} → ${usd(despues.monto)}`);
  if (antes.fecha !== despues.fecha) c.push(`fecha ${fechaLarga(antes.fecha)} → ${fechaLarga(despues.fecha)}`);
  if ((antes.txid ?? null) !== (despues.txid ?? null)) c.push(`TXID ${txCorto(antes.txid)} → ${txCorto(despues.txid)}`);
  if ((antes.nota ?? null) !== (despues.nota ?? null)) c.push(`nota ${antes.nota ? `«${antes.nota}»` : 'vacía'} → ${despues.nota ? `«${despues.nota}»` : 'vacía'}`);
  return c.join(' · ') || 'sin cambios visibles';
}
function textoAuditoria(a) {
  const d = a.despues || a.antes || {};
  const venta = d.tipo === 'venta';
  const mov = venta ? 'la venta' : 'la compra';
  return {
    alta: venta ? `registró una venta de ${textoMov(d)}` : `anotó ${textoMov(d)}`,
    edicion: `corrigió ${mov} del ${a.antes ? fechaLarga(a.antes.fecha) : ''}: ${cambiosEdicion(a.antes, a.despues)}`,
    anulacion: `anuló ${mov} de ${textoMov(d)}`,
    importacion: `importó ${d.nuevas} ${d.nuevas === 1 ? 'movimiento' : 'movimientos'}`,
    login: 'entró', logout: 'salió', logout_todas: 'salió en todos los dispositivos',
    login_fallido: a.entidad === 'ip' ? 'falló varias veces al entrar desde una misma red' : 'falló al entrar',
    bloqueo: a.entidad === 'ip' ? 'quedó bloqueado desde una red por demasiados intentos' : 'quedó bloqueado unos minutos por demasiados intentos',
    clave_cambiada: `cambió la contraseña de ${d.nombre}`,
    cuenta_creada: `creó la cuenta ${d.nombre} (${d.rol})`,
    cuenta_activada: `activó la cuenta ${d.nombre}`, cuenta_desactivada: `desactivó la cuenta ${d.nombre}`,
    sesiones_cerradas: `cerró las sesiones de ${d.nombre}`, desbloqueo: `desbloqueó la cuenta ${d.nombre}`,
  }[a.accion] ?? a.accion;
}
let histUltimo = null;
async function cargarHistorial(mas = false) {
  const lista = $('hist-lista');
  if (!mas) { lista.textContent = ''; histUltimo = null; }
  try {
    const filas = await api(`/api/auditoria${histUltimo ? `?antes=${histUltimo}` : ''}`);
    for (const a of filas) {
      const li = document.createElement('li');
      const t = document.createElement('time');
      t.textContent = dfAudit.format(new Date(a.ts * 1000)).replace('.', '');
      const p = document.createElement('p');
      const b = document.createElement('b');
      b.textContent = a.usuario === 'cli' ? 'Servidor' : a.usuario === '?' ? 'Alguien' : a.usuario;
      p.append(b, ` ${textoAuditoria(a)}`);
      li.append(t, p);
      lista.append(li);
    }
    histUltimo = filas.at(-1)?.id ?? histUltimo;
    $('hist-mas').hidden = filas.length < 100;
    if (!lista.children.length) lista.innerHTML = '<li class="vacio">Aún no hay nada en el historial.</li>';
  } catch (e) {
    lista.innerHTML = '';
    const li = document.createElement('li'); li.className = 'vacio'; li.textContent = e.message; lista.append(li);
  }
}
$('hist-mas').addEventListener('click', () => cargarHistorial(true));

dCuenta.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-cuenta]');
  if (!b) return;
  const accion = b.dataset.cuenta;
  if (accion === 'cerrar') dCuenta.close();
  else if (accion === 'volver') vistaCuenta('menu');
  else if (accion === 'clave') { vistaCuenta('clave'); $('fc-error').textContent = ''; $('fc-actual').focus(); }
  else if (accion === 'historial') { vistaCuenta('historial'); cargarHistorial(); }
  else if (accion === 'salir' || accion === 'salir-todas') {
    try { await api('/api/logout', { metodo: 'POST', cuerpo: { todas: accion === 'salir-todas' } }); } catch { /* da igual: se sale */ }
    location.replace('/login');
  }
});
$('f-clave').addEventListener('submit', async (e) => {
  e.preventDefault();
  const actual = $('fc-actual').value, nueva = $('fc-nueva').value;
  if (nueva.length < 12) { $('fc-error').textContent = 'La nueva necesita al menos 12 caracteres.'; $('fc-nueva').focus(); return; }
  if (nueva !== $('fc-nueva2').value) { $('fc-error').textContent = 'Las dos nuevas no coinciden.'; $('fc-nueva2').focus(); return; }
  try {
    await api('/api/clave', { metodo: 'POST', cuerpo: { actual, nueva } });
    e.target.reset();
    dCuenta.close();
    avisar('Contraseña cambiada. Tus otras sesiones se cerraron.', null, true);
  } catch (err) {
    $('fc-error').textContent = err.message;
  }
});

cargarYo();
cargarCompras();
consultarPrecio();
setInterval(() => document.visibilityState === 'visible' && consultarPrecio(), 30_000);
// Al volver a la pestaña: precio fresco y compras al día (la base es compartida por la familia).
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  consultarPrecio();
  if (hoja.hidden && S.cargado) cargarCompras();
});
