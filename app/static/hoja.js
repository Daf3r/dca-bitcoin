import { avisosAlAnotar, constanciaCruzada, costoTrasCompra, entero, estimarMonto, extraerTxid, fechaCorta, fechaLarga, hoyISO, montoHabitual, pct, precioDelDia, usd, usd0, walletNeto } from './lib.js';
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
const H = { tipo: 'compra', nota: '', sats: '', usd: '', txid: '', extra: false, sentido: 'a_wallet', comision: '', usdTocado: false, editando: null, guardando: false, origen: null, confirmadoPara: '', estimado: false };
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
const cuerpoDe = (c) => ({ fecha: c.fecha, monto: c.monto, sats: c.sats, txid: c.txid ?? '', tipo: c.tipo, nota: c.nota ?? '', extra: c.tipo === 'compra' && !!c.extra });
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
  const { tipo, sats, usd, nota, txid, extra, sentido, comision } = H;
  try {
    if (!sats && !usd && !nota && !txid && !comision) localStorage.removeItem(CLAVE_BORRADOR);
    else localStorage.setItem(CLAVE_BORRADOR, JSON.stringify({ t: Date.now(), tipo, sats, usd, nota, txid, extra, sentido, comision }));
  } catch { /* sin almacenamiento: no hay borrador */ }
}
hoja.addEventListener('input', guardarBorrador);
hoja.addEventListener('change', guardarBorrador);
hoja.addEventListener('click', (e) => { if (e.target.closest('#h-tipo, #h-sentido')) guardarBorrador(); });

export function abrirHoja(id = null, tipoInicial = 'compra') {
  const c = id ? S.compras.find((x) => x.id === id) : null;
  Object.assign(H, { editando: c?.id ?? null, usdTocado: false, guardando: false, origen: document.activeElement, confirmadoPara: '', estimado: false });
  H.sats = c ? String(c.sats) : '';
  H.usd = c ? String(c.monto) : '';
  H.txid = c?.txid ?? '';
  H.tipo = c?.tipo ?? (['venta', 'traslado'].includes(tipoInicial) ? tipoInicial : 'compra');
  H.nota = c?.nota ?? '';
  H.extra = !!c?.extra;
  H.sentido = 'a_wallet';
  H.comision = '';
  const b = !c && tipoInicial === 'compra' ? leerBorrador() : null;
  if (b) Object.assign(H, { tipo: b.tipo, sats: b.sats ?? '', usd: b.usd ?? '', usdTocado: !!b.usd, nota: b.nota ?? '', txid: b.txid ?? '', extra: !!b.extra, sentido: b.sentido ?? 'a_wallet', comision: b.comision ?? '' });
  $('h-borrador').hidden = !b;
  $('h-comision').value = H.comision ? entero(Number(H.comision)) : '';
  $('h-nota').value = H.nota;
  $('h-nota-c').value = H.nota;
  $('h-extra').checked = H.extra;
  $('h-tipo').hidden = !!c;
  $('h-txid').value = H.txid;
  $('h-sats').value = H.sats ? entero(Number(H.sats)) : '';
  $('h-usd').value = H.usd;
  $('h-avanzado').open = !!c || !!(b && (b.usd || b.txid || b.extra || b.comision));
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
  if (H.tipo === 'traslado') return { sats, traslado: true }; // no lleva dólares ni precio
  const u = Number(H.usd) || 0;
  if (u > 0) return { sats, monto: u, precio: (u * 1e8) / sats, exacto: true };
  const p = precioDelDia($('h-fecha').value, S.historico, S.precio);
  if (!p) return { sats, sinPrecio: true };
  return { sats, monto: estimarMonto(sats, p.precio), precio: p.precio, fuente: p.fuente, dia: p.dia };
}
/** «Compra de siempre»: tu monto habitual en dólares convertido a sats con el precio de hoy. Solo una estimación hasta que escribas lo real. */
function compraDeSiempre() {
  const usdHabitual = S.precio ? montoHabitual(R.items) : null;
  return usdHabitual ? { usd: usdHabitual, sats: Math.round((usdHabitual / S.precio) * 1e8) } : null;
}
$('h-habitual').addEventListener('click', () => {
  const h = compraDeSiempre();
  if (!h) return;
  Object.assign(H, { sats: String(h.sats), usd: '', usdTocado: false, estimado: true });
  $('h-sats').value = entero(h.sats);
  $('h-usd').value = '';
  $('h-fecha').value = hoyISO(); // la compra de siempre es la de hoy
  limpiarError();
  pintarHoja();
  guardarBorrador();
  $('h-sats').focus();
  $('h-sats').select();
});

/** Lo que se va a guardar, para saber si el aviso ya confirmado sigue valiendo (si cambias algo, vuelve a avisar). */
const claveHoja = () => `${H.tipo}|${H.sats}|${$('h-fecha').value}|${H.extra}`;
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
  $('h-nota-l').hidden = !(H.tipo === 'venta' || tras);
  $('h-nota').placeholder = tras ? 'Por ejemplo: a mi Ledger' : 'Por ejemplo: gasté en renta';
  document.querySelectorAll('#h-avanzado [data-solo-compra]').forEach((el) => { el.hidden = H.tipo !== 'compra'; });
  document.querySelectorAll('#h-avanzado [data-no-traslado]').forEach((el) => { el.hidden = tras; });
  document.querySelectorAll('#h-avanzado [data-solo-traslado]').forEach((el) => { el.hidden = !tras || H.sentido !== 'a_wallet'; });
  document.querySelectorAll('#h-tipo button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tipo === H.tipo)));
  document.querySelectorAll('#h-sentido button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.sentido === H.sentido)));
}
/** Traslado: el saldo total no cambia, solo cambia dónde están los sats. */
function pintarHojaTraslado() {
  const d = datosHoja();
  const aWallet = H.sentido === 'a_wallet';
  const neto = walletNeto(S.traslados);
  $('hoja-t').textContent = aWallet ? 'Traslado a tu wallet' : 'Traslado de tu wallet al exchange';
  $('h-sats-l').textContent = aWallet ? 'Sats que llegaron a tu wallet' : 'Sats que salieron de tu wallet';
  const falla = !!d && (aWallet ? neto + d.sats > R.sats : d.sats > neto);
  const enWallet = d ? Math.max(0, neto + (aWallet ? d.sats : -d.sats)) : neto;
  $('hoja-calc').textContent = !d ? (aWallet ? 'Escribe los sats que te llegaron a la wallet. El saldo total no cambia: solo cambia dónde están.' : 'Escribe los sats que sacaste de tu wallet hacia el exchange.')
    : falla ? (aWallet ? `No tienes tantos sats: tu saldo es ${entero(R.sats)} y ya tienes ${entero(neto)} en la wallet.` : `No tienes tantos sats en tu wallet: tienes ${entero(neto)}.`)
      : `Quedarán ${entero(enWallet)} sats en tu wallet y ${entero(Math.max(0, R.sats - enWallet))} en el exchange.`;
  $('guardar').disabled = !d || falla || H.guardando;
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
  const venta = H.tipo === 'venta';
  const previa = H.editando ? S.compras.find((x) => x.id === H.editando) : null;
  // Saldo sin el movimiento que se edita (una venta editada devuelve sus sats, una compra editada los quita).
  const saldo = R.sats - (previa ? (previa.tipo === 'venta' ? -previa.sats : previa.sats) : 0);
  const sinSaldo = venta && d && d.sats > saldo;
  $('hoja-t').textContent = venta ? (H.editando ? 'Editar venta' : 'Registrar venta o gasto') : H.editando ? 'Editar compra' : 'Anotar compra';
  $('h-sats-l').textContent = venta ? 'Sats que salieron' : 'Sats que recibiste';
  const resto = d && !d.sinPrecio ? saldo + (venta ? -d.sats : d.sats) : 0;
  const habitual = !venta && S.precio ? montoHabitual(R.items) : null;
  const referencia = habitual ? ` Hoy ${usd0(habitual)} son ≈ ${entero((habitual / S.precio) * 1e8)} sats ($1 = ${entero(1e8 / S.precio)} sats).` : '';
  const estimado = H.estimado ? 'Estimación con el precio de hoy: cámbiala por lo que recibiste. ' : '';
  $('hoja-calc').textContent = estimado + (!d ? (venta ? 'Escribe los sats que salieron; los dólares se calculan solos con el precio del día.' : `Escribe los sats que recibiste; los dólares se calculan solos con el precio del día.${referencia}`)
    : d.sinPrecio ? 'Sin precio disponible ahora: abre «Más detalles» y escribe los dólares.'
      : sinSaldo ? `No tienes tantos sats: tu saldo es ${entero(saldo)}.`
        : `${d.exacto ? '' : '≈ '}${usd(d.monto)}${venta ? ' por la venta' : ''} · 1 BTC a ${usd0(d.precio)}${d.fuente === 'cierre' ? ` (cierre del ${fechaCorta(d.dia)})` : d.fuente === 'hoy' ? ' (sin precio de ese día: uso el de hoy)' : ''} · saldo ${entero(resto)} sats`);
  // El «ajuste» del DCA: cómo mueve esta compra tu costo promedio (solo al crear una compra con precio).
  const c = d && !d.sinPrecio && !venta && !H.editando ? costoTrasCompra(R, d.monto, d.sats) : null;
  if (c) {
    const s = document.createElement('span');
    s.className = 'costo';
    s.dataset.tono = c.despues < c.antes ? 'sube' : '';
    s.textContent = Math.abs(c.cambio) < 0.05 ? `Tu costo promedio casi no cambia (${usd0(c.antes)}).`
      : `Tu costo promedio ${c.despues < c.antes ? 'baja' : 'sube'} de ${usd0(c.antes)} a ${usd0(c.despues)} (${pct(c.cambio)}).`;
    $('hoja-calc').append(s);
  }
  $('guardar').disabled = !d || d.sinPrecio || sinSaldo || H.guardando;
  $('guardar').textContent = H.guardando ? 'Guardando…' : confirmando() ? 'Sí, guardar así' : H.editando ? 'Guardar cambios' : venta ? 'Guardar venta' : 'Guardar';
}
$('h-tipo').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) { H.tipo = b.dataset.tipo; $('h-nota').value = H.nota; $('h-nota-c').value = H.nota; limpiarError(); pintarHoja(); }
});
$('h-nota').addEventListener('input', (e) => { H.nota = e.target.value; });
$('h-nota-c').addEventListener('input', (e) => { H.nota = e.target.value; });
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
    const t = await api('/api/traslados', { metodo: 'POST', cuerpo: { fecha, sats: d.sats, sentido: H.sentido, txid: extraerTxid(H.txid), nota: H.nota.trim() } });
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
    const textoT = `Traslado anotado: ${entero(d.sats)} sats ${H.sentido === 'a_wallet' ? 'a tu wallet' : 'al exchange'}.${nota}`;
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
  if (!d || H.guardando) return;
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
    const cuerpo = { fecha, monto: d.monto, sats: d.sats, txid: extraerTxid(H.txid), tipo: H.tipo, nota: H.nota.trim(), extra: H.tipo === 'compra' && H.extra };
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
    if (festejo) sonarGuardado(antes.sats, R.sats); // solo si lo activaste en «Tu cuenta»
    if (festejo && !reducido()) setTimeout(() => destello(), MS_SUBIDA);
    if (S.histDesde && desdeHistorico() < S.histDesde) cargarHistorico();
    const texto = (editando ? 'Movimiento corregido.' : g.tipo === 'venta' ? `Venta registrada: −${entero(g.sats)} sats` : `Anotado: +${entero(g.sats)} sats · ${Math.floor(Math.max(0, Math.min(1, progresoEtapa())) * 100)}% del camino a ${nombreMeta(R.etapa)}`) + (g.txid_repetido?.length ? ' Ojo: ese TXID ya está en otra compra.' : '');
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
    celebrar(antes, constancia);
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
  $('d-texto').textContent = `${fechaLarga(t.fecha)} · ${entero(t.sats)} sats ${t.sentido === 'a_exchange' ? 'de tu wallet al exchange' : 'a tu wallet'}`;
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
      const t = await api('/api/traslados', { metodo: 'POST', cuerpo: { fecha: anulado.fecha, sats: anulado.sats, sentido: anulado.sentido, txid: anulado.txid ?? '', nota: anulado.nota ?? '' } });
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
