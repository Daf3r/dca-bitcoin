import { entero, fechaCorta, mempoolUrl, pct, usd, usd0, usdSigno } from './lib.js';
import { $, R, S, api, esAdmin } from './estado.js';
import { abrirAnularTraslado, abrirHoja, esc } from './hoja.js';

// ----------------------------------------------------------------- lista
const VISIBLES = 8;
/** Una fila de traslado: no es compra ni venta, solo mueve sats entre el exchange y tu wallet. */
function htmlTraslado(t) {
  const aW = t.sentido === 'a_wallet';
  const etiqueta = esAdmin() ? 'button type="button"' : 'div';
  const cierre = esAdmin() ? 'button' : 'div';
  return `<li><${etiqueta} class="fila" data-tras="${t.id}" data-tipo="traslado">` +
    (esAdmin() ? '<span class="sr">Ver el traslado del </span>' : '') + `<span class="f-fecha">${fechaCorta(t.fecha)}</span>` +
    `<span class="f-sats">⇄ ${entero(t.sats)} <small>sats</small></span>` +
    `<span class="f-det">${aW ? 'Traslado a tu wallet' : 'Traslado de tu wallet al exchange'}${t.nota ? ` · ${esc(t.nota)}` : ''}</span>` +
    `<span class="f-var"></span></${cierre}>` +
    (mempoolUrl(t.txid) ? `<div class="f-txw"><a class="f-tx" href="${mempoolUrl(t.txid)}" target="_blank" rel="noopener noreferrer">Ver en mempool.space <span aria-hidden="true">↗</span><span class="sr"> (se abre en otra pestaña)</span></a><span class="f-est" data-txid="${t.txid}"></span></div>` : '') + '</li>';
}
export function pintarLista() {
  const host = $('lista');
  $('csv-out').hidden = !R.n;
  if (!R.n) {
    host.innerHTML = `<li class="vacio">${!S.cargado ? 'Cargando compras…' : S.errorCarga ? 'No se pudieron cargar tus compras.' : 'Aún no hay compras. Anota la primera o importa un CSV.'}</li>`;
    $('ver-todas').hidden = true;
    return;
  }
  const enFoco = document.activeElement?.closest?.('#lista .fila')?.dataset.id;
  // Compras, ventas y traslados en una sola lista, lo más reciente primero (a igual fecha, lo último que anotaste).
  const recientes = [...R.items.map((c) => ({ c })), ...S.traslados.map((t) => ({ t }))]
    .sort((a, b) => { const x = a.c ?? a.t, y = b.c ?? b.t; return x.fecha === y.fecha ? y.creado - x.creado : x.fecha < y.fecha ? 1 : -1; });
  const mostradas = S.verTodas ? recientes : recientes.slice(0, VISIBLES);
  host.innerHTML = mostradas.map((fila) => {
    if (fila.t) return htmlTraslado(fila.t);
    const c = fila.c;
    const venta = c.tipo === 'venta';
    // Compra: cómo va frente al precio de hoy. Venta: la ganancia que realizó.
    const v = venta ? c.realizada : S.precio ? (S.precio / c.precio - 1) * 100 : null;
    const textoV = v == null ? '' : venta ? usdSigno(v) : pct(v);
    const etiqueta = esAdmin() ? 'button type="button"' : 'div';
    return `<li><${etiqueta} class="fila" data-id="${c.id}" data-tipo="${venta ? 'venta' : 'compra'}">` +
      (esAdmin() ? `<span class="sr">Editar la ${venta ? 'venta' : 'compra'} del </span>` : '') + `<span class="f-fecha">${fechaCorta(c.fecha)}</span>` +
      `<span class="f-sats">${venta ? '−' : '+'}${entero(c.sats)} <small>sats</small></span>` +
      `<span class="f-det">${venta ? 'Venta · ' : ''}${c.extra ? '<b class="f-extra">Extra</b> · ' : ''}${usd(c.monto)} a ${usd0(c.precio)}${c.nota ? ` · ${esc(c.nota)}` : ''}</span>` +
      `<span class="f-var"${v == null ? '' : ` data-tono="${v >= 0 ? 'sube' : 'baja'}"`}>${textoV}</span></${esAdmin() ? 'button' : 'div'}>` +
      (mempoolUrl(c.txid) ? `<div class="f-txw"><a class="f-tx" href="${mempoolUrl(c.txid)}" target="_blank" rel="noopener noreferrer">Ver en mempool.space <span aria-hidden="true">↗</span><span class="sr"> (se abre en otra pestaña)</span></a><span class="f-est" data-txid="${c.txid}"></span></div>` : '') + '</li>';
  }).join('');
  const vt = $('ver-todas');
  vt.hidden = mostradas.length >= recientes.length;
  vt.textContent = `Ver los ${recientes.length} movimientos`;
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
  if (!b || !esAdmin()) return;
  if (b.dataset.tras) abrirAnularTraslado(Number(b.dataset.tras));
  else abrirHoja(Number(b.dataset.id));
});
$('ver-todas').addEventListener('click', () => {
  S.verTodas = true;
  pintarLista();
  $('lista').querySelectorAll('.fila')[VISIBLES]?.focus();
});
