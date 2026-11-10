import { agruparPorMes, entero, fechaCorta, fechaLarga, filtrarMovimientos, mempoolUrl, movimientosLista, ordenarMovimientos, pct, usd, usd0, usdSigno } from './lib.js';
import { avisar } from './avisar.js';
import { copiarTexto } from './copiar.js';
import { $, R, S, api, esAdmin, normalizar, reducido } from './estado.js';
import { abrirAnularTraslado, abrirHoja, esc } from './hoja.js';
import { pintar } from './pintar.js';

// ----------------------------------------------------------------- lista
// Compras, ventas y traslados en una sola lista, agrupada por mes, con búsqueda, filtros y orden (solo cambian lo que se ve aquí:
// los totales de la pantalla son siempre los de todo) y «Ver más» para no pintar cientos de filas de una vez.
const INICIAL = 8;
const PASO = 25;
const CLAVE_ORDEN = 'libro.lista.orden';
const ORDENES = ['recientes', 'antiguas', 'monto', 'sats'];
function ordenGuardado() {
  try { const o = localStorage.getItem(CLAVE_ORDEN); return ORDENES.includes(o) ? o : 'recientes'; } catch { return 'recientes'; }
}
const F = { texto: '', filtro: 'todos', desde: '', hasta: '', orden: ordenGuardado(), limite: INICIAL };
const hayFiltros = () => !!(F.texto.trim() || F.filtro !== 'todos' || F.desde || F.hasta);
function quitarFiltros() {
  Object.assign(F, { texto: '', filtro: 'todos', desde: '', hasta: '', limite: INICIAL });
  $('l-buscar').value = ''; $('l-desde').value = ''; $('l-hasta').value = '';
  document.querySelectorAll('#l-chips button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === 'todos')));
}

/** Los traslados llevan su propia línea; el botón de TXID y el de la nota van en una fila aparte, hermana del botón de editar (no anidados). */
function htmlExtras(m) {
  const partes = [];
  if (mempoolUrl(m.txid)) {
    partes.push(`<a class="f-tx" href="${mempoolUrl(m.txid)}" target="_blank" rel="noopener noreferrer">Ver en mempool.space <span aria-hidden="true">↗</span><span class="sr"> (se abre en otra pestaña)</span></a><span class="f-est" data-txid="${m.txid}"></span>`);
    partes.push(`<button type="button" class="f-copiar" data-txid="${m.txid}">Copiar TXID</button>`);
  }
  if (esAdmin() && m.tipo !== 'traslado' && m.nota) partes.push(`<button type="button" class="f-nota-b" data-id="${m.id}">Editar nota</button>`);
  return partes.length ? `<div class="f-txw">${partes.join('')}</div>` : '';
}
/** Una fila de traslado: no es compra ni venta, solo mueve sats entre el exchange y tu wallet. */
function htmlTraslado(m) {
  const t = m.ref;
  const aW = t.sentido === 'a_wallet';
  const etiqueta = esAdmin() ? 'button type="button"' : 'div';
  const cierre = esAdmin() ? 'button' : 'div';
  return `<li data-clave="${m.clave}"><${etiqueta} class="fila" data-tras="${t.id}" data-tipo="traslado">` +
    (esAdmin() ? '<span class="sr">Ver el traslado del </span>' : '') + `<span class="f-fecha">${fechaCorta(t.fecha)}</span>` +
    `<span class="f-sats">⇄ ${entero(t.sats)} <small>sats</small></span>` +
    `<span class="f-det">${aW ? 'Traslado a tu wallet' : 'Traslado de tu wallet al exchange'}${t.nota ? ` · ${esc(t.nota)}` : ''}</span>` +
    `<span class="f-var"></span></${cierre}>${htmlExtras(m)}</li>`;
}
function htmlFila(m) {
  if (m.tipo === 'traslado') return htmlTraslado(m);
  const c = m.ref;
  const venta = c.tipo === 'venta';
  // Compra: cómo va frente al precio de hoy. Venta: la ganancia que realizó.
  const v = venta ? c.realizada : S.precio ? (S.precio / c.precio - 1) * 100 : null;
  const textoV = v == null ? '' : venta ? usdSigno(v) : pct(v);
  const etiqueta = esAdmin() ? 'button type="button"' : 'div';
  return `<li data-clave="${m.clave}"><${etiqueta} class="fila" data-id="${c.id}" data-tipo="${venta ? 'venta' : 'compra'}">` +
    (esAdmin() ? `<span class="sr">Editar la ${venta ? 'venta' : 'compra'} del </span>` : '') + `<span class="f-fecha">${fechaCorta(c.fecha)}</span>` +
    `<span class="f-sats">${venta ? '−' : '+'}${entero(c.sats)} <small>sats</small></span>` +
    `<span class="f-det">${venta ? 'Venta · ' : ''}${c.extra ? '<b class="f-extra">Extra</b> · ' : ''}${usd(c.monto)} a ${usd0(c.precio)}${c.nota ? ` · ${esc(c.nota)}` : ''}</span>` +
    `<span class="f-var"${v == null ? '' : ` data-tono="${v >= 0 ? 'sube' : 'baja'}"`}>${textoV}</span></${esAdmin() ? 'button' : 'div'}>${htmlExtras(m)}</li>`;
}

// Resalte de lo recién guardado: cuando la fila se ve por primera vez, brilla un momento (aunque se guarde con la vista arriba).
let resalte = null; // { clave, desplazar, hasta }
/** Pide resaltar un movimiento en la lista (y, al editar, llevarlo a la vista). */
export function resaltar(clave, { desplazar = false } = {}) { resalte = { clave, desplazar, hasta: Date.now() + 5 * 60_000 }; }
let observador = null;
function aplicarResalte(host) {
  observador?.disconnect();
  if (!resalte) return;
  if (Date.now() > resalte.hasta) { resalte = null; return; }
  const li = host.querySelector(`li[data-clave="${resalte.clave}"]`);
  if (!li) return;
  if (resalte.desplazar) { li.scrollIntoView({ block: 'center', behavior: reducido() ? 'auto' : 'smooth' }); resalte.desplazar = false; }
  observador = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    observador.disconnect();
    resalte = null;
    li.classList.add('resalte');
    setTimeout(() => li.classList.remove('resalte'), 2600);
  }, { threshold: 0.6 });
  observador.observe(li);
}

let previas = null; // lo último que se pintó, para animar lo que entra y lo que sale cuando solo cambian los datos
const MAX_ANIMADAS = 3;
function reordenarAnimado(host, viejos, filas, firma) {
  const claves = filas.map((m) => m.clave);
  if (previas && previas.firma === firma && !reducido()) {
    const nuevas = claves.filter((k) => !previas.claves.includes(k));
    const idos = previas.claves.filter((k) => !claves.includes(k));
    if (nuevas.length + idos.length <= MAX_ANIMADAS) {
      for (const k of nuevas) host.querySelector(`li[data-clave="${k}"]`)?.classList.add('entra');
      for (const k of idos) {
        const v = viejos.get(k);
        if (!v) continue;
        const g = v.node.cloneNode(true);
        g.classList.add('sale');
        g.inert = true;
        g.setAttribute('aria-hidden', 'true');
        host.insertBefore(g, host.children[v.idx] ?? null);
        const quitar = () => g.remove();
        g.addEventListener('animationend', quitar);
        setTimeout(quitar, 700);
      }
    }
  }
  previas = { firma, claves };
}

/** Lo que se ve ahora: todos los movimientos, filtrados y en el orden elegido. */
function movimientosVisibles() {
  const todos = movimientosLista(R.items, S.traslados);
  return { todos, vistos: ordenarMovimientos(filtrarMovimientos(todos, F), F.orden) };
}
export function pintarLista() {
  const host = $('lista');
  $('csv-out').hidden = !R.n;
  $('l-tabla').hidden = !R.n;
  if (host.querySelector('.f-notaed')) return; // se está editando una nota: no se la quitamos de debajo del dedo
  if (!R.n) {
    host.innerHTML = `<li class="vacio">${!S.cargado ? 'Cargando compras…' : S.errorCarga ? 'No se pudieron cargar tus compras.' : 'Aún no hay compras. Anota la primera o importa un CSV.'}</li>`;
    $('ver-todas').hidden = true;
    $('l-ctl').hidden = true;
    previas = null;
    return;
  }
  let { todos, vistos } = movimientosVisibles();
  const controles = todos.length > INICIAL;
  $('l-ctl').hidden = !controles;
  if (!controles && hayFiltros()) { quitarFiltros(); ({ todos, vistos } = movimientosVisibles()); }
  // Lo recién guardado siempre se ve: si un filtro lo esconde se quitan, y si queda más allá del tramo, se amplía.
  if (resalte) {
    if (!vistos.some((m) => m.clave === resalte.clave) && todos.some((m) => m.clave === resalte.clave)) { quitarFiltros(); ({ vistos } = movimientosVisibles()); }
    const i = vistos.findIndex((m) => m.clave === resalte.clave);
    if (i >= F.limite) F.limite = i + 1;
  }
  const enFoco = document.activeElement?.closest?.('#lista .fila');
  const foco = enFoco && (enFoco.dataset.id ? `[data-id="${enFoco.dataset.id}"]` : `[data-tras="${enFoco.dataset.tras}"]`);
  const viejos = new Map([...host.querySelectorAll('li[data-clave]')].map((li) => [li.dataset.clave, { node: li, idx: [...host.children].indexOf(li) }]));
  const filas = vistos.slice(0, F.limite);
  const html = [];
  if (!filas.length) html.push('<li class="vacio">Nada coincide con esos filtros.</li>');
  else if (F.orden === 'recientes' || F.orden === 'antiguas') {
    // Encabezado de cada mes con el resumen del mes entero (no solo de lo que cabe en este tramo).
    let pintadas = 0;
    for (const g of agruparPorMes(vistos)) {
      if (pintadas >= filas.length) break;
      html.push(`<li class="mes-cab"><h3>${g.etiqueta} <small>· ${g.resumen}</small></h3></li>`);
      for (const m of g.movs) { if (pintadas >= filas.length) break; html.push(htmlFila(m)); pintadas++; }
    }
  } else for (const m of filas) html.push(htmlFila(m));
  host.innerHTML = html.join('');
  reordenarAnimado(host, viejos, filas, JSON.stringify([F.texto, F.filtro, F.desde, F.hasta, F.orden, F.limite]));
  // Resumen y botones
  $('l-res').textContent = hayFiltros() ? `${vistos.length} de ${todos.length} ${todos.length === 1 ? 'movimiento' : 'movimientos'}` : '';
  $('l-limpiar').hidden = !hayFiltros();
  const vt = $('ver-todas');
  const faltan = vistos.length - filas.length;
  vt.hidden = faltan <= 0;
  vt.textContent = `Ver más (${entero(faltan)} más)`;
  if (foco) host.querySelector(`.fila${foco}`)?.focus();
  aplicarResalte(host);
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
$('lista').addEventListener('click', async (e) => {
  const cp = e.target.closest('.f-copiar');
  if (cp) { avisar((await copiarTexto(cp.dataset.txid)) ? 'TXID copiado' : 'No se pudo copiar el TXID', null, true); return; }
  const nb = e.target.closest('.f-nota-b');
  if (nb) { editarNota(nb); return; }
  const b = e.target.closest('.fila');
  if (!b || !esAdmin()) return;
  if (b.dataset.tras) abrirAnularTraslado(Number(b.dataset.tras));
  else abrirHoja(Number(b.dataset.id));
});

/** Cambiar la nota de una compra o venta ahí mismo (solo admin; usa la misma ruta de edición, así que queda en el Historial). */
function editarNota(btn) {
  const li = btn.closest('li');
  const id = Number(btn.dataset.id);
  const c = S.compras.find((x) => x.id === id);
  if (!c || li.querySelector('.f-notaed')) return;
  const f = document.createElement('form');
  f.className = 'f-notaed';
  const inp = document.createElement('input');
  Object.assign(inp, { type: 'text', maxLength: 120, autocomplete: 'off', enterKeyHint: 'done', value: c.nota ?? '' });
  inp.setAttribute('aria-label', 'Nota de este movimiento');
  const ok = document.createElement('button');
  Object.assign(ok, { type: 'submit', textContent: 'Guardar' });
  const no = document.createElement('button');
  Object.assign(no, { type: 'button', textContent: 'Cancelar' });
  f.append(inp, ok, no);
  li.append(f);
  inp.focus();
  const cerrar = () => { f.remove(); btn.focus({ preventScroll: true }); };
  no.addEventListener('click', cerrar);
  f.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); cerrar(); } });
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    ok.disabled = true;
    try {
      const cuerpo = { fecha: c.fecha, monto: c.monto, sats: c.sats, tipo: c.tipo, nota: inp.value.trim(), extra: c.tipo === 'compra' && !!c.extra };
      const g = normalizar(await api(`/api/compras/${id}`, { metodo: 'PUT', cuerpo }));
      S.compras = S.compras.map((x) => (x.id === g.id ? g : x));
      f.remove();
      pintar();
      avisar('Nota guardada.', null, true);
    } catch (err) {
      ok.disabled = false;
      avisar(err.message, null, true);
    }
  });
}

// Buscar, filtrar y ordenar
const reiniciar = () => { F.limite = INICIAL; pintarLista(); };
$('l-buscar').addEventListener('input', (e) => { F.texto = e.target.value; reiniciar(); });
$('l-chips').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-f]');
  if (!b) return;
  F.filtro = b.dataset.f;
  document.querySelectorAll('#l-chips button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  reiniciar();
});
$('l-desde').addEventListener('change', (e) => { F.desde = e.target.value; reiniciar(); });
$('l-hasta').addEventListener('change', (e) => { F.hasta = e.target.value; reiniciar(); });
$('l-orden').value = F.orden;
$('l-orden').addEventListener('change', (e) => {
  F.orden = ORDENES.includes(e.target.value) ? e.target.value : 'recientes';
  try { if (F.orden === 'recientes') localStorage.removeItem(CLAVE_ORDEN); else localStorage.setItem(CLAVE_ORDEN, F.orden); } catch { /* vale solo para esta visita */ }
  reiniciar();
});
$('l-limpiar').addEventListener('click', () => { quitarFiltros(); pintarLista(); $('l-buscar').focus(); });
$('ver-todas').addEventListener('click', () => {
  const antes = F.limite;
  F.limite += PASO;
  pintarLista();
  $('lista').querySelectorAll('.fila')[antes]?.focus({ preventScroll: true });
});

// Tabla compacta (solo en pantallas anchas): los mismos movimientos, con los filtros y el orden de ahora.
const MAX_TABLA = 600;
const dTabla = $('d-tabla');
const txCorto = (t) => `${t.slice(0, 8)}…${t.slice(-6)}`;
function pintarTabla() {
  const { vistos } = movimientosVisibles();
  const filas = vistos.slice(0, MAX_TABLA);
  $('dt-nota').textContent = `${entero(vistos.length)} ${vistos.length === 1 ? 'movimiento' : 'movimientos'}${hayFiltros() ? ' con los filtros de la lista' : ''}${vistos.length > MAX_TABLA ? `; aquí van los primeros ${entero(MAX_TABLA)}` : ''}.`;
  const cuerpo = filas.map((m) => {
    const c = m.ref;
    const trasl = m.tipo === 'traslado';
    const venta = m.tipo === 'venta';
    const v = trasl ? null : venta ? c.realizada : S.precio ? (S.precio / c.precio - 1) * 100 : null;
    const fecha = esAdmin() && !trasl ? `<button type="button" class="enlace dt-edit" data-id="${c.id}">${fechaLarga(m.fecha)}<span class="sr"> (editar)</span></button>` : fechaLarga(m.fecha);
    const tipo = trasl ? (c.sentido === 'a_wallet' ? 'Traslado a wallet' : 'Traslado al exchange') : venta ? 'Venta o gasto' : c.extra ? 'Compra extra' : 'Compra';
    return `<tr><th scope="row">${fecha}</th><td>${tipo}</td><td class="num">${venta ? '−' : trasl ? '⇄ ' : '+'}${entero(m.sats)}</td>` +
      `<td class="num">${trasl ? '' : usd(m.monto)}</td><td class="num">${trasl ? '' : usd0(c.precio)}</td>` +
      `<td class="num"${v == null ? '' : ` data-tono="${v >= 0 ? 'sube' : 'baja'}"`}>${v == null ? '' : venta ? usdSigno(v) : pct(v)}</td>` +
      `<td>${esc(m.nota)}</td><td>${mempoolUrl(m.txid) ? `<a href="${mempoolUrl(m.txid)}" target="_blank" rel="noopener noreferrer">${txCorto(m.txid)}<span class="sr"> (se abre en otra pestaña)</span></a>` : ''}</td></tr>`;
  }).join('');
  $('dt').innerHTML = '<caption class="sr">Tus compras, ventas y traslados</caption><thead><tr><th scope="col">Fecha</th><th scope="col">Tipo</th><th scope="col" class="num">Sats</th><th scope="col" class="num">Dólares</th>' +
    '<th scope="col" class="num">Precio de BTC</th><th scope="col" class="num">Hoy / ganancia</th><th scope="col">Nota</th><th scope="col">TXID</th></tr></thead><tbody>' + cuerpo + '</tbody>';
}
$('l-tabla').addEventListener('click', () => { pintarTabla(); dTabla.showModal(); });
$('dt-cerrar').addEventListener('click', () => dTabla.close());
$('dt').addEventListener('click', (e) => {
  const b = e.target.closest('.dt-edit');
  if (!b) return;
  dTabla.close();
  abrirHoja(Number(b.dataset.id));
});
