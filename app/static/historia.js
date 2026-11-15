import { aniosTronco, entero, estrellasConstelacion, fechaLarga, historia, hoyISO, medallas, piedrasTorre, textoAnio, textoConstelacion, textoTorre, textoTronco } from './lib.js';
import { constelacion, torre, tronco } from './arte-historia.js';
import { ico, ilustracion, medalla } from './iconos.js';
import { $, R } from './estado.js';

// «Tu historia» (ideas 37 y 38): en «Tu cuenta», las medallas de constancia y la línea de tiempo de cómo llegaste hasta aquí.
// Todo sale de datos que ya existen (ver `lib.historia` y `lib.medallas`). El texto de las compras (notas) entra con `textContent`.
const nodo = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto != null) e.textContent = texto; return e; };

const CLAVE_VISTA = 'libro.historia.vista';
const VISTAS = ['linea', 'tronco', 'constelacion', 'torre'];
let vista = (() => { try { const v = localStorage.getItem(CLAVE_VISTA); return VISTAS.includes(v) ? v : 'linea'; } catch { return 'linea'; } })();
let seleccion = null; // año (tronco) o índice (constelación y torre) que se está leyendo
let datos = null; // lo que se dibujó, para leer una pieza al tocarla o recorrerla con el teclado

/** El dibujo de la vista elegida (tronco, constelación o torre de piedras) con su texto, y el detalle de lo seleccionado. */
function pintarObjeto() {
  const fig = $('dh-objeto'), esLinea = vista === 'linea';
  $('dh-v-linea').hidden = !esLinea;
  fig.hidden = esLinea;
  for (const b of $('dh-vistas').children) b.setAttribute('aria-pressed', String(b.dataset.vh === vista));
  if (esLinea) return;
  const hoy = hoyISO(), items = R.items;
  const anios = $('dh-anios');
  anios.hidden = vista !== 'tronco';
  anios.textContent = '';
  if (vista === 'tronco') {
    const t = aniosTronco(items, hoy);
    datos = { tipo: 'tronco', lista: t };
    $('dh-lienzo').innerHTML = tronco(t, { sel: seleccion });
    $('dh-desc').textContent = textoTronco(t);
    for (const y of [...t].reverse()) {
      const li = nodo('li');
      const b = nodo('button', y.anio === seleccion ? 'sel' : '', `${y.anio}`);
      b.type = 'button';
      b.dataset.anio = y.anio;
      b.setAttribute('aria-pressed', String(y.anio === seleccion));
      li.append(b);
      anios.append(li);
    }
    $('dh-detalle').textContent = seleccion != null ? textoAnio(t.find((y) => y.anio === seleccion)) : 'Toca un anillo o un año para ver cómo fue.';
  } else if (vista === 'constelacion') {
    const e = estrellasConstelacion(items);
    datos = { tipo: 'constelacion', lista: e };
    $('dh-lienzo').innerHTML = constelacion(e, { sel: seleccion });
    $('dh-desc').textContent = textoConstelacion(e);
    const s = seleccion != null ? e[seleccion] : null;
    $('dh-detalle').textContent = s ? `${fechaLarga(s.fecha)} · +${entero(s.sats)} sats${s.extra ? ' · compra extra' : ''}` : 'Toca una estrella (o usa las flechas) para ver esa compra.';
  } else {
    const p = piedrasTorre(items);
    datos = { tipo: 'torre', lista: p };
    $('dh-lienzo').innerHTML = torre(p, { sel: seleccion });
    $('dh-desc').textContent = textoTorre(p);
    const s = seleccion != null ? p[seleccion] : null;
    $('dh-detalle').textContent = s ? `${s.n === 1 ? fechaLarga(s.desde) : `${fechaLarga(s.desde)} a ${fechaLarga(s.hasta)}`} · ${s.n} ${s.n === 1 ? 'compra' : 'compras'} · +${entero(s.sats)} sats${s.extra ? ' · incluye extra' : ''}` : 'Toca una piedra (o usa las flechas) para ver esa compra.';
  }
}
function elegir(valor) {
  seleccion = valor;
  pintarObjeto();
}
$('dh-vistas').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-vh]');
  if (!b || b.dataset.vh === vista) return;
  vista = b.dataset.vh;
  seleccion = null;
  try { localStorage.setItem(CLAVE_VISTA, vista); } catch { /* sin almacenamiento: vale para esta visita */ }
  pintarObjeto();
});
$('dh-anios').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-anio]');
  if (b) elegir(Number(b.dataset.anio) === seleccion ? null : Number(b.dataset.anio));
});
$('dh-lienzo').addEventListener('click', (e) => {
  const p = e.target.closest?.('.pieza');
  if (!p || !datos) return;
  const v = p.dataset.anio != null ? Number(p.dataset.anio) : Number(p.dataset.i);
  elegir(v === seleccion ? null : v);
});
$('dh-lienzo').addEventListener('keydown', (e) => {
  if (!datos || datos.tipo === 'tronco') return;
  const ult = datos.lista.length - 1, act = seleccion ?? ult;
  const sig = { ArrowLeft: act - 1, ArrowUp: act + 1, ArrowRight: act + 1, ArrowDown: act - 1, Home: 0, End: ult }[e.key];
  if (sig == null) return;
  e.preventDefault();
  elegir(Math.max(0, Math.min(ult, sig)));
});

export function pintarHistoria() {
  const lista = $('dh-linea'), med = $('dh-medallas');
  lista.textContent = '';
  med.textContent = '';
  $('dh-vacio').hidden = R.nCompras > 0;
  if (!R.nCompras) $('dh-vacio').innerHTML = `${ilustracion('montana')}Tu historia empieza con tu primera compra.`;
  $('dh-cuerpo').hidden = !R.nCompras;
  if (!R.nCompras) return;
  seleccion = null;
  pintarObjeto();
  for (const m of medallas(R)) {
    const li = nodo('li', `medalla ${m.ganada ? 'ganada' : 'bloq'}`);
    li.insertAdjacentHTML('beforeend', medalla(m));
    li.append(nodo('b', null, m.titulo), nodo('small', null, m.ganada ? fechaLarga(m.fecha) : `Próxima: te ${m.falta === 1 ? 'falta' : 'faltan'} ${m.falta} ${m.tipo === 'compras' ? (m.falta === 1 ? 'compra' : 'compras') : (m.falta === 1 ? 'mes' : 'meses')}`));
    med.append(li);
  }
  const { eventos, extrasOcultas } = historia(R);
  for (const e of eventos) {
    const li = nodo('li', `h-ev h-${e.clase}`);
    const t = nodo('time', null, fechaLarga(e.fecha));
    t.dateTime = e.fecha;
    const cuerpo = nodo('div');
    const tit = nodo('strong');
    if (e.clase === 'extra') tit.insertAdjacentHTML('beforeend', `${ico('rayo')} `);
    tit.append(document.createTextNode(e.titulo));
    cuerpo.append(tit);
    if (e.detalle) cuerpo.append(nodo('p', null, e.detalle));
    li.append(t, cuerpo);
    lista.append(li);
  }
  if (extrasOcultas) lista.insertBefore(nodo('li', 'h-mas', `Y ${extrasOcultas} compras extra más, más antiguas.`), lista.lastElementChild);
}
