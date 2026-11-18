import { comprobante, entero, fechaEscrita, mempoolUrl, nombreHito, nombreWallet, pct, piedritasPorCompra, textoPiedritas, usd, usd0, usdSigno } from './lib.js';
import { apacheta } from './arte.js';
import { selloSemana } from './arte-sellos.js';
import { copiarTexto } from './copiar.js';
import { ico } from './iconos.js';
import { $, R, S, esAdmin, vozLibro } from './estado.js';
import { abrirAnularTraslado, abrirHoja } from './hoja.js';
import { estadoDeTx } from './lista.js';

// Comprobante de cada movimiento (campamento 18, idea 17): tocar una fila de la lista abre su ficha en papel, para quien anota y para
// quien solo mira. Reúne lo que ya se sabe de ese movimiento (número, sats, precio de ese día, altitud antes y después, sello de la
// semana, nota, TXID y piedritas); no calcula nada nuevo ni recomienda nada. Editar (o anular un traslado) queda a un toque más,
// dentro del comprobante. Todo lo que escribió una persona (nota, etiquetas, nombre de la wallet) entra con `textContent`.
const dlg = $('d-comp');
let abierto = null; // { clave } del movimiento a la vista

const nodo = (etiqueta, clase, texto) => {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto != null) el.textContent = texto;
  return el;
};
/** Un renglón del comprobante: rótulo, puntos y valor (el valor puede ser texto o un nodo). */
function fila(dl, rotulo, valor) {
  const d = nodo('div', 'cp-fila');
  const dd = nodo('dd');
  if (valor instanceof Node) dd.append(valor); else dd.textContent = valor;
  d.append(nodo('dt', '', rotulo), dd);
  dl.append(d);
  return dd;
}
const txCorto = (t) => `${t.slice(0, 8)}…${t.slice(-6)}`;
/** El TXID: abreviado, su estado en la cadena (lo consulta el servidor; aquí solo se pinta) y los botones de ver y copiar. */
function pintarTx(txid) {
  const caja = $('cp-tx');
  caja.hidden = !mempoolUrl(txid);
  caja.textContent = '';
  if (caja.hidden) return;
  const cab = nodo('p', 'cp-tx-cab');
  const est = nodo('span', 'cp-tx-est');
  cab.append(nodo('span', 'cp-k', 'TXID'), nodo('code', '', txCorto(txid)), est);
  const bot = nodo('p', 'cp-tx-bot');
  const ver = nodo('a', 'cp-enlace');
  ver.href = mempoolUrl(txid); ver.target = '_blank'; ver.rel = 'noopener noreferrer';
  ver.innerHTML = `Ver en mempool.space ${ico('externo')}<span class="sr"> (se abre en otra pestaña)</span>`;
  const copiar = nodo('button', 'cp-enlace');
  copiar.type = 'button';
  copiar.innerHTML = `${ico('copiar')} Copiar TXID`;
  copiar.addEventListener('click', async () => avisarEnPapel((await copiarTexto(txid)) ? 'TXID copiado' : 'No se pudo copiar el TXID'));
  bot.append(ver, copiar);
  caja.append(cab, bot);
  const clave = abierto?.clave;
  estadoDeTx(txid).then((t) => { if (t && abierto?.clave === clave) est.textContent = t.txt; });
}
/** Un aviso corto dentro del comprobante (el aviso de la página queda detrás del diálogo). */
function avisarEnPapel(texto) {
  const a = $('cp-aviso');
  a.textContent = texto;
  setTimeout(() => { if (a.textContent === texto) a.textContent = ''; }, 2500);
}
/** La regla de la etapa: dónde estaba el saldo antes de este movimiento y dónde quedó (solo compras). */
function pintarAltitud(c) {
  const caja = $('cp-alt');
  caja.hidden = c.tipo !== 'compra';
  if (caja.hidden) return;
  caja.style.setProperty('--p', c.p.toFixed(3));
  caja.style.setProperty('--q', c.q.toFixed(3));
  const meta = (m) => (m >= 1e8 ? nombreHito(m) : `${nombreHito(m)} sats`);
  $('cp-alt-t').textContent = c.etapa ? `Con esta compra ${vozLibro() ? 'el libro llegó' : 'llegaste'} a ${meta(c.etapa)}.`
    : `De ${Math.round(c.p * 100)} % a ${Math.round(c.q * 100)} % del camino a ${meta(c.meta)}.`;
}

function pintarCompra(c) {
  const venta = c.tipo === 'venta';
  const libro = vozLibro();
  $('cp-t').textContent = venta ? `Venta o gasto n.º ${c.numero}` : `Compra n.º ${c.numero}`;
  $('cp-fecha').textContent = fechaEscrita(c.fecha, ''); // sin «hoy» con que comparar: siempre con su año
  const sats = $('cp-sats');
  sats.textContent = '';
  sats.append(nodo('b', '', `${venta ? '−' : '+'}${entero(c.sats)}`), nodo('small', '', ' sats'));
  $('cp-extra').hidden = !c.extra;
  const dl = $('cp-datos');
  dl.textContent = '';
  fila(dl, venta ? (libro ? 'Se recibió' : 'Recibiste') : libro ? 'Se pagó' : 'Pagaste', usd(c.monto));
  // El precio con que quedó guardado (dólares ÷ sats): el que se escribió o el estimado con el del día. No se guarda cuál fue, así que el
  // renglón no dice «ese día» (sonaba al precio de mercado) sino de qué movimiento es.
  fila(dl, venta ? 'Precio de BTC en la venta' : 'Precio de BTC en la compra', usd0(c.precio));
  fila(dl, 'Altitud antes', `${entero(c.antes)} sats`);
  fila(dl, 'Altitud después', `${entero(c.despues)} sats`);
  if (venta && c.realizada != null) fila(dl, 'Ganancia realizada', usdSigno(c.realizada));
  if (c.hoy) {
    // Tinta neutra con flecha y signo, como en la lista (campamento 17): informa, no alarma.
    const v = nodo('span', 'cp-hoy');
    const plano = Math.abs(c.hoy.variacion) < 0.05;
    v.innerHTML = `${usd(c.hoy.valor)} <span class="cp-var">${plano ? '' : `${ico(c.hoy.variacion > 0 ? 'sube' : 'baja')}<span class="sr">${c.hoy.variacion > 0 ? 'sube' : 'baja'} </span>`}${pct(c.hoy.variacion)}</span>`;
    fila(dl, 'Hoy valen', v);
  }
  pintarAltitud(c);
  const nota = $('cp-nota');
  nota.hidden = !c.nota;
  nota.textContent = c.nota ? `«${c.nota}»` : '';
  const etq = $('cp-etq');
  etq.hidden = !c.etiquetas.length;
  etq.replaceChildren(...c.etiquetas.map((e) => nodo('li', '', e)));
  const sello = $('cp-sello');
  sello.hidden = !c.sello;
  if (c.sello) {
    // Los ids del dibujo salen de `idx`: se le da uno propio para no repetir los del pasaporte de «Tu historia».
    $('cp-sello-ico').innerHTML = selloSemana({ ...c.sello, idx: `cp${c.sello.idx}` });
    $('cp-sello-t').textContent = `Sello de la semana n.º ${c.sello.numero}`;
    $('cp-sello-d').textContent = `${c.sello.nombre}${c.primeraDeSemana ? ' · nació con esta compra' : ''}`;
  }
  pintarTx(c.txid);
  const pie = venta ? [] : (piedritasPorCompra(S.piedritas).get(c.id) ?? []);
  $('cp-pie').hidden = !pie.length;
  if (pie.length) { $('cp-pie-ico').innerHTML = apacheta(pie.length); $('cp-pie-t').textContent = `${textoPiedritas(pie)}.`; }
  const ed = $('cp-editar');
  ed.hidden = !esAdmin();
  ed.textContent = 'Editar';
}
function pintarTraslado(t) {
  const aW = t.sentido === 'a_wallet';
  const w = !S.wallets.length && !t.wallet_id ? (vozLibro() ? 'la wallet' : 'tu wallet') : (t.wallet_id ? `«${nombreWallet(S.wallets, t.wallet_id)}»` : 'Mi wallet');
  $('cp-t').textContent = 'Traslado';
  $('cp-fecha').textContent = fechaEscrita(t.fecha, '');
  const sats = $('cp-sats');
  sats.textContent = '';
  sats.append(nodo('b', '', entero(t.sats)), nodo('small', '', ' sats'));
  $('cp-extra').hidden = true;
  const dl = $('cp-datos');
  dl.textContent = '';
  fila(dl, 'Salieron de', aW ? 'el exchange' : w);
  fila(dl, 'Llegaron a', aW ? w : 'el exchange');
  fila(dl, 'El saldo', 'no cambia');
  $('cp-alt').hidden = true;
  const nota = $('cp-nota');
  nota.hidden = !t.nota;
  nota.textContent = t.nota ? `«${t.nota}»` : '';
  $('cp-etq').hidden = true;
  $('cp-sello').hidden = true;
  $('cp-pie').hidden = true;
  pintarTx(t.txid);
  const ed = $('cp-editar');
  ed.hidden = !esAdmin();
  ed.textContent = 'Anular';
}

/** Abre el comprobante de un movimiento de la lista: `c<id>` (compra o venta) o `t<id>` (traslado). */
export function abrirComprobante(clave) {
  const id = Number(clave.slice(1));
  $('cp-aviso').textContent = '';
  abierto = { clave };
  if (clave[0] === 't') {
    const t = S.traslados.find((x) => x.id === id);
    if (!t) return;
    pintarTraslado(t);
  } else {
    const c = comprobante(R.items, id, { precio: S.precio });
    if (!c) return;
    pintarCompra(c);
  }
  dlg.dataset.tipo = clave[0] === 't' ? 'traslado' : 'compra';
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
}
/** La fila de la que salió: al cerrar, el foco vuelve ahí aunque la lista se haya repintado entre tanto (el precio llega cada 30 s). */
function filaDe(clave) {
  return document.querySelector(clave[0] === 't' ? `#lista .fila[data-tras="${clave.slice(1)}"]` : `#lista .fila[data-id="${clave.slice(1)}"]`);
}
dlg.addEventListener('close', () => {
  const clave = abierto?.clave;
  abierto = null;
  if (clave && !document.querySelector('dialog[open]') && $('hoja').hidden) filaDe(clave)?.focus({ preventScroll: true });
});
$('cp-cerrar').addEventListener('click', () => dlg.close());
// Tocar fuera del diálogo (el fondo oscuro) también cierra.
dlg.addEventListener('click', (e) => {
  if (e.target !== dlg) return;
  const r = dlg.getBoundingClientRect();
  if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dlg.close();
});
$('cp-editar').addEventListener('click', () => {
  const clave = abierto?.clave;
  if (!clave || !esAdmin()) return;
  dlg.close();
  filaDe(clave)?.focus({ preventScroll: true }); // la hoja devuelve el foco a quien lo tenía al abrirse: la fila
  if (clave[0] === 't') abrirAnularTraslado(Number(clave.slice(1)));
  else abrirHoja(Number(clave.slice(1)));
});
