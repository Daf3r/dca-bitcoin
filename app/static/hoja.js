import { hundirMoneda } from './montana.js';
import { diaDe, fechaEscrita, sumarDias, etapaAnterior, etapaSiguiente, nombreHito, nombreWallet, walletNetoDe, etiquetasUsadas, partirEtiquetas, avisosAlAnotar, constanciaCruzada, selloNuevo, costoTrasCompra, entero, estimarMonto, extraerTxid, fechaCorta, fechaLarga, hoyISO, leerPrecio, montoCampo, montoDePrecio, montoHabitual, pct, precioCampo, precioDeMonto, precioDelDia, TOPE_DINERO, usd, usd0, walletNeto } from './lib.js';
import { avisar } from './avisar.js';
import { celebrar, destello } from './celebracion.js';
import { cargarHistorico, desdeHistorico } from './datos.js';
import { $, R, S, api, normalizar, reducido } from './estado.js';
import { MS_SUBIDA, pintar, progresoEtapa } from './pintar.js';
import { resaltar } from './lista.js';
import { nombreMeta } from './reportes.js';
import { sonarGuardado } from './sonido.js';

// ------------------------------------------------------------- hoja de anotar
export const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// `usd` y `precio` son lo que se ve en sus campos y `manda` dice cuál escribió la persona: '' (ninguno: se estima con el precio del día),
// 'usd', 'precio' o 'guardado' (al editar, lo de esa compra tal cual mientras no se toque). El otro campo se calcula.
const H = { tipo: 'compra', nota: '', etq: '', sats: '', usd: '', precio: '', manda: '', txid: '', extra: false, sentido: 'a_wallet', comision: '', wallet: '', walletNueva: '', editando: null, guardando: false, origen: null, confirmadoPara: '', estimado: false, otroDia: false };
export const hoja = $('hoja');

// «Deshacer» tras guardar, corregir o anular (8 s): deshacer una compra nueva la anula, deshacer una anulación la vuelve a anotar con los mismos
// datos y deshacer una corrección devuelve los valores de antes. Todo pasa por las rutas de siempre, así que queda en el Historial
// (la app sigue sin «desanular» de verdad: se vuelve a anotar).
const ESPERA_DESHACER = 8000;
function conDeshacer(texto, deshacer, retraso = 0) {
  const mostrar = () => avisar(texto, async () => {
    avisar('');
    try { await deshacer(); } catch (err) { avisar(err.message || 'No se pudo deshacer.', null, true); }
  }, true, { etiqueta: 'Deshacer', ms: ESPERA_DESHACER });
  if (retraso) setTimeout(mostrar, retraso); else mostrar();
}
const cuerpoDe = (c) => ({ fecha: c.fecha, monto: c.monto, sats: c.sats, txid: c.txid ?? '', tipo: c.tipo, nota: c.nota ?? '', extra: c.tipo === 'compra' && !!c.extra, etiquetas: c.etiquetas ?? [] });
/** Pinta tras deshacer: la montaña baja o sube desde donde estaba, sin celebración. */
function repintarTrasDeshacer(mensaje) {
  pintar({ montana: true, desde: R.sats });
  avisar(mensaje, null, true);
}

// Borrador: si cierras la hoja a medias (o suena el teléfono), lo escrito vuelve al abrirla. Va en el navegador, con control de errores,
// se borra al guardar y caduca a la semana. Nunca guarda la fecha: siempre se propone la de hoy.
const CLAVE_BORRADOR = 'libro.borrador';
const SEMANA_MS = 7 * 864e5;
function leerBorrador() {
  try {
    const b = JSON.parse(localStorage.getItem(CLAVE_BORRADOR) ?? 'null');
    return b && Date.now() - b.t < SEMANA_MS ? b : null;
  } catch { return null; }
}
function borrarBorrador() { try { localStorage.removeItem(CLAVE_BORRADOR); } catch { /* sin almacenamiento */ } }
function guardarBorrador() {
  if (H.editando || hoja.hidden) return;
  const { tipo, sats, nota, etq, txid, extra, sentido, comision, manda } = H;
  // Del dinero solo se guarda lo que escribió la persona (el otro campo se vuelve a calcular al abrir).
  const usd = manda === 'usd' ? H.usd : '', precio = manda === 'precio' ? H.precio : '';
  try {
    if (!sats && !usd && !precio && !nota && !etq && !txid && !comision) localStorage.removeItem(CLAVE_BORRADOR);
    else localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ t: Date.now(), tipo, sats, usd, precio, nota, etq, txid, extra, sentido, comision }));
  } catch { /* sin almacenamiento: no hay borrador */ }
}
hoja.addEventListener('input', guardarBorrador);
hoja.addEventListener('change', guardarBorrador);
hoja.addEventListener('click', (e) => { if (e.target.closest('#h-tipo, #h-sentido')) guardarBorrador(); });

export function abrirHoja(id = null, tipoInicial = 'compra') {
  const c = id ? S.compras.find((x) => x.id === id) : null;
  Object.assign(H, { editando: c?.id ?? null, guardando: false, origen: document.activeElement, confirmadoPara: '', estimado: false, otroDia: false });
  H.sats = c ? String(c.sats) : '';
  // Al editar, los dólares y el precio de esa compra; mientras no se toquen se guarda su monto tal cual (puede llevar más de dos decimales).
  H.manda = c ? 'guardado' : '';
  H.usd = c ? montoCampo(c.monto) : '';
  H.precio = c ? precioCampo(precioDeMonto(c.monto, c.sats)) : '';
  H.txid = c?.txid ?? '';
  H.tipo = c?.tipo ?? (['venta', 'traslado'].includes(tipoInicial) ? tipoInicial : 'compra');
  H.nota = c?.nota ?? '';
  H.etq = (c?.etiquetas ?? []).join(', ');
  H.extra = !!c?.extra;
  H.sentido = 'a_wallet';
  H.wallet = '';
  H.walletNueva = '';
  H.comision = '';
  const b = !c && tipoInicial === 'compra' ? leerBorrador() : null;
  if (b) Object.assign(H, { tipo: b.tipo, sats: b.sats ?? '', usd: b.usd ?? '', precio: b.precio ?? '', manda: b.precio ? 'precio' : b.usd ? 'usd' : '', nota: b.nota ?? '', etq: b.etq ?? '', txid: b.txid ?? '', extra: !!b.extra, sentido: b.sentido ?? 'a_wallet', comision: b.comision ?? '' });
  $('h-borrador').hidden = !b;
  $('h-comision').value = H.comision ? entero(Number(H.comision)) : '';
  $('h-nota').value = H.nota;
  $('h-extra').checked = H.extra;
  $('h-etq').value = H.etq;
  $('h-etq-lista').replaceChildren(...etiquetasUsadas(S.compras).map(({ nombre }) => Object.assign(document.createElement('option'), { value: nombre })));
  $('h-tipo').hidden = !!c;
  $('h-txid').value = H.txid;
  $('h-sats').value = H.sats ? entero(Number(H.sats)) : '';
  $('h-usd').value = H.usd;
  $('h-precio').value = H.precio;
  $('h-avanzado').open = !!c || !!(b && (b.usd || b.precio || b.txid || b.extra || b.comision || b.etq));
  $('h-fecha').max = hoyISO();
  fijarFecha(c?.fecha ?? hoyISO());
  $('hoja-t').textContent = c ? 'Editar compra' : 'Anotar compra';
  $('h-borrar').hidden = !c;
  limpiarError();
  abrirCambia();
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

/**
 * Lo que se va a guardar. `origen` dice de dónde salen los dólares y el precio: 'precio' (lo escribió la persona: los dólares van sin
 * redondear, `montoDePrecio`, para que el servidor derive ese mismo precio), 'usd' (dólares escritos: el precio se deriva), 'guardado'
 * (al editar sin tocarlos: el monto de esa compra tal cual) o ninguno (estimado con el precio de ese día, `fuente`, a centavos).
 */
function datosHoja() {
  const sats = Math.round(Number(H.sats)) || 0;
  if (!sats) return null;
  if (H.tipo === 'traslado') return { sats, traslado: true }; // no lleva dólares ni precio
  const previa = H.manda === 'guardado' ? S.compras.find((x) => x.id === H.editando) : null;
  if (previa && previa.sats === sats) return { sats, monto: previa.monto, precio: precioDeMonto(previa.monto, sats), exacto: true, origen: 'guardado' };
  if (H.manda === 'precio') {
    const p = leerPrecio(H.precio);
    if (!(p > 0)) return { sats, precioMal: 'texto' };
    const monto = montoDePrecio(sats, p);
    // Con menos de una cienmillonésima de dólar el servidor guardaría cero; con mil millones o más, no lo acepta.
    if (!(monto > 0)) return { sats, precioMal: 'poco' };
    if (monto >= TOPE_DINERO) return { sats, precioMal: 'mucho' };
    return { sats, monto, precio: p, exacto: true, origen: 'precio' };
  }
  const u = Number(H.usd) || 0;
  if (H.manda === 'usd' && u > 0) return { sats, monto: u, precio: precioDeMonto(u, sats), exacto: true, origen: 'usd' };
  const p = precioDelDia($('h-fecha').value, S.historico, S.precio);
  if (!p) return { sats, sinPrecio: true };
  return { sats, monto: estimarMonto(sats, p.precio), precio: p.precio, fuente: p.fuente, dia: p.dia };
}
const PRECIO_MAL = {
  texto: 'Revisa el precio de BTC: escríbelo como 62,500 o 62500.50.',
  poco: 'Con ese precio, esos sats no valen casi nada: revisa el precio de BTC.',
  mucho: 'Con ese precio, esos sats pasarían de mil millones de dólares: revisa el precio de BTC.',
};
/**
 * Los dólares y el precio en sus campos: el que manda queda como lo escribiste; el otro se calcula y lo dice («· calculado»). Vacíos (ninguno
 * escrito) quedan vacíos: lo estimado ya lo dicen el renglón de la respuesta y su precio.
 */
function pintarDinero(d) {
  const venta = H.tipo === 'venta';
  const vale = d && !d.sinPrecio && !d.precioMal && !d.traslado;
  const calc = H.manda === 'precio' ? 'usd' : H.manda === 'usd' || H.manda === 'guardado' ? 'precio' : '';
  if (calc === 'usd') H.usd = vale ? montoCampo(d.monto) : '';
  if (calc === 'precio' && H.manda === 'usd') H.precio = vale ? precioCampo(d.precio) : '';
  if (!H.manda) { H.usd = ''; H.precio = ''; }
  for (const [k, campo] of [['usd', 'h-usd'], ['precio', 'h-precio']]) {
    const inp = $(campo);
    if (inp.value !== H[k]) inp.value = H[k];
    inp.dataset.derivado = calc === k && H[k] ? '1' : '';
    $(`${campo}-c`).hidden = !inp.dataset.derivado;
  }
  $('h-precio-t').textContent = venta ? 'Precio de BTC al que vendiste (opcional)' : 'Precio de BTC al que compraste (opcional)';
  $('h-dinero-ay').textContent = H.manda === 'precio' ? 'Los dólares salen del precio que escribiste.'
    : H.manda === 'usd' ? 'El precio sale de los dólares que escribiste.'
      : H.manda === 'guardado' ? `Son los de esta ${venta ? 'venta' : 'compra'}. Si cambias uno, el otro se calcula.`
        : 'Escribe los dólares o el precio: el otro se calcula. Si no escribes ninguno, se calculan con el precio de ese día.';
}
/** «Compra de siempre»: tu monto habitual en dólares convertido a sats con el precio de hoy. Solo una estimación hasta que escribas lo real. */
function compraDeSiempre() {
  const usdHabitual = S.precio ? montoHabitual(R.items) : null;
  return usdHabitual ? { usd: usdHabitual, sats: Math.round((usdHabitual / S.precio) * 1e8) } : null;
}
$('h-habitual').addEventListener('click', () => {
  const h = compraDeSiempre();
  if (!h) return;
  Object.assign(H, { sats: String(h.sats), usd: '', precio: '', manda: '', estimado: true });
  $('h-sats').value = entero(h.sats);
  fijarFecha(hoyISO()); // la compra de siempre es la de hoy
  limpiarError();
  pintarHoja();
  guardarBorrador();
  $('h-sats').focus();
  $('h-sats').select();
});

/** Lo que se va a guardar, para saber si el aviso ya confirmado sigue valiendo (si cambias algo, vuelve a avisar). */
const claveHoja = () => `${H.tipo}|${H.sats}|${$('h-fecha').value}|${H.extra}|${H.manda}|${H.manda === 'precio' ? H.precio : H.manda === 'usd' ? H.usd : ''}`;
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
    : `esto es ${a.veces} veces ${a.sentido === 'mas' ? 'más' : 'menos'} que tu compra habitual (unos ${usd(a.mediana)}). ¿Faltó o sobró un cero?`);
  return `Ojo: ${partes.join(' Además, ')} Si está bien, toca «Sí, guardar así».`;
}
/** Qué campos de la hoja valen para cada tipo: compra, venta o gasto, y traslado. */
function camposSegunTipo() {
  const tras = H.tipo === 'traslado';
  $('h-sentido').hidden = !tras;
  pintarSelectorWallet(tras);
  // La nota: en una compra es la pregunta de la semana (campamento 18); en una venta o un traslado, la nota de siempre.
  const compra = H.tipo === 'compra';
  $('h-nota-t').textContent = compra ? '¿Qué pasó esta semana en casa?' : 'Nota (opcional)';
  $('h-nota-ay').hidden = !compra;
  $('h-av-t').textContent = tras ? 'Más detalles: TXID y comisión' : H.tipo === 'venta' ? 'Más detalles: dólares o precio y TXID' : 'Más detalles: dólares o precio, TXID y compra extra';
  $('h-usd-t').textContent = H.tipo === 'venta' ? 'Recibiste (USD)' : 'Pagaste (USD)';
  $('h-nota').placeholder = tras ? 'Por ejemplo: a mi Ledger' : compra ? (H.extra ? 'Por ejemplo: cayó 20 %' : 'Por ejemplo: Sofi perdió su primer diente') : 'Por ejemplo: gasté en renta';
  document.querySelectorAll('#h-avanzado [data-solo-compra]').forEach((el) => { el.hidden = H.tipo !== 'compra'; });
  document.querySelectorAll('#h-avanzado [data-no-traslado]').forEach((el) => { el.hidden = tras; });
  document.querySelectorAll('#h-avanzado [data-solo-traslado]').forEach((el) => { el.hidden = !tras || H.sentido !== 'a_wallet'; });
  document.querySelectorAll('#h-tipo button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tipo === H.tipo)));
  document.querySelectorAll('#h-sentido button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sentido === H.sentido)));
}
/** Las wallets que pueden recibir traslados (las archivadas ya no). */
const walletsActivas = () => S.wallets.filter((w) => !w.archivada);
/** El id de la wallet elegida: 0 es la principal, un número es otra y null es una nueva que aún no existe. */
function walletElegida() {
  if (H.wallet === 'nueva') return null;
  return H.wallet === '' ? 0 : Number(H.wallet);
}
/** Selector de wallet: solo en un traslado y solo si hay más de una; si no, un enlace para usar otra. */
function pintarSelectorWallet(tras) {
  const activas = walletsActivas();
  const caja = $('h-wallet-caja');
  caja.hidden = !tras;
  if (!tras) return;
  const conSelector = activas.length > 0;
  const nuevaAbierta = H.wallet === 'nueva' || (!conSelector && H.walletNueva !== '');
  $('h-wallet-sel-l').hidden = !conSelector;
  $('h-wallet-mas').hidden = conSelector || nuevaAbierta;
  $('h-wallet-nueva-l').hidden = !nuevaAbierta;
  if (conSelector) {
    const sel = $('h-wallet');
    const opciones = [['', 'Mi wallet'], ...activas.map((w) => [String(w.id), w.nombre]), ['nueva', 'Otra wallet nueva…']];
    if (sel.options.length !== opciones.length || opciones.some(([v, t], i) => sel.options[i].value !== v || sel.options[i].textContent !== t)) {
      sel.replaceChildren(...opciones.map(([v, t]) => Object.assign(document.createElement('option'), { value: v, textContent: t })));
    }
    sel.value = H.wallet;
  }
}
$('h-wallet').addEventListener('change', (e) => { H.wallet = e.target.value; limpiarError(); pintarHoja(); if (H.wallet === 'nueva') $('h-wallet-nueva').focus(); });
$('h-wallet-mas').addEventListener('click', () => { H.wallet = 'nueva'; pintarHoja(); $('h-wallet-nueva').focus(); });
$('h-wallet-nueva').addEventListener('input', (e) => { H.walletNueva = e.target.value; pintarHoja(); });
/** Traslado: el saldo total no cambia, solo cambia dónde están los sats. */
function pintarHojaTraslado() {
  const d = datosHoja();
  const aWallet = H.sentido === 'a_wallet';
  const id = walletElegida();
  const nuevaAbierta = id === null || (!walletsActivas().length && H.walletNueva !== '');
  const nombreW = id === null ? (H.walletNueva.trim() || 'la wallet nueva') : id === 0 ? 'tu wallet' : `«${nombreWallet(S.wallets, id)}»`;
  const neto = id === null ? 0 : walletNetoDe(S.traslados, id);
  const todas = walletNeto(S.traslados);
  const sinNombre = id === null && !H.walletNueva.trim();
  $('hoja-t').textContent = aWallet ? `Traslado a ${nombreW}` : `Traslado de ${nombreW} al exchange`;
  $('h-sats-l').textContent = aWallet ? `Sats que llegaron a ${nombreW}` : `Sats que salieron de ${nombreW}`;
  const falla = !!d && (aWallet ? todas + d.sats > R.sats : d.sats > neto);
  const enWallet = d ? Math.max(0, neto + (aWallet ? d.sats : -d.sats)) : neto;
  const enTodas = d ? Math.max(0, todas + (aWallet ? d.sats : -d.sats)) : todas;
  const parte = id === 0 && !S.wallets.length ? '' : ` (${enWallet === 0 ? 'nada' : entero(enWallet)} en ${nombreW})`;
  $('hc-uno').dataset.resp = '';
  $('hc-pie').hidden = true;
  $('h-cambia').hidden = true;
  $('hc-uno').textContent = !d ? (aWallet ? 'Escribe los sats que te llegaron a la wallet. El saldo total no cambia: solo cambia dónde están.' : 'Escribe los sats que sacaste de tu wallet hacia el exchange.')
    : falla ? (aWallet ? `No tienes tantos sats: tu saldo es ${entero(R.sats)} y ya tienes ${entero(todas)} en tus wallets.` : `No tienes tantos sats en ${nombreW}: tienes ${entero(neto)}.`)
      : id === 0 && !S.wallets.length ? `Quedarán ${entero(enWallet)} sats en tu wallet y ${entero(Math.max(0, R.sats - enWallet))} en el exchange.`
        : `Quedarán ${entero(enTodas)} sats en tus wallets${parte} y ${entero(Math.max(0, R.sats - enTodas))} en el exchange.`;
  $('guardar').disabled = !d || falla || H.guardando || (nuevaAbierta && sinNombre);
  $('guardar').textContent = H.guardando ? 'Guardando…' : 'Guardar traslado';
}
function pintarHoja() {
  const d = datosHoja();
  camposSegunTipo();
  const h = H.tipo === 'compra' && !H.editando ? compraDeSiempre() : null;
  $('h-habitual').hidden = !h;
  if (h) $('h-habitual').textContent = `Compra de siempre: ${usd0(h.usd)} ≈ ${entero(h.sats)} sats`;
  $('h-sats').dataset.estimado = H.estimado ? '1' : '';
  if (H.tipo === 'traslado') return pintarHojaTraslado();
  pintarDinero(d);
  const venta = H.tipo === 'venta';
  const previa = H.editando ? S.compras.find((x) => x.id === H.editando) : null;
  // Saldo sin el movimiento que se edita (una venta editada devuelve sus sats, una compra editada los quita).
  const saldo = R.sats - (previa ? (previa.tipo === 'venta' ? -previa.sats : previa.sats) : 0);
  const sinSaldo = venta && d && d.sats > saldo;
  $('hoja-t').textContent = venta ? (H.editando ? 'Editar venta' : 'Anotar venta o gasto') : H.editando ? 'Editar compra' : 'Anotar compra';
  $('h-sats-l').textContent = venta ? 'Sats que salieron' : 'Sats que recibiste';
  const resto = d && !d.sinPrecio && !d.precioMal ? saldo + (venta ? -d.sats : d.sats) : 0;
  const habitual = !venta && S.precio ? montoHabitual(R.items) : null;
  // Con «Compra de siempre» a la vista, lo que valen tus dólares de siempre ya lo dice ese botón: aquí queda solo el cambio.
  const referencia = !habitual ? '' : h ? ` Hoy $1 = ${entero(1e8 / S.precio)} sats.` : ` Hoy ${usd0(habitual)} son ≈ ${entero((habitual / S.precio) * 1e8)} sats ($1 = ${entero(1e8 / S.precio)} sats).`;
  // Una respuesta (campamento 18): los dólares y cómo queda el saldo, en un renglón que se lee de un vistazo. Lo demás va debajo, plegado.
  const resp = Boolean(d && !d.sinPrecio && !d.precioMal && !sinSaldo);
  const nueva = resp && !venta && !H.editando;
  const uno = $('hc-uno');
  uno.dataset.resp = resp ? '1' : '';
  uno.textContent = !d ? (venta ? 'Escribe los sats que salieron; los dólares se calculan solos con el precio del día.' : `Escribe los sats que recibiste; los dólares se calculan solos con el precio del día.${referencia}`)
    : d.sinPrecio ? 'Sin precio disponible ahora: abre «Más detalles» y escribe los dólares o el precio.'
      : d.precioMal ? PRECIO_MAL[d.precioMal]
      : sinSaldo ? `No tienes tantos sats: tu saldo es ${entero(saldo)}.`
        : `${d.exacto ? '' : '≈ '}${usd(d.monto)}${venta ? ' por la venta' : ''} · quedas en ${entero(resto)} sats`;
  if (H.estimado) {
    const est = document.createElement('span');
    est.className = 'hc-est';
    est.textContent = 'Estimación con el precio de hoy: cámbiala por lo que recibiste. ';
    uno.prepend(est);
  }
  // El precio con que se hizo la cuenta, y de dónde sale (estimado con el de ahora o con un cierre, o lo que escribiste): a la vista si no
  // es el de ahora (un cierre, o el de hoy porque falta el de ese día) y en ventas y ediciones; en una compra nueva de hoy va con lo plegado.
  const precioTxt = resp ? `1 BTC a ${usd0(d.precio)}` : '';
  const deDonde = !resp ? '' : d.fuente === 'cierre' ? ` (cierre del ${fechaCorta(d.dia)})` : d.fuente === 'hoy' ? ' (sin precio de ese día: uso el de hoy)'
    : d.fuente === 'vivo' ? ' (precio de ahora)' : d.origen === 'precio' ? ' (el que escribiste)' : d.origen === 'usd' ? ' (según tus dólares)'
      : ` (el de esta ${venta ? 'venta' : 'compra'})`;
  const precioFuera = resp && (!nueva || d.fuente === 'cierre' || d.fuente === 'hoy');
  $('hc-pie').hidden = !precioFuera;
  $('hc-pie').textContent = precioFuera ? precioTxt + deDonde : '';
  const lineas = [];
  const linea = (clase, texto) => { const s = document.createElement('span'); s.className = clase; s.textContent = texto; lineas.push(s); return s; };
  // «Tú» fantasma (16B, idea 2): la regla de tu etapa con dónde quedarías si guardas esto (solo al anotar una compra).
  const ruta = $('h-ruta');
  ruta.hidden = !nueva;
  if (nueva) {
    const a = etapaAnterior(saldo), b = etapaSiguiente(saldo), tras = saldo + d.sats, q = b > a ? (tras - a) / (b - a) : 0;
    ruta.style.setProperty('--p', String(Math.max(0, Math.min(1, b > a ? (saldo - a) / (b - a) : 0)).toFixed(3)));
    ruta.style.setProperty('--q', String(Math.max(0, Math.min(1, q)).toFixed(3)));
    linea('ruta-txt', tras >= b ? `Con esto llegarías a ${b >= 1e8 ? nombreHito(b) : `${nombreHito(b)} sats`}.` : `Quedarías al ${Math.round(q * 100)} % del camino a ${b >= 1e8 ? nombreHito(b) : `${nombreHito(b)} sats`}.`);
  }
  // El «ajuste» del DCA: cómo mueve esta compra tu costo promedio (solo al crear una compra con precio).
  const c = nueva ? costoTrasCompra(R, d.monto, d.sats) : null;
  if (c) {
    linea('costo', Math.abs(c.cambio) < 0.05 ? `Tu costo promedio casi no cambia (${usd0(c.antes)}).`
      : `Tu costo promedio ${c.despues < c.antes ? 'baja' : 'sube'} de ${usd0(c.antes)} a ${usd0(c.despues)} (${pct(c.cambio)}).`).dataset.tono = c.despues < c.antes ? 'sube' : '';
  }
  if (nueva && !precioFuera) linea('hc-precio', `${d.origen === 'precio' ? 'Precio que escribiste' : d.exacto ? 'Precio que pagaste' : 'Precio de ahora'}: ${precioTxt}.`);
  $('hc-lineas').replaceChildren(...lineas);
  $('h-cambia').hidden = !nueva;
  $('guardar').disabled = !d || d.sinPrecio || d.precioMal || sinSaldo || H.guardando;
  $('guardar').textContent = H.guardando ? 'Guardando…' : confirmando() ? 'Sí, guardar así' : H.editando ? 'Guardar cambios' : venta ? 'Guardar venta' : 'Guardar';
}
// «Qué cambia con esta compra»: se abre con un toque y el dispositivo recuerda cómo lo dejaste; si nunca lo tocaste, va cerrado en el
// teléfono (lo que importa es el renglón de arriba y que «Guardar» quede a la vista) y abierto donde sobra sitio.
const CLAVE_CAMBIA = 'libro.hoja.cambia';
const anchoHoja = matchMedia('(min-width: 700px)');
function abrirCambia() {
  let g = null;
  try { g = localStorage.getItem(CLAVE_CAMBIA); } catch { /* sin almacenamiento: según el ancho */ }
  $('h-cambia').open = g === '1' || (g !== '0' && anchoHoja.matches);
}
$('h-cambia').querySelector('summary').addEventListener('click', () => {
  // El clic llega antes de que <details> cambie: se guarda lo contrario de como está.
  try { localStorage.setItem(CLAVE_CAMBIA, $('h-cambia').open ? '0' : '1'); } catch { /* vale para esta vez */ }
});
$('h-tipo').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) { H.tipo = b.dataset.tipo; limpiarError(); pintarHoja(); }
});
$('h-nota').addEventListener('input', (e) => { H.nota = e.target.value; });
$('h-etq').addEventListener('input', (e) => { H.etq = e.target.value; });
// Marcar o desmarcar «extra» reinicia el aviso: lo que se confirmó ya no es lo mismo.
$('h-extra').addEventListener('change', (e) => { H.extra = e.target.checked; limpiarError(); pintarHoja(); });
$('h-sentido').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) { H.sentido = b.dataset.sentido; limpiarError(); pintarHoja(); }
});
$('h-comision').addEventListener('input', (e) => {
  const d = e.target.value.replace(/\D/g, '').slice(0, 9);
  H.comision = d;
  e.target.value = d ? entero(Number(d)) : '';
});
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
  H.estimado = false;
  // Si corriges los sats de una compra sin tocar los dólares ni el precio, se recalculan con el precio del día (no se sabe si los de
  // antes eran exactos o estimados: se ve el «≈» y se puede escribir el precio).
  if (H.manda === 'guardado') { H.manda = ''; H.usd = ''; H.precio = ''; }
  limpiarError();
  pintarHoja();
});
// Los dólares y el precio: el último que escribes manda y el otro se calcula. Vaciar cualquiera de los dos vacía los dos y vuelve a la
// estimación con el precio de ese día (como si no hubieras escrito nada).
function escribioDinero(cual, v) {
  H[cual] = v;
  H.manda = v.trim() ? cual : '';
  if (!H.manda) { H.usd = ''; H.precio = ''; }
  limpiarError();
  pintarHoja();
}
$('h-usd').addEventListener('input', (e) => {
  const v = e.target.value.replace(/[$\s]/g, '').replace(',', '.');
  if (!/^\d{0,10}(\.\d{0,2})?$/.test(v)) { e.target.value = H.usd; return; }
  e.target.value = v;
  escribioDinero('usd', v);
});
// El precio se deja tal cual lo escribes mientras escribes (una coma a medias, «62,5», no se convierte en decimal); se lee al vuelo
// (`leerPrecio`) y al salir del campo se ordena con sus comas de miles.
$('h-precio').addEventListener('input', (e) => escribioDinero('precio', e.target.value));
$('h-precio').addEventListener('change', (e) => {
  const p = leerPrecio(e.target.value);
  if (H.manda === 'precio' && p > 0) { e.target.value = H.precio = precioCampo(p); guardarBorrador(); }
});
// Un número calculado no se edita a medias: lo primero que escribes (o pegas) encima lo reemplaza; borrar sí va cifra por cifra. Se hace a
// mano (cancelar y poner lo escrito): vaciar el campo y dejar que el navegador inserte funciona en Chromium, pero WebKit pierde esa tecla.
for (const id of ['h-usd', 'h-precio']) {
  const inp = $(id);
  inp.addEventListener('beforeinput', (e) => {
    if (!inp.dataset.derivado || !e.inputType.startsWith('insert') || !e.cancelable) return;
    const t = e.data ?? e.dataTransfer?.getData('text/plain') ?? '';
    e.preventDefault();
    inp.value = t;
    inp.setSelectionRange(t.length, t.length);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
$('h-txid').addEventListener('input', (e) => { H.txid = e.target.value.trim(); $('hoja-error').textContent = ''; });
// Al salir del campo, si pegaron un enlace de un explorador se deja solo el TXID.
$('h-txid').addEventListener('change', (e) => { e.target.value = H.txid = extraerTxid(e.target.value); });
$('h-fecha').addEventListener('input', () => { limpiarError(); pintarFecha(); pintarHoja(); });
// Fecha con «Hoy · Ayer · Otro día» (campamento 18): casi siempre se anota el mismo día o al siguiente, así que el calendario del
// teléfono (que además puede salir en formato de fuera, 11/15/2026) solo aparece si lo pides. El valor sigue viviendo en `#h-fecha`.
function pintarFecha() {
  const f = $('h-fecha').value, hoy = hoyISO();
  const modo = H.otroDia ? 'otro' : diaDe(f, hoy);
  document.querySelectorAll('#h-dia button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.dia === modo)));
  $('h-fecha-otro').hidden = modo !== 'otro';
  const txt = f ? fechaEscrita(f, hoy) : 'elige un día';
  if ($('h-fecha-txt').textContent !== txt) $('h-fecha-txt').textContent = txt;
}
/** Pone la fecha de la hoja y deja el selector en «Hoy», «Ayer» u «Otro día» según corresponda. */
function fijarFecha(f) {
  H.otroDia = diaDe(f, hoyISO()) === 'otro';
  $('h-fecha').value = f;
  pintarFecha();
}
$('h-dia').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-dia]');
  if (!b) return;
  const hoy = hoyISO();
  if (b.dataset.dia === 'otro') {
    H.otroDia = true;
    pintarFecha();
    const inp = $('h-fecha');
    inp.focus({ preventScroll: true });
    // En pantallas táctiles el calendario se abre en el mismo toque (un toque menos); con ratón basta el campo, que ya tiene el foco.
    if (matchMedia('(pointer: coarse)').matches) { try { inp.showPicker?.(); } catch { /* el navegador no lo permite: queda el campo */ } }
  } else fijarFecha(b.dataset.dia === 'hoy' ? hoy : sumarDias(hoy, -1));
  limpiarError();
  pintarHoja();
});
hoja.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') return cerrarHoja();
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'date') { e.preventDefault(); $('guardar').click(); }
});
$('anotar').addEventListener('click', () => abrirHoja());
$('h-borrador-no').addEventListener('click', () => { borrarBorrador(); abrirHoja(); $('h-sats').focus(); });
document.querySelectorAll('[data-cerrar]').forEach((b) => b.addEventListener('click', cerrarHoja));

// Cerrar arrastrando: el dedo toma el asa o la cabecera y baja la hoja; si pasa de cierto tramo (o va rápido) se cierra,
// y si no, rebota a su sitio con un resorte. Solo cuando la hoja sube desde abajo (móvil y tablet pequeña).
const ARRASTRE_CIERRA = 110; // px
const ARRASTRE_VELOCIDAD = 0.7; // px/ms
const desdeAbajo = matchMedia('(max-width: 699px)');
{
  const panel = hoja.querySelector('.hoja-panel');
  let arrastre = null;
  const zona = (t) => t.closest('.hoja-asa, .hoja-cab') && !t.closest('button, a, input');
  panel.addEventListener('pointerdown', (e) => {
    if (!desdeAbajo.matches || !zona(e.target) || (e.pointerType === 'mouse' && e.button !== 0)) return;
    arrastre = { id: e.pointerId, y0: e.clientY, dy: 0, t0: e.timeStamp, y1: e.clientY, t1: e.timeStamp };
    panel.setPointerCapture(e.pointerId);
    panel.style.transition = 'none';
  });
  panel.addEventListener('pointermove', (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    arrastre.dy = Math.max(0, e.clientY - arrastre.y0);
    arrastre.y1 = e.clientY; arrastre.t1 = e.timeStamp;
    panel.style.transform = `translateY(${arrastre.dy}px)`;
  });
  const soltar = (e) => {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    const { dy, t0 } = arrastre;
    const v = dy / Math.max(1, e.timeStamp - t0);
    arrastre = null;
    panel.style.removeProperty('transition');
    if (e.type === 'pointercancel' || (dy < ARRASTRE_CIERRA && v < ARRASTRE_VELOCIDAD)) {
      panel.style.removeProperty('transform');
      if (dy > 2 && !reducido()) panel.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], { duration: 380, easing: 'cubic-bezier(0.2, 1.5, 0.4, 1)' });
      return;
    }
    panel.style.removeProperty('transform');
    cerrarHoja();
  };
  panel.addEventListener('pointerup', soltar);
  panel.addEventListener('pointercancel', soltar);
}

/** Guarda un traslado. Si pagaste comisión de red, se anota también como un gasto (baja tu saldo). */
async function guardarTraslado(d, fecha) {
  H.guardando = true;
  pintarHoja();
  const antes = R;
  let nota = '';
  try {
    if (H.wallet === 'nueva' || (!walletsActivas().length && H.walletNueva.trim())) {
      // La wallet nueva se crea antes del traslado; si el traslado falla, queda creada y el reintento ya no la crea otra vez.
      const w = await api('/api/wallets', { metodo: 'POST', cuerpo: { nombre: H.walletNueva.trim() } });
      S.wallets = [...S.wallets, w];
      H.wallet = String(w.id);
      H.walletNueva = '';
    }
    const wid = walletElegida();
    const t = await api('/api/traslados', { metodo: 'POST', cuerpo: { fecha, sats: d.sats, sentido: H.sentido, wallet_id: wid || null, txid: extraerTxid(H.txid), nota: H.nota.trim() } });
    S.traslados = [...S.traslados, t];
    borrarBorrador();
    resaltar(`t${t.id}`);
    const com = Number(H.comision) || 0;
    if (H.sentido === 'a_wallet' && com > 0) {
      const p = precioDelDia(fecha, S.historico, S.precio);
      if (!p) nota = ' No pude anotar la comisión (sin precio): anótala como gasto.';
      else {
        try {
          const g = normalizar(await api('/api/compras', { metodo: 'POST', cuerpo: { fecha, monto: estimarMonto(com, p.precio), sats: com, tipo: 'venta', nota: 'Comisión de retiro' } }));
          S.compras = [...S.compras, g];
          nota = ` Comisión de ${entero(com)} sats anotada como gasto.`;
        } catch (err) {
          nota = ` El traslado se guardó, pero la comisión no (${err.message}): anótala como gasto.`;
        }
      }
    }
    H.guardando = false;
    cerrarHoja();
    pintar({ montana: true, desde: antes.sats });
    const adonde = !t.wallet_id && !S.wallets.length ? 'tu wallet' : `«${nombreWallet(S.wallets, t.wallet_id)}»`;
    const textoT = `Traslado anotado: ${entero(d.sats)} sats ${H.sentido === 'a_wallet' ? `a ${adonde}` : `de ${adonde} al exchange`}.${nota}`;
    if (nota) avisar(textoT, null, true); // con comisión anotada aparte, deshacer solo el traslado dejaría el gasto: no se ofrece
    else conDeshacer(textoT, async () => {
      await api(`/api/traslados/${t.id}`, { metodo: 'DELETE' });
      S.traslados = S.traslados.filter((x) => x.id !== t.id);
      repintarTrasDeshacer('Deshecho: el traslado quedó anulado. Queda en el historial.');
    });
  } catch (err) {
    H.guardando = false;
    $('hoja-error').classList.remove('hoja-aviso');
    $('hoja-error').textContent = err.message;
    pintarHoja();
  }
}

$('guardar').addEventListener('click', async () => {
  const d = datosHoja();
  const fecha = $('h-fecha').value;
  if (!d || d.precioMal || H.guardando) return;
  if (!fecha || fecha > hoyISO()) { $('hoja-error').textContent = 'Elige una fecha de hoy o anterior.'; return; }
  if (H.tipo === 'traslado') return guardarTraslado(d, fecha);
  // Una estimación no se guarda como si fuera lo real: se pide un segundo toque (o corregir los sats).
  if (H.estimado && !confirmando()) {
    const e = $('hoja-error');
    e.textContent = 'Estos sats son una estimación con el precio de hoy, no lo que te dio el exchange. Cámbialos por los reales, o toca «Sí, guardar así» si coinciden.';
    e.classList.add('hoja-aviso');
    H.confirmadoPara = claveHoja();
    pintarHoja();
    return;
  }
  // Antes de guardar: si algo se ve raro (cifra 10 veces fuera de lo normal, compra repetida ese día), se avisa
  // una vez y se pide confirmar con un segundo toque. No bloquea: tú decides.
  if (!confirmando()) {
    const avisos = avisosAlAnotar(S.compras, { tipo: H.tipo, sats: d.sats, monto: d.monto, fecha, editando: H.editando, extra: H.tipo === 'compra' && H.extra });
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
    const cuerpo = { fecha, monto: d.monto, sats: d.sats, txid: extraerTxid(H.txid), tipo: H.tipo, nota: H.nota.trim(), extra: H.tipo === 'compra' && H.extra, etiquetas: partirEtiquetas(H.etq) };
    const g = normalizar(H.editando ? await api(`/api/compras/${H.editando}`, { metodo: 'PUT', cuerpo }) : await api('/api/compras', { metodo: 'POST', cuerpo }));
    const comprasAntes = S.compras;
    S.compras = H.editando ? S.compras.map((x) => (x.id === g.id ? g : x)) : [...S.compras, g];
    const editando = H.editando;
    borrarBorrador();
    resaltar(`c${g.id}`, { desplazar: !!editando });
    // Hitos de constancia (10 compras, 6 meses…): solo por una compra nueva, nunca al editar ni en ventas.
    const constancia = !editando && g.tipo === 'compra' ? constanciaCruzada(comprasAntes, S.compras) : [];
    H.guardando = false;
    cerrarHoja();
    // Una compra nueva se celebra en la montaña: si estás más abajo, se sube con suavidad a verla.
    const festejo = !editando && g.tipo === 'compra' ? { antes: antes.sats, delta: g.sats } : null;
    if (festejo && !reducido() && window.scrollY > 40) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      await new Promise((ok) => setTimeout(ok, 480));
    }
    pintar({ montana: true, desde: antes.sats, festejo });
    if (!editando && g.tipo === 'venta' && g.nota !== 'Comisión de retiro' && !reducido()) hundirMoneda(); // 16A: la venta queda en el lago
    if (festejo) sonarGuardado(antes.sats, R.sats); // solo si lo activaste en «Tu cuenta»
    if (festejo && !reducido()) setTimeout(() => destello(), MS_SUBIDA);
    if (S.histDesde && desdeHistorico() < S.histDesde) cargarHistorico();
    const texto = (editando ? 'Movimiento corregido.' : g.tipo === 'venta' ? `Venta anotada: −${entero(g.sats)} sats` : `Anotado: +${entero(g.sats)} sats · ${Math.floor(Math.max(0, Math.min(1, progresoEtapa())) * 100)}% del camino a ${nombreMeta(R.etapa)}`) + (g.txid_repetido?.length ? ' Ojo: ese TXID ya está en otra compra.' : '');
    // Con celebración, el aviso de abajo espera a que acabe para no tapar el sendero.
    const previa = editando ? comprasAntes.find((x) => x.id === editando) : null;
    const deshacer = editando
      ? async () => {
        const v = normalizar(await api(`/api/compras/${editando}`, { metodo: 'PUT', cuerpo: cuerpoDe(previa) }));
        S.compras = S.compras.map((x) => (x.id === v.id ? v : x));
        repintarTrasDeshacer('Cambio deshecho: vuelven los datos de antes.');
      }
      : async () => {
        await api(`/api/compras/${g.id}`, { metodo: 'DELETE' });
        S.compras = S.compras.filter((x) => x.id !== g.id);
        repintarTrasDeshacer('Deshecho: lo que anotaste quedó anulado. Queda en el historial.');
      };
    conDeshacer(texto, deshacer, festejo && !reducido() ? MS_SUBIDA + 1300 : 0);
    // Si es la primera compra de su semana, nace el sello de esa semana (campamento 13C).
    celebrar(antes, constancia, festejo ? selloNuevo(R.items, g.fecha) : null);
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
  $('d-titulo').textContent = '¿Anular esta compra?';
  $('d-texto').textContent = `${fechaLarga(c.fecha)} · ${usd(c.monto)} · ${entero(c.sats)} sats`;
  dialogo.returnValue = '';
  dialogo.showModal();
});
/** Un traslado no se edita: se anula (queda en el historial) y se vuelve a anotar bien. */
export function abrirAnularTraslado(id) {
  const t = S.traslados.find((x) => x.id === id);
  if (!t) return;
  $('d-titulo').textContent = '¿Anular este traslado?';
  const w = !t.wallet_id && !S.wallets.length ? 'tu wallet' : `«${nombreWallet(S.wallets, t.wallet_id)}»`;
  $('d-texto').textContent = `${fechaLarga(t.fecha)} · ${entero(t.sats)} sats ${t.sentido === 'a_exchange' ? `de ${w} al exchange` : `a ${w}`}`;
  dialogo.dataset.tras = String(id);
  dialogo.returnValue = '';
  dialogo.showModal();
}
dialogo.addEventListener('close', async () => {
  const tid = Number(dialogo.dataset.tras || 0);
  delete dialogo.dataset.tras;
  if (tid) {
    if (dialogo.returnValue !== 'si') return;
    try {
      await api(`/api/traslados/${tid}`, { metodo: 'DELETE' });
    } catch (err) {
      if (err.status !== 404) { avisar(err.message, null, true); return; }
    }
    const anulado = S.traslados.find((x) => x.id === tid);
    S.traslados = S.traslados.filter((x) => x.id !== tid);
    pintar();
    if (!anulado) { avisar('Traslado anulado. Queda en el historial.', null, true); return; }
    conDeshacer('Traslado anulado. Queda en el historial.', async () => {
      const t = await api('/api/traslados', { metodo: 'POST', cuerpo: { fecha: anulado.fecha, sats: anulado.sats, sentido: anulado.sentido, wallet_id: anulado.wallet_id ?? null, txid: anulado.txid ?? '', nota: anulado.nota ?? '' } });
      S.traslados = [...S.traslados, t];
      resaltar(`t${t.id}`);
      repintarTrasDeshacer('Vuelve a estar anotado el traslado.');
    });
    return;
  }
  const id = H.editando;
  if (dialogo.returnValue !== 'si' || !id) return;
  const antes = R;
  const anulada = S.compras.find((x) => x.id === id);
  try {
    await api(`/api/compras/${id}`, { metodo: 'DELETE' });
  } catch (err) {
    if (err.status !== 404) { $('hoja-error').textContent = err.message; return; }
  }
  S.compras = S.compras.filter((x) => x.id !== id);
  H.origen = $('t-compras');
  cerrarHoja();
  pintar({ montana: true, desde: antes.sats });
  if (!anulada) { avisar('Compra anulada. Queda en el historial.', null, true); return; }
  conDeshacer(`${anulada.tipo === 'venta' ? 'Venta' : 'Compra'} anulada. Queda en el historial.`, async () => {
    const g = normalizar(await api('/api/compras', { metodo: 'POST', cuerpo: cuerpoDe(anulada) }));
    S.compras = [...S.compras, g];
    resaltar(`c${g.id}`);
    repintarTrasDeshacer('Vuelve a estar anotada. En el historial queda como una anotación nueva.');
  });
});
