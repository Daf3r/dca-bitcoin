import {
  usd, usd0, usdSigno, pct, entero, btc, hora, hoyISO, fechaLarga, fechaCorta,
  resumen, nombreHito, serieGrafico, textoMeses, compacto,
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
};
let R = resumen([], null);

// ------------------------------------------------------------------ API
/**
 * Único punto de salida hacia el servidor. Si algún día la app tiene login propio,
 * aquí se trata el 401 (redirigir o pedir la contraseña) para toda la app.
 */
async function api(ruta, { metodo = 'GET', cuerpo, tipo = 'application/json' } = {}) {
  const opt = { method: metodo, headers: { Accept: 'application/json' }, cache: 'no-store' };
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
  if (r.status === 401) throw Object.assign(new Error('Tu sesión venció. Recarga la página.'), { status: 401 });
  if (!r.ok) throw Object.assign(new Error(j?.error || `Error ${r.status}.`), { status: r.status, datos: j });
  return j;
}

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

// El contador va en ranuras de ancho fijo: Fraunces no tiene cifras tabulares y si no, bailaría.
function cifra(el, n) {
  const txt = entero(n);
  if (!el.firstChild || el.firstChild.className !== 'sr') el.innerHTML = '<span class="sr"></span><span class="ranuras" aria-hidden="true"></span>';
  el.firstChild.textContent = txt;
  el.lastChild.innerHTML = [...txt].map((c) => `<span class="${/\d/.test(c) ? 'd' : 's'}">${c}</span>`).join('');
}
let contadorRaf = 0;
function contar(el, desde, hasta, ms = 1400) {
  cancelAnimationFrame(contadorRaf);
  if (reducido() || desde === hasta) { cifra(el, hasta); return; }
  const t0 = performance.now();
  const paso = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    cifra(el, desde + (hasta - desde) * (1 - (1 - k) ** 4));
    if (k < 1) contadorRaf = requestAnimationFrame(paso);
  };
  contadorRaf = requestAnimationFrame(paso);
}

let satsMostrados = null;
function pintarSaldo(desde) {
  const el = $('s-sats');
  const linea = $('s-valor');
  if (!S.cargado) return;
  if (S.errorCarga && !R.n) {
    el.textContent = '—';
    linea.textContent = 'No se pudieron cargar tus compras.';
    return;
  }
  if (satsMostrados !== R.sats) {
    // El tamaño se fija con la cifra final para que no salte mientras cuenta.
    const t = entero(R.sats);
    el.style.setProperty('--anchos', (t.replace(/\D/g, '').length * 0.55 + t.replace(/\d/g, '').length * 0.22 + 0.1).toFixed(2));
    contar(el, desde ?? (satsMostrados === null && !reducido() ? 0 : satsMostrados ?? R.sats), R.sats, satsMostrados === null ? 2000 : 1400);
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
  const dias = (Date.now() - new Date(primera.fecha)) / 864e5;
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
    return `<li><button type="button" class="fila" data-id="${c.id}">` +
      `<span class="sr">Editar la compra del </span><span class="f-fecha">${fechaCorta(c.fecha)}</span>` +
      `<span class="f-sats">+${entero(c.sats)} <small>sats</small></span>` +
      `<span class="f-det">${usd(c.monto)} a ${usd0(c.precio)}</span>` +
      `<span class="f-var"${v == null ? '' : ` data-tono="${v >= 0 ? 'sube' : 'baja'}"`}>${v == null ? '' : pct(v)}</span></button></li>`;
  }).join('');
  const vt = $('ver-todas');
  vt.hidden = mostradas.length >= R.n;
  vt.textContent = `Ver las ${R.n} compras`;
  if (enFoco) host.querySelector(`.fila[data-id="${enFoco}"]`)?.focus();
}
$('lista').addEventListener('click', (e) => {
  const b = e.target.closest('.fila');
  if (b) abrirHoja(Number(b.dataset.id));
});
$('ver-todas').addEventListener('click', () => {
  S.verTodas = true;
  pintarLista();
  $('lista').querySelectorAll('.fila')[VISIBLES]?.focus();
});

// ------------------------------------------------------------- hoja de anotar
const H = { usd: '', sats: '', campo: 'usd', editando: null, guardando: false, origen: null };
const hoja = $('hoja');

function abrirHoja(id = null) {
  const c = id ? S.compras.find((x) => x.id === id) : null;
  Object.assign(H, { editando: c?.id ?? null, campo: 'usd', guardando: false, origen: document.activeElement });
  H.usd = c ? String(c.monto) : '';
  H.sats = c ? String(c.sats) : '';
  $('h-fecha').value = c?.fecha ?? hoyISO();
  $('h-fecha').max = hoyISO();
  $('hoja-t').textContent = c ? 'Editar compra' : 'Anotar compra';
  $('h-borrar').hidden = !c;
  $('hoja-error').textContent = '';
  pintarHoja();
  hoja.hidden = false;
  requestAnimationFrame(() => hoja.classList.add('abierta'));
  $('teclado').querySelector('button').focus();
}
function cerrarHoja() {
  hoja.classList.remove('abierta');
  setTimeout(() => { hoja.hidden = true; H.origen?.focus?.(); }, reducido() ? 0 : 260);
}
function datosHoja() {
  const u = Number(H.usd) || 0;
  const s = Math.round(Number(H.sats)) || 0;
  if (u && s) return { monto: u, sats: s, precio: (u * 1e8) / s };
  if (u && S.precio) return { monto: u, sats: Math.max(1, Math.round((u / S.precio) * 1e8)), precio: S.precio, estimado: true };
  return null;
}
function pintarHoja() {
  $('v-usd').textContent = H.usd ? `$${H.usd}` : '$0';
  $('v-sats').textContent = `${H.sats ? entero(Number(H.sats)) : '0'} sats`;
  document.querySelectorAll('.modo button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.campo === H.campo)));
  const d = datosHoja();
  const saldo = R.sats - (H.editando ? S.compras.find((x) => x.id === H.editando).sats : 0);
  $('hoja-calc').textContent = !H.usd ? 'Escribe cuánto pagaste en USD.'
    : !d ? 'Sin precio en vivo: escribe también los sats que recibiste.'
      : `1 BTC a ${usd0(d.precio)}${d.estimado ? ' (estimado con el precio de hoy; toca «Recibiste» para el número exacto)' : ''} · saldo ${entero(saldo + d.sats)} sats`;
  $('guardar').disabled = !d || H.guardando;
  $('guardar').textContent = H.guardando ? 'Guardando…' : H.editando ? 'Guardar cambios' : 'Guardar';
}
$('teclado').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const k = H.campo;
  if (b.dataset.borrar !== undefined) H[k] = H[k].slice(0, -1);
  else if (b.textContent === '.') { if (k === 'usd' && !H[k].includes('.')) H[k] += H[k] ? '.' : '0.'; }
  else if (H[k].length < 13 && !(k === 'usd' && /\.\d\d$/.test(H[k]))) H[k] = (H[k] === '0' ? '' : H[k]) + b.textContent;
  if (!reducido()) { b.classList.remove('pulsa'); void b.offsetWidth; b.classList.add('pulsa'); }
  pintarHoja();
});
// Con teclado físico también se puede escribir directamente.
hoja.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') return cerrarHoja();
  if (e.target.tagName === 'INPUT') return;
  const tecla = /^[0-9.]$/.test(e.key) ? e.key : e.key === 'Backspace' ? '⌫' : null;
  if (!tecla) return;
  e.preventDefault();
  [...$('teclado').children].find((b) => b.textContent === tecla)?.click();
});
document.querySelector('.modo').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) { H.campo = b.dataset.campo; pintarHoja(); }
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
    const cuerpo = { fecha, monto: d.monto, sats: d.sats };
    const g = normalizar(H.editando ? await api(`/api/compras/${H.editando}`, { metodo: 'PUT', cuerpo }) : await api('/api/compras', { metodo: 'POST', cuerpo }));
    S.compras = H.editando ? S.compras.map((x) => (x.id === g.id ? g : x)) : [...S.compras, g];
    const editando = H.editando;
    H.guardando = false;
    cerrarHoja();
    pintar({ montana: true, desde: antes.sats });
    if (S.histDesde && desdeHistorico() < S.histDesde) cargarHistorico();
    avisar(editando ? 'Compra corregida.' : `Anotado: +${entero(g.sats)} sats`, null, true);
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
  avisar('Compra borrada.', null, true);
});

// --------------------------------------------------------------- reportes
const MESES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const nombreMeta = (m) => (m >= 1e8 ? nombreHito(m) : `${nombreHito(m)} sats`);
const semanas = (n) => `${n} ${n === 1 ? 'semana' : 'semanas'}`;

function pintarReportes() {
  // Con menos de tres compras los reportes serían casi vacíos: su lugar lo ocupa «Siguiente paso».
  $('reportes').hidden = R.n < 3;
  document.body.classList.toggle('pocas', R.n > 0 && R.n < 3);
  if (R.n < 3) return;
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
  document.querySelector('.rep-anios').hidden = mesesConCompra < 2;
  const maxMes = Math.max(...R.anios.flatMap((a) => a.meses));
  $('anios').innerHTML = [...R.anios].reverse().map((a) =>
    `<div class="anio"><b class="an-y">${a.anio}</b><div class="an-barras" aria-hidden="true">` +
    a.meses.map((v, i) => `<i class="${v ? '' : 'vacio'}" data-h="${v / maxMes}" title="${MESES[i]}: ${usd(v)}"></i>`).join('') +
    `</div><p class="an-tot"><span><b>+${compacto(a.sats)}</b> sats</span><span>${usd0(a.usd)} · ${a.n} ${a.n === 1 ? 'compra' : 'compras'}</span></p></div>`).join('');
  $('anios').querySelectorAll('[data-h]').forEach((i) => { i.style.height = `${Math.max(Number(i.dataset.h) * 100, 6)}%`; });

  // Ventana de 52 semanas desde la primera compra si es más reciente: sin huellas vacías antes de empezar.
  const ventana = R.ultimas52.slice(-Math.min(52, Math.max(R.semanasDesdePrimera - (R.semanaEnCurso ? 0 : 1), 1)));
  $('semanas').innerHTML = ventana.map((v) => `<i${v ? ' class="con"' : ''}></i>`).join('');
  $('semanas').style.setProperty('--n', String(Math.max(ventana.length, 13)));
  const con = ventana.filter(Boolean).length;
  $('const-racha').textContent = R.racha;
  $('const-unidad').textContent = R.racha === 1 ? 'semana seguida' : 'semanas seguidas';
  const resumenSemanas = con === ventana.length && ventana.length < 52
    ? `Has comprado todas las semanas desde que empezaste (${ventana.length}). `
    : `Compraste en <b>${con}</b> de ${ventana.length === 52 ? 'las últimas 52 semanas' : `tus ${ventana.length} semanas`}. `;
  $('const-txt').innerHTML = resumenSemanas +
    `Tu mejor racha: <b>${semanas(R.mejorRacha)}</b>.` + (R.semanaEnCurso || !R.racha ? '' : ' Esta semana aún no has comprado: tienes hasta el domingo.');

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
/** Domingo que cierra la semana local en la que cae `d` (+7 días si se pide la siguiente). */
function domingo(semanasMas = 0) {
  const d = new Date();
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
  $('com-racha').textContent = semanas(R.racha);
  $('com-racha-sub').textContent = R.racha
    ? `sigue si vuelves a comprar antes del ${domingo(R.semanaEnCurso ? 1 : 0)}`
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
cargarCompras();
consultarPrecio();
setInterval(() => document.visibilityState === 'visible' && consultarPrecio(), 30_000);
document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && consultarPrecio());
