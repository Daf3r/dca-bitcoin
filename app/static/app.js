import {
  usd, usd0, usdSigno, pct, entero, btc, hora, hoyISO, aFecha, fechaLarga, fechaCorta,
  resumen, nombreHito, serieGrafico, textoMeses, compacto, precioDelDia, estimarMonto, mempoolUrl, extraerTxid,
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
function pintar({ montana = false, animar = false, desde = null } = {}) {
  R = resumen(S.compras, S.precio);
  pintarPrecio();
  pintarSaldo(desde);
  if (montana) pintarMontana(animar, desde);
  pintarTramo();
  pintarMercado();
  pintarLista();
  pintarReportes();
  pintarComienzo();
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
    linea.innerHTML = `valen <b>${usd(R.valor)}</b> · <span data-tono="${R.gan >= 0 ? 'sube' : 'baja'}">${usdSigno(R.gan)} (${pct(R.pct)})</span>`;
  }
}

let anchoMontana = 0;
function pintarMontana(animar, desde) {
  const host = $('montana');
  anchoMontana = host.clientWidth;
  const inicio = animar ? 0 : desde ?? R.sats;
  const techo = document.querySelector('.saldo').getBoundingClientRect().bottom - host.getBoundingClientRect().top;
  dibujarMontana(host, { sats: R.sats, meta: R.meta, inicio, techo });
  if (inicio !== R.sats) subir(inicio, R.sats, animar ? 2400 : 1600);
}
new ResizeObserver(() => {
  if (S.cargado && $('montana').clientWidth !== anchoMontana) pintarMontana(false);
}).observe($('montana'));

function pintarTramo() {
  $('tramo').hidden = !S.cargado || (S.errorCarga && !R.n);
  const anterior = R.meta / 10 >= 1e5 ? R.meta / 10 : 0;
  const prog = (R.sats - anterior) / (R.meta - anterior);
  $('t-meta').textContent = R.meta >= 1e8 ? nombreHito(R.meta) : `${nombreHito(R.meta)} sats`;
  $('t-falta').textContent = `faltan ${entero(R.meta - R.sats)}`;
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
  dibujarGrafico(host, $('g-lectura'), { serie: serieGrafico(S.historico, S.precio, hoyISO()), compras: R.items, promedio: R.promedio, rango: S.rango, hoy: hoyISO() });
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
    const v = S.precio ? (S.precio / c.precio - 1) * 100 : null;
    const etiqueta = esAdmin() ? 'button type="button"' : 'div';
    return `<li><${etiqueta} class="fila" data-id="${c.id}">` +
      (esAdmin() ? '<span class="sr">Editar la compra del </span>' : '') + `<span class="f-fecha">${fechaCorta(c.fecha)}</span>` +
      `<span class="f-sats">+${entero(c.sats)} <small>sats</small></span>` +
      `<span class="f-det">${usd(c.monto)} a ${usd0(c.precio)}</span>` +
      `<span class="f-var"${v == null ? '' : ` data-tono="${v >= 0 ? 'sube' : 'baja'}"`}>${v == null ? '' : pct(v)}</span></${esAdmin() ? 'button' : 'div'}>` +
      (mempoolUrl(c.txid) ? `<a class="f-tx" href="${mempoolUrl(c.txid)}" target="_blank" rel="noopener noreferrer">Ver en mempool.space <span aria-hidden="true">↗</span><span class="sr"> (se abre en otra pestaña)</span></a>` : '') + '</li>';
  }).join('');
  const vt = $('ver-todas');
  vt.hidden = mostradas.length >= R.n;
  vt.textContent = `Ver las ${R.n} compras`;
  if (enFoco) host.querySelector(`.fila[data-id="${enFoco}"]`)?.focus();
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
const H = { sats: '', usd: '', txid: '', usdTocado: false, editando: null, guardando: false, origen: null };
const hoja = $('hoja');

function abrirHoja(id = null) {
  const c = id ? S.compras.find((x) => x.id === id) : null;
  Object.assign(H, { editando: c?.id ?? null, usdTocado: false, guardando: false, origen: document.activeElement });
  H.sats = c ? String(c.sats) : '';
  H.usd = c ? String(c.monto) : '';
  H.txid = c?.txid ?? '';
  $('h-txid').value = H.txid;
  $('h-sats').value = H.sats ? entero(Number(H.sats)) : '';
  $('h-usd').value = H.usd;
  $('h-avanzado').open = !!c;
  $('h-fecha').value = c?.fecha ?? hoyISO();
  $('h-fecha').max = hoyISO();
  $('hoja-t').textContent = c ? 'Editar compra' : 'Anotar compra';
  $('h-borrar').hidden = !c;
  $('hoja-error').textContent = '';
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
  setTimeout(() => { hoja.hidden = true; hoja.style.removeProperty('--kb'); H.origen?.focus?.(); }, reducido() ? 0 : 260);
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
function pintarHoja() {
  const d = datosHoja();
  const saldo = R.sats - (H.editando ? S.compras.find((x) => x.id === H.editando).sats : 0);
  $('hoja-calc').textContent = !d ? 'Escribe los sats que recibiste; los dólares se calculan solos con el precio del día.'
    : d.sinPrecio ? 'Sin precio disponible ahora: abre «Escribir los dólares exactos».'
      : `${d.exacto ? '' : '≈ '}${usd(d.monto)} · 1 BTC a ${usd0(d.precio)}${d.fuente === 'cierre' ? ` (cierre del ${fechaCorta(d.dia)})` : d.fuente === 'hoy' ? ' (sin precio de ese día: uso el de hoy)' : ''} · saldo ${entero(saldo + d.sats)} sats`;
  $('guardar').disabled = !d || d.sinPrecio || H.guardando;
  $('guardar').textContent = H.guardando ? 'Guardando…' : H.editando ? 'Guardar cambios' : 'Guardar';
}
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
  $('hoja-error').textContent = '';
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
$('h-fecha').addEventListener('input', pintarHoja);
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
  H.guardando = true; pintarHoja();
  const antes = R;
  try {
    const cuerpo = { fecha, monto: d.monto, sats: d.sats, txid: extraerTxid(H.txid) };
    const g = normalizar(H.editando ? await api(`/api/compras/${H.editando}`, { metodo: 'PUT', cuerpo }) : await api('/api/compras', { metodo: 'POST', cuerpo }));
    S.compras = H.editando ? S.compras.map((x) => (x.id === g.id ? g : x)) : [...S.compras, g];
    const editando = H.editando;
    H.guardando = false;
    cerrarHoja();
    pintar({ montana: true, desde: antes.sats });
    if (S.histDesde && desdeHistorico() < S.histDesde) cargarHistorico();
    avisar((editando ? 'Compra corregida.' : `Anotado: +${entero(g.sats)} sats`) + (g.txid_repetido?.length ? ' Ojo: ese TXID ya está en otra compra.' : ''), null, true);
    celebrar(antes);
  } catch (err) {
    H.guardando = false;
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

function pintarReportes() {
  // Con menos de tres compras los reportes serían casi vacíos: su lugar lo ocupa «Siguiente paso».
  $('reportes').hidden = R.n < 3;
  if (R.n < 3) { $('rep-anios').hidden = true; return; }
  const hasta = Math.max(1e8, R.meta);
  $('hitos').innerHTML = R.hitos.filter((h) => h.m <= hasta).map((h) => {
    const estado = h.fecha ? 'hecho' : h.m === R.meta ? 'siguiente' : 'lejos';
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
  const ver = R.n > 0 && R.n < 3;
  $('comienzo').hidden = !ver;
  if (!ver) return;
  const falta = R.meta - R.sats;
  const porCompra = R.sats / R.n;
  const compras = Math.max(1, Math.ceil(falta / porCompra));
  $('t-comienzo').textContent = `${compras === 1 ? 'Una compra más' : `${compras} compras más`} para ${R.meta === 1e5 ? 'tu primer campamento' : `los ${nombreMeta(R.meta)}`}`;
  $('com-txt').textContent = `Te faltan ${entero(falta)} sats para ${nombreMeta(R.meta)}. Tus compras rondan ${entero(porCompra)} sats cada una.`;
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
  const nuevo = R.hitos.find((h) => h.fecha && !antes.hitos.find((a) => a.m === h.m)?.fecha);
  if (!nuevo) return;
  const el = $('hito-cel');
  $('hc-txt').textContent = nuevo.m >= 1e8 ? nombreHito(nuevo.m) : `${nombreHito(nuevo.m)} sats`;
  el.hidden = false;
  el.classList.remove('va'); void el.offsetWidth; el.classList.add('va');
  clearTimeout(celebrar.t);
  celebrar.t = setTimeout(() => { el.hidden = true; }, 1600);
}

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
    Object.assign(S, { usuario: yo.usuario, rol: yo.rol });
    document.body.dataset.rol = yo.rol;
    $('cuenta-btn').textContent = yo.usuario;
    $('cuenta-btn').setAttribute('aria-label', `Tu cuenta: ${yo.usuario}`);
    $('cuenta-btn').hidden = false;
    $('dc-quien').textContent = `${yo.usuario} · ${yo.rol === 'admin' ? 'administrador' : 'solo lectura'}`;
    $('dc-historial').hidden = yo.rol !== 'admin';
    $('fc-usuario').value = yo.usuario;
    pintar();
  } catch { /* el 401 ya redirige; si falla la red, la app sigue en solo lectura */ }
}
$('cuenta-btn').addEventListener('click', () => { vistaCuenta('menu'); dCuenta.showModal(); });

function textoAuditoria(a) {
  const d = a.despues || a.antes || {};
  const compra = d.sats ? `${entero(d.sats)} sats (${usd(d.monto)}) del ${fechaLarga(d.fecha)}` : '';
  return {
    alta: `anotó ${compra}`,
    edicion: `corrigió la compra del ${a.antes ? fechaLarga(a.antes.fecha) : ''}: ${a.antes ? entero(a.antes.sats) : ''} → ${compra}`,
    anulacion: `anuló ${compra}`,
    importacion: `importó ${d.nuevas} ${d.nuevas === 1 ? 'compra' : 'compras'}`,
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
