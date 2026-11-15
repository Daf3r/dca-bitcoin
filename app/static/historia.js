import { aniosTronco, datosCertificado, entero, estratosMes, estrellasConstelacion, fechaLarga, historia, hoyISO, medallas, partitura, piedrasTorre, sellos, sellosSemana, semanasManta, textoAnio, textoAnioPartitura, textoCertificado, textoConstelacion, textoEstrato, textoEstratos, textoManta, textoNota, textoPartitura, textoPasaporte, textoSello, textoSelloSemana, textoSemanaManta, textoTorre, textoTronco } from './lib.js';
import { constelacion, estratos, manta, partitura as dibujarPartitura, torre, tronco } from './arte-historia.js';
import { certificado, lacre, selloSemana } from './arte-sellos.js';
import { tocarPasos } from './sonido.js';
import { ico, ilustracion, medalla } from './iconos.js';
import { $, R, S, esAdmin } from './estado.js';

// «Tu historia» (ideas 37 y 38): en «Tu cuenta», las medallas de constancia y la línea de tiempo de cómo llegaste hasta aquí.
// Todo sale de datos que ya existen (ver `lib.historia` y `lib.medallas`). El texto de las compras (notas) entra con `textContent`.
const nodo = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto != null) e.textContent = texto; return e; };

const CLAVE_VISTA = 'libro.historia.vista';
const VISTAS = ['linea', 'tronco', 'constelacion', 'torre', 'manta', 'estratos', 'partitura'];
let vista = (() => { try { const v = localStorage.getItem(CLAVE_VISTA); return VISTAS.includes(v) ? v : 'linea'; } catch { return 'linea'; } })();
let seleccion = null; // año (tronco) o índice (constelación y torre) que se está leyendo
let datos = null; // lo que se dibujó, para leer una pieza al tocarla o recorrerla con el teclado
let anioPartitura = null; // el año de la partitura que se ve (null = el último)
let pararMusica = null; // detiene la partitura que está sonando
const parar = () => { pararMusica?.(); pararMusica = null; };

/** El dibujo de la vista elegida (tronco, constelación o torre de piedras) con su texto, y el detalle de lo seleccionado. */
function pintarObjeto() {
  parar();
  const fig = $('dh-objeto'), esLinea = vista === 'linea';
  $('dh-v-linea').hidden = !esLinea;
  $('dh-tocar').hidden = vista !== 'partitura';
  $('dh-tocar').textContent = 'Tocar este año';
  fig.hidden = esLinea;
  for (const b of $('dh-vistas').children) b.setAttribute('aria-pressed', String(b.dataset.vh === vista));
  if (esLinea) return;
  const hoy = hoyISO(), items = R.items;
  const anios = $('dh-anios');
  anios.hidden = vista !== 'tronco' && vista !== 'partitura';
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
  } else if (vista === 'estratos') {
    const e = estratosMes(items, hoy);
    datos = { tipo: 'estratos', lista: e };
    $('dh-lienzo').innerHTML = estratos(e, { sel: seleccion });
    $('dh-desc').textContent = textoEstratos(e);
    $('dh-detalle').textContent = seleccion != null ? textoEstrato(e[seleccion]) : 'Toca una capa (o usa las flechas) para ver ese mes.';
  } else if (vista === 'partitura') {
    const as = partitura(items);
    const y = as.find((x) => x.anio === anioPartitura) ?? as.at(-1);
    anioPartitura = y?.anio ?? null;
    datos = { tipo: 'partitura', lista: y?.notas ?? [] };
    $('dh-lienzo').innerHTML = y ? dibujarPartitura(y, { sel: seleccion }) : '';
    $('dh-desc').textContent = textoPartitura(as);
    for (const a of [...as].reverse()) {
      const li = nodo('li');
      const b = nodo('button', a.anio === anioPartitura ? 'sel' : '', `${a.anio}`);
      b.type = 'button';
      b.dataset.anio = a.anio;
      b.setAttribute('aria-pressed', String(a.anio === anioPartitura));
      li.append(b);
      anios.append(li);
    }
    $('dh-tocar').hidden = !y;
    $('dh-detalle').textContent = y ? (seleccion != null ? textoNota(y.notas[seleccion]) : `${textoAnioPartitura(y)}. Toca una nota para ver esa compra.`) : '';
  } else if (vista === 'manta') {
    const m = semanasManta(items, hoy);
    datos = { tipo: 'manta', lista: m.celdas };
    $('dh-lienzo').innerHTML = manta(m, { sel: seleccion });
    $('dh-desc').textContent = textoManta(m);
    $('dh-detalle').textContent = seleccion != null ? textoSemanaManta(m.celdas[seleccion]) : 'Toca una semana (o usa las flechas) para ver qué pasó.';
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
  if (!b) return;
  if (vista === 'partitura') { anioPartitura = Number(b.dataset.anio); elegir(null); return; } // otro año = otra pauta
  elegir(Number(b.dataset.anio) === seleccion ? null : Number(b.dataset.anio));
});
// «Tocar este año» (campamento 13C): suena como respuesta a este toque aunque el sonido al guardar esté apagado.
$('dh-tocar').addEventListener('click', () => {
  if (pararMusica) { parar(); return; }
  const b = $('dh-tocar');
  b.textContent = 'Detener';
  let previa = null;
  pararMusica = tocarPasos(datos.lista.map((n) => n.paso), {
    alNota: (k) => { previa?.classList.remove('sonando'); previa = $('dh-lienzo').querySelector(`.pieza[data-i="${k}"]`); previa?.classList.add('sonando'); },
    alFin: () => { previa?.classList.remove('sonando'); pararMusica = null; b.textContent = 'Tocar este año'; },
  });
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
  const paso = datos.tipo === 'manta' ? { ArrowLeft: act - 1, ArrowRight: act + 1, ArrowUp: act - 52, ArrowDown: act + 52 } : { ArrowLeft: act - 1, ArrowUp: act + 1, ArrowRight: act + 1, ArrowDown: act - 1 };
  if (!datos.lista.length) return;
  const sig = { ...paso, Home: 0, End: ult }[e.key];
  if (sig == null) return;
  e.preventDefault();
  elegir(Math.max(0, Math.min(ult, sig)));
});

// El certificado de altitud (campamento 13B): un diálogo con el grabado y su descripción.
$('dh-cert').addEventListener('click', () => {
  const d = datosCertificado(R, esAdmin() ? S.usuario : null, hoyISO());
  $('cert-lienzo').innerHTML = certificado(d);
  $('cert-desc').textContent = textoCertificado(d);
  $('d-cert').showModal();
});
$('cert-ok').addEventListener('click', () => $('d-cert').close());

// El pasaporte de semanas (campamento 13C): un sello por cada semana en que compraste, los más nuevos primero, de a 24.
const PAS_PASO = 24;
let pasVisibles = PAS_PASO;
let pasSellos = [];
function pintarPasaporte() {
  pasSellos = sellosSemana(R.items, hoyISO()).reverse();
  pasVisibles = PAS_PASO;
  $('dh-pas-caja').hidden = !pasSellos.length;
  $('dh-pas-txt').textContent = textoPasaporte(pasSellos);
  dibujarPasaporte();
}
function dibujarPasaporte(foco = false) {
  const lista = $('dh-pasaporte'), antes = lista.children.length;
  lista.textContent = '';
  for (const s of pasSellos.slice(0, pasVisibles)) {
    const li = nodo('li', 'sello-sem');
    li.insertAdjacentHTML('beforeend', selloSemana(s));
    li.append(nodo('b', null, s.nombre), nodo('small', null, `+${entero(s.sats)} sats`));
    li.title = textoSelloSemana(s);
    lista.append(li);
  }
  const mas = $('dh-pas-mas');
  mas.hidden = pasVisibles >= pasSellos.length;
  mas.textContent = `Ver ${Math.min(PAS_PASO, pasSellos.length - pasVisibles)} más`;
  if (foco && lista.children[antes]) { lista.children[antes].tabIndex = -1; lista.children[antes].focus(); }
}
$('dh-pas-mas').addEventListener('click', () => { pasVisibles += PAS_PASO; dibujarPasaporte(true); });

/** Un nombre para lo que se pintó, para no rehacer la historia (y perder lo que se está leyendo) en cada refresco del precio. */
let firmaHistoria = null;
const firmaDe = () => `${R.items.length}:${R.sats}:${R.items.at(-1)?.id ?? 0}:${R.nCompras}:${R.racha}:${S.mensajes.map((m) => `${m.hito}${m.sellado ? 's' : (m.texto ?? '').length}`).join(',')}`;
/** Pinta «Tu historia» solo si cambió algo desde la última vez (o si no se había pintado). La llaman `pintar()` y las pestañas. */
export function refrescarHistoria({ forzar = false } = {}) {
  if (!R?.items || !S.cargado) return;
  const f = firmaDe();
  if (!forzar && f === firmaHistoria) return;
  firmaHistoria = f;
  pintarHistoria();
}

/** Las medallas del Resumen: las tres más recientes ya ganadas y, apagada, la siguiente (sin «te faltan»: es un reconocimiento,
 *  no una presión). Una rejilla visible que se envuelve, nada que haya que deslizar; el resto, con «Ver todas mis medallas». */
const MED_RESUMEN = 3;
export function pintarMedallasResumen() {
  const caja = $('res-medallas'), lista = $('res-med-lista');
  const ms = R?.items && R.nCompras ? medallas(R) : [];
  const ganadas = ms.filter((m) => m.ganada).sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  caja.hidden = !ganadas.length;
  lista.textContent = '';
  if (!ganadas.length) return;
  $('res-med-n').textContent = ganadas.length === 1 ? 'Ya tienes 1 medalla.'
    : ganadas.length > MED_RESUMEN ? `Ya tienes ${ganadas.length} medallas. Aquí, las más recientes.` : `Ya tienes ${ganadas.length} medallas.`;
  const siguiente = ms.find((m) => !m.ganada && m.tipo === 'compras') ?? ms.find((m) => !m.ganada);
  for (const m of [...ganadas.slice(0, MED_RESUMEN), ...(siguiente ? [siguiente] : [])]) {
    const li = nodo('li', `medalla ${m.ganada ? 'ganada' : 'bloq'}`);
    li.insertAdjacentHTML('beforeend', medalla(m));
    li.append(nodo('b', null, m.titulo));
    li.append(nodo('small', null, m.ganada ? fechaLarga(m.fecha) : 'La siguiente'));
    lista.append(li);
  }
}

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
  // Sellos de lacre (13B): uno por cada etapa que ya cruzaste.
  const ss = sellos(R), caja = $('dh-sellos');
  $('dh-sellos-caja').hidden = !ss.length;
  caja.textContent = '';
  for (const x of ss) {
    const li = nodo('li', 'sello');
    li.insertAdjacentHTML('beforeend', lacre(x.m));
    li.append(nodo('b', null, x.m >= 1e8 ? x.nombre : `${x.nombre} sats`), nodo('small', null, fechaLarga(x.fecha)));
    li.title = textoSello(x);
    caja.append(li);
  }
  pintarPasaporte();
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
    const msg = e.clase === 'hito' ? S.mensajes.find((x) => x.hito === e.m && !x.sellado)?.texto : null;
    if (msg) cuerpo.append(nodo('p', 'h-msg', `«${msg}»`)); // la frase que dejó el dueño en esa bandera (15A)
    li.append(t, cuerpo);
    lista.append(li);
  }
  if (extrasOcultas) lista.insertBefore(nodo('li', 'h-mas', `Y ${extrasOcultas} compras extra más, más antiguas.`), lista.lastElementChild);
}
