import { aniosTronco, datosCertificado, entero, nombreHito, estratosMes, firmasDe, textoFirmantes, estrellasConstelacion, fechaLarga, figurasPartitura, figurasTodos, historia, hoyISO, medallas, mantaPrimerAnio, mesesTronco, objetoDeHoy, partitura, piedrasTorre, primerAnio, sellos, sellosSemana, semanasManta, textoAnio, textoAnioPartitura, textoCertificado, textoConstelacion, textoEstrato, textoEstratos, textoEstrella, textoFigura, textoManta, textoMantaPrimer, textoMesTronco, textoPartitura, textoPasaporte, textoPiedra, textoSello, textoSelloSemana, textoSemanaManta, textoTodos, textoTorre, textoTronco, textoTroncoPrimer } from './lib.js';
import { constelacion, estratos, manta, mantaPrimer, partitura as dibujarPartitura, torre, tronco } from './arte-historia.js';
import { certificado, lacre, selloSemana } from './arte-sellos.js';
import { tocarPasos } from './sonido.js';
import { ico, medalla } from './iconos.js';
import { pose, teleferico } from './arte-osos-poses.js';
import { cumpleDeHoy } from './pintar.js';
import { $, R, S, esAdmin, reducido, vozLibro } from './estado.js';
import { abrirPelicula, hayPelicula } from './pelicula.js';
import { verComprasEntre } from './lista.js';
import { irAPestana } from './pestanas.js';

// «Tu historia» (ideas 37 y 38): en «Tu cuenta», las medallas de constancia y la línea de tiempo de cómo llegaste hasta aquí.
// Todo sale de datos que ya existen (ver `lib.historia` y `lib.medallas`). El texto de las compras (notas) entra con `textContent`.
const nodo = (tag, clase, texto) => { const e = document.createElement(tag); if (clase) e.className = clase; if (texto != null) e.textContent = texto; return e; };

const CLAVE_VISTA = 'libro.historia.vista';
const VISTAS = ['linea', 'tronco', 'constelacion', 'torre', 'manta', 'estratos', 'partitura'];
let vista = (() => { try { const v = localStorage.getItem(CLAVE_VISTA); return VISTAS.includes(v) ? v : 'linea'; } catch { return 'linea'; } })();
let seleccion = null; // año (tronco) o índice (constelación y torre) que se está leyendo
let datos = null; // lo que se dibujó, para leer una pieza al tocarla o recorrerla con el teclado
let anioPartitura = null; // el año de la partitura que se ve (null = el último; 'todos' = todos los años, campamento 58)
let pararMusica = null; // detiene la partitura que está sonando
const parar = () => { pararMusica?.(); pararMusica = null; };

/**
 * El dibujo de una vista, con su texto (lo usan el selector y la portada del dibujo de hoy). `tipo` y `lista` sirven para leer una
 * pieza al tocarla o con el teclado. (Campamento 20) En el primer año del libro, el tronco y la manta tienen su forma propia
 * (`lib.primerAnio`): el tronco por meses y la manta como una pieza de cuatro hileras.
 * (Campamento 21B) La tele lo usa para su marco: pide la voz del libro y el último año de la partitura, sin mirar lo elegido aquí.
 * (Campamentos 57 y 58) La partitura dibuja figuras (`lib.figurasPartitura`: por días hasta 60 notas, si no por semanas; con
 * `anio: 'todos'`, `lib.figurasTodos`): `lista` son esas figuras, las que se tocan, se leen y suenan.
 */
export function dibujoDe(vh, sel = null, { libro = vozLibro(), anio = anioPartitura } = {}) {
  const hoy = hoyISO(), items = R.items, lb = libro;
  if (vh === 'tronco') {
    if (primerAnio(items, hoy)) {
      const t = mesesTronco(items, hoy);
      return { tipo: 'tronco-mes', lista: t.meses, svg: tronco(t.meses, { sel, primer: t }), desc: textoTroncoPrimer(t, lb) };
    }
    const t = aniosTronco(items, hoy);
    return { tipo: 'tronco', lista: t, svg: tronco(t, { sel }), desc: textoTronco(t, lb) };
  }
  if (vh === 'constelacion') { const e = estrellasConstelacion(items); return { tipo: vh, lista: e, svg: constelacion(e, { sel }), desc: textoConstelacion(e, lb) }; }
  if (vh === 'estratos') { const e = estratosMes(items, hoy); return { tipo: vh, lista: e, svg: estratos(e, { sel }), desc: textoEstratos(e, lb) }; }
  if (vh === 'partitura') {
    const as = partitura(items);
    if (anio === 'todos' && as.length > 1) {
      const fig = figurasTodos(as);
      return { tipo: vh, lista: fig.figuras, anios: as, anio: null, todos: true, fig, svg: dibujarPartitura(fig, { sel }), desc: textoPartitura(as, lb) };
    }
    const y = as.find((x) => x.anio === anio) ?? as.at(-1);
    const fig = figurasPartitura(y);
    return { tipo: vh, lista: fig.figuras, anios: as, anio: y, todos: false, fig, svg: y ? dibujarPartitura(fig, { sel }) : '', desc: textoPartitura(as, lb) };
  }
  if (vh === 'manta') {
    if (primerAnio(items, hoy)) { const m = mantaPrimerAnio(items, hoy); return { tipo: 'manta', cols: m.cols, lista: m.celdas, svg: mantaPrimer(m, { sel }), desc: textoMantaPrimer(m, lb) }; }
    const m = semanasManta(items, hoy);
    return { tipo: 'manta', cols: 52, lista: m.celdas, svg: manta(m, { sel }), desc: textoManta(m, lb) };
  }
  const p = piedrasTorre(items);
  return { tipo: 'torre', lista: p, svg: torre(p, { sel }), desc: textoTorre(p, lb) };
}

/** El dibujo de la vista elegida con su texto, y el detalle de lo seleccionado. */
function pintarObjeto() {
  parar();
  const fig = $('dh-objeto'), esLinea = vista === 'linea';
  $('dh-v-linea').hidden = !esLinea;
  $('dh-tocar').hidden = vista !== 'partitura';
  $('dh-tocar').textContent = 'Tocar este año';
  $('dh-pasos').hidden = true;
  $('dh-ver').hidden = true;
  fig.hidden = esLinea;
  for (const b of $('dh-vistas').children) b.setAttribute('aria-pressed', String(b.dataset.vh === vista));
  if (esLinea) return;
  const lb = vozLibro();
  const anios = $('dh-anios');
  const d = dibujoDe(vista, seleccion);
  datos = d;
  $('dh-lienzo').innerHTML = d.svg;
  $('dh-desc').textContent = d.desc;
  anios.hidden = d.tipo !== 'tronco' && d.tipo !== 'partitura';
  anios.textContent = '';
  const boton = (anio, elegido) => {
    const li = nodo('li');
    const b = nodo('button', elegido ? 'sel' : '', anio === 'todos' ? 'Todos' : `${anio}`);
    b.type = 'button';
    b.dataset.anio = anio;
    b.setAttribute('aria-pressed', String(elegido));
    li.append(b);
    anios.append(li);
  };
  const s = seleccion != null ? d.lista[seleccion] : null;
  if (d.tipo === 'tronco') {
    for (const y of [...d.lista].reverse()) boton(y.anio, y.anio === seleccion);
    $('dh-detalle').textContent = seleccion != null ? textoAnio(d.lista.find((y) => y.anio === seleccion), lb) : 'Toca un anillo o un año para ver cómo fue.';
  } else if (d.tipo === 'tronco-mes') {
    $('dh-detalle').textContent = s ? textoMesTronco(s, lb) : 'Toca una banda (o usa las flechas) para ver ese mes.';
  } else if (d.tipo === 'constelacion') {
    $('dh-detalle').textContent = s ? textoEstrella(s) : `Toca una estrella (o usa las flechas) para ver esa ${d.lista[0]?.semanal ? 'semana' : 'compra'}.`;
  } else if (d.tipo === 'estratos') {
    $('dh-detalle').textContent = s ? textoEstrato(s, lb) : 'Toca una capa (o usa las flechas) para ver ese mes.';
  } else if (d.tipo === 'partitura') {
    anioPartitura = d.todos ? 'todos' : d.anio?.anio ?? null;
    // (Campamento 58) «Todos» primero (con más de un año) y después cada año, del más nuevo al más viejo.
    if (d.anios.length > 1) boton('todos', d.todos);
    for (const a of [...d.anios].reverse()) boton(a.anio, a.anio === anioPartitura);
    $('dh-tocar').hidden = !d.lista.length;
    $('dh-tocar').textContent = tocarTexto();
    const modo = d.fig.modo, que = { dia: 'nota', semana: 'semana', todos: 'mes' }[modo] ?? 'nota';
    // (Campamento 57) Con figuras pequeñas, la selección también se mueve con dos botones de 48 px (y con las flechas del teclado).
    $('dh-pasos').hidden = !d.lista.length;
    $('dh-ant').setAttribute('aria-label', `${que[0].toUpperCase()}${que.slice(1)} anterior`);
    $('dh-sig').setAttribute('aria-label', `${que[0].toUpperCase()}${que.slice(1)} siguiente`);
    $('dh-ant').disabled = seleccion === 0;
    $('dh-sig').disabled = seleccion === d.lista.length - 1;
    const pista = { dia: 'Toca una nota para ver esa compra.', semana: 'Toca una semana para verla de cerca.', todos: 'Toca un mes para ver cómo fue.' }[modo];
    $('dh-detalle').textContent = !d.lista.length ? '' : s ? textoFigura(s) : `${d.todos ? textoTodos(d.anios, lb) : textoAnioPartitura(d.anio, lb, d.fig)}. ${pista}`;
    // (Campamento 57) «Ver estas compras»: lleva a «Movimientos» con solo las compras de esa figura (su día, su semana o su mes).
    $('dh-ver').hidden = !s;
    if (s) $('dh-ver').textContent = s.n === 1 ? 'Ver esta compra' : 'Ver estas compras';
  } else if (d.tipo === 'manta') {
    $('dh-detalle').textContent = s ? textoSemanaManta(s) : 'Toca una semana (o usa las flechas) para ver qué pasó.';
  } else {
    $('dh-detalle').textContent = s ? textoPiedra(s) : 'Toca una piedra (o usa las flechas) para ver esa compra.';
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
  if (vista === 'partitura') { anioPartitura = b.dataset.anio === 'todos' ? 'todos' : Number(b.dataset.anio); elegir(null); return; } // otro año = otra pauta
  elegir(Number(b.dataset.anio) === seleccion ? null : Number(b.dataset.anio));
});
// «Tocar este año» (campamento 13C): suena como respuesta a este toque aunque el sonido al guardar esté apagado. Suena una nota por
// figura (campamento 57): con un año por semanas, 54 como mucho, no una por compra (con miles, duraría minutos).
const tocarTexto = () => (datos?.todos ? 'Tocar todos los años' : 'Tocar este año');
$('dh-tocar').addEventListener('click', () => {
  if (pararMusica) { parar(); return; }
  const b = $('dh-tocar');
  b.textContent = 'Detener';
  let previa = null;
  pararMusica = tocarPasos(datos.lista.map((n) => n.paso), {
    alNota: (k) => { previa?.classList.remove('sonando'); previa = $('dh-lienzo').querySelector(`.pieza[data-i="${k}"]`); previa?.classList.add('sonando'); },
    alFin: () => { previa?.classList.remove('sonando'); pararMusica = null; b.textContent = tocarTexto(); },
  });
});
// ‹ › (campamento 57): sin nada elegido, ‹ lleva a la última figura y › a la primera.
const moverSel = (d) => {
  if (!datos?.lista.length) return;
  const ult = datos.lista.length - 1;
  elegir(seleccion == null ? (d < 0 ? ult : 0) : Math.max(0, Math.min(ult, seleccion + d)));
};
$('dh-ver').addEventListener('click', () => {
  const s = seleccion != null ? datos?.lista[seleccion] : null;
  if (!s) return;
  verComprasEntre(s.desde, s.hasta);
  irAPestana('movimientos');
  const t = $('t-compras');
  requestAnimationFrame(() => { t.scrollIntoView({ block: 'start', behavior: reducido() ? 'auto' : 'smooth' }); t.focus({ preventScroll: true }); });
});
$('dh-ant').addEventListener('click', () => moverSel(-1));
$('dh-sig').addEventListener('click', () => moverSel(1));
/** (Campamento 58) La constelación por semanas tiene un solo vigía: el toque elige la estrella más cercana (a 16 del dibujo como mucho). */
function estrellaCercana(e) {
  const svg = e.target.ownerSVGElement, m = svg?.getScreenCTM?.();
  if (!m) return null;
  const q = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  let mejor = null, dm = 16;
  for (const s of datos.lista) { const d = Math.hypot(160 + (s.x - 0.5) * 268 - q.x, 160 + (s.y - 0.5) * 268 - q.y); if (d < dm) { dm = d; mejor = s.i; } }
  return mejor;
}
$('dh-lienzo').addEventListener('click', (e) => {
  if (datos?.tipo === 'constelacion' && e.target.closest?.('.hc-vigia')) { const i = estrellaCercana(e); if (i != null) elegir(i === seleccion ? null : i); return; }
  const p = e.target.closest?.('.pieza');
  if (!p || !datos) return;
  const v = p.dataset.anio != null ? Number(p.dataset.anio) : Number(p.dataset.i);
  elegir(v === seleccion ? null : v);
});
$('dh-lienzo').addEventListener('keydown', (e) => {
  if (!datos || datos.tipo === 'tronco') return;
  const ult = datos.lista.length - 1, act = seleccion ?? ult;
  const paso = datos.tipo === 'manta' ? { ArrowLeft: act - 1, ArrowRight: act + 1, ArrowUp: act - datos.cols, ArrowDown: act + datos.cols } : { ArrowLeft: act - 1, ArrowUp: act + 1, ArrowRight: act + 1, ArrowDown: act - 1 };
  if (!datos.lista.length) return;
  const sig = { ...paso, Home: 0, End: ult }[e.key];
  if (sig == null) return;
  e.preventDefault();
  elegir(Math.max(0, Math.min(ult, sig)));
});

// El certificado de altitud (campamento 13B): un diálogo con el grabado y su descripción.
$('dh-cert').addEventListener('click', () => {
  const d = datosCertificado(R, esAdmin() ? S.usuario : null, hoyISO(), { montana: S.montana });
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
  cuenta('pasaporte', `${pasSellos.length} ${pasSellos.length === 1 ? 'semana' : 'semanas'}`);
  $('dh-pas-txt').textContent = textoPasaporte(pasSellos, vozLibro());
  dibujarPasaporte();
}
function dibujarPasaporte(foco = false) {
  const lista = $('dh-pasaporte'), antes = lista.children.length;
  lista.textContent = '';
  for (const s of pasSellos.slice(0, pasVisibles)) {
    const li = nodo('li', 'sello-sem');
    li.insertAdjacentHTML('beforeend', selloSemana(s));
    li.append(nodo('b', null, s.nombre), nodo('small', null, `+${entero(s.sats)} sats`));
    li.title = textoSelloSemana(s, vozLibro());
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
const firmaDe = () => `${R.items.length}:${R.sats}:${R.items.at(-1)?.id ?? 0}:${R.nCompras}:${R.racha}:${S.mensajes.map((m) => `${m.hito}${m.sellado ? 's' : (m.texto ?? '').length}`).join(',')}`
  + `:${(S.firmas ?? []).map((f) => `${f.id}.${f.editado ?? f.creado}`).join(',')}`
  + `:${vozLibro() ? 'libro' : 'yo'}`; // si la cuenta llega después, se repinta con la voz que toca (campamento 20)
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
  const ya = vozLibro() ? 'El libro ya tiene' : 'Ya tienes'; // a quien solo mira se le habla del libro (campamento 17)
  $('res-med-n').textContent = ganadas.length === 1 ? `${ya} 1 medalla.`
    : ganadas.length > MED_RESUMEN ? `${ya} ${ganadas.length} medallas. Aquí, las más recientes.` : `${ya} ${ganadas.length} medallas.`;
  const siguiente = ms.find((m) => !m.ganada && m.tipo === 'compras') ?? ms.find((m) => !m.ganada);
  for (const m of [...ganadas.slice(0, MED_RESUMEN), ...(siguiente ? [siguiente] : [])]) {
    const li = nodo('li', `medalla ${m.ganada ? 'ganada' : 'bloq'}`);
    li.insertAdjacentHTML('beforeend', medalla(m));
    li.append(nodo('b', null, m.titulo));
    li.append(nodo('small', null, m.ganada ? fechaLarga(m.fecha) : 'La siguiente'));
    lista.append(li);
  }
}

// (Campamento 20, 5a) La línea va en secciones plegadas con su cuenta («10 ganadas», «52 semanas»…); el dispositivo recuerda cuáles
// abriste (`libro.historia.abiertas`, con try/catch). Por defecto, todas plegadas: la pestaña abre con el dibujo de hoy.
const CLAVE_ABIERTAS = 'libro.historia.abiertas';
const abiertas = new Set((() => { try { return (localStorage.getItem(CLAVE_ABIERTAS) ?? '').split(',').filter(Boolean); } catch { return []; } })());
const cuenta = (sec, txt) => { const el = $(`dh-n-${sec}`); if (el) el.textContent = txt; };
for (const d of document.querySelectorAll('#dh-v-linea details.dh-sec')) {
  d.open = abiertas.has(d.dataset.sec);
  d.addEventListener('toggle', () => {
    if (d.open) abiertas.add(d.dataset.sec); else abiertas.delete(d.dataset.sec);
    try { localStorage.setItem(CLAVE_ABIERTAS, [...abiertas].join(',')); } catch { /* vale para esta visita */ }
  });
}
/** «Ver todas mis medallas» (Resumen): la línea de la historia con sus medallas abiertas y a la vista. */
export function verMedallas() {
  const b = $('dh-vistas').querySelector('[data-vh="linea"]');
  if (b && b.getAttribute('aria-pressed') !== 'true') b.click();
  $('dh-sec-medallas').open = true;
  requestAnimationFrame(() => $('dh-sec-medallas').scrollIntoView({ block: 'start', behavior: reducido() ? 'auto' : 'smooth' }));
}

// (Campamento 20, 5a) El dibujo de hoy: una portada arriba de la historia con uno de los dibujos, el mismo todo el día, entre los que ya se
// ven bien con los datos (`lib.objetoDeHoy`). Sin datos para ninguno, no sale. El dibujo aquí no se toca: «Verlo de cerca» lo abre abajo.
function pintarHoy() {
  const o = R.nCompras ? objetoDeHoy(R.items, hoyISO()) : null;
  $('dh-hoy').hidden = !o;
  if (!o) return;
  const d = dibujoDe(o.vh);
  $('dh-hoy-lienzo').innerHTML = d.svg;
  $('dh-hoy-t').textContent = o.nombre;
  $('dh-hoy-desc').textContent = d.desc;
  $('dh-hoy').dataset.vh = o.vh;
  // El nombre accesible es el texto visible y, para quien no ve, qué dibujo es (con `aria-label` axe marca `label-content-name-mismatch`).
  const sr = document.createElement('span');
  sr.className = 'sr';
  sr.textContent = ` (${o.nombre.replace(/^./, (c) => c.toLowerCase())})`;
  $('dh-hoy-ver').replaceChildren('Verlo de cerca', sr);
}
$('dh-hoy-ver').addEventListener('click', () => {
  const vh = $('dh-hoy').dataset.vh;
  const b = $('dh-vistas').querySelector(`[data-vh="${vh}"]`);
  if (!b) return;
  if (b.getAttribute('aria-pressed') !== 'true') b.click();
  $('dh-vistas').scrollIntoView({ block: 'start', behavior: reducido() ? 'auto' : 'smooth' });
  $('dh-lienzo').focus({ preventScroll: true });
});

// (Campamento 23) La película del ascenso: la entrada, bajo el dibujo de hoy, y «Ver ese día» en cada etapa con fecha de la línea, que la
// abre detenida en ese día (las postales de la idea 30 quedaron aquí dentro). El foco vuelve al botón que la abrió.
$('dh-peli-ver').addEventListener('click', (e) => abrirPelicula({ desde: e.currentTarget }));
function verEseDia(fecha, que) {
  const b = nodo('button', 'enlace h-ver');
  b.type = 'button';
  b.insertAdjacentHTML('beforeend', ico('reproducir'));
  b.append('Ver ese día', nodo('span', 'sr', ` en la película del ascenso (${que}, ${fechaLarga(fecha)})`));
  b.addEventListener('click', () => abrirPelicula({ fecha, desde: b }));
  return b;
}

export function pintarHistoria() {
  const lista = $('dh-linea'), med = $('dh-medallas');
  lista.textContent = '';
  med.textContent = '';
  $('dh-vacio').hidden = R.nCompras > 0;
  if (!R.nCompras) $('dh-vacio').innerHTML = `${pose('mochila', { cumple: cumpleDeHoy() })}${vozLibro() ? 'La historia del libro empieza con su primera compra.' : 'Tu historia empieza con tu primera compra.'}`;
  $('dh-cuerpo').hidden = !R.nCompras;
  if (!R.nCompras) return;
  seleccion = null;
  pintarObjeto();
  pintarHoy();
  const peli = hayPelicula();
  $('dh-peli').hidden = !peli;
  // (Campamento 29) La cabina del teleférico con los tres asomados: la película es «subir». Decorativa; el botón no cambia.
  if (peli && !$('dh-peli').querySelector('.oso-ilu')) $('dh-peli').insertAdjacentHTML('beforeend', teleferico());
  $('dh-peli-d').textContent = `Cómo subió ${vozLibro() ? 'el libro' : 'tu libro'}, de la primera compra a hoy, sobre la montaña de hoy.`;
  const ms = medallas(R), ganadas = ms.filter((m) => m.ganada).length;
  cuenta('medallas', ganadas ? `${ganadas} ${ganadas === 1 ? 'ganada' : 'ganadas'}` : 'aún ninguna');
  for (const m of ms) {
    const li = nodo('li', `medalla ${m.ganada ? 'ganada' : 'bloq'}`);
    li.insertAdjacentHTML('beforeend', medalla(m));
    li.append(nodo('b', null, m.titulo), nodo('small', null, m.ganada ? fechaLarga(m.fecha) : `Próxima: ${vozLibro() ? '' : 'te '}${m.falta === 1 ? 'falta' : 'faltan'} ${m.falta} ${m.tipo === 'compras' ? (m.falta === 1 ? 'compra' : 'compras') : (m.falta === 1 ? 'mes' : 'meses')}`));
    med.append(li);
  }
  // Sellos de lacre (13B): uno por cada etapa que ya cruzaste.
  const ss = sellos(R), caja = $('dh-sellos');
  $('dh-sellos-caja').hidden = !ss.length;
  cuenta('sellos', `${ss.length} ${ss.length === 1 ? 'sello' : 'sellos'}`);
  caja.textContent = '';
  for (const x of ss) {
    const li = nodo('li', 'sello');
    li.insertAdjacentHTML('beforeend', lacre(x.m));
    li.append(nodo('b', null, x.m >= 1e8 ? x.nombre : `${x.nombre} sats`), nodo('small', null, fechaLarga(x.fecha)));
    li.title = textoSello(x);
    caja.append(li);
  }
  pintarPasaporte();
  const { eventos, extrasOcultas } = historia(R, undefined, { libro: vozLibro() });
  cuenta('linea', `${eventos.length} ${eventos.length === 1 ? 'momento' : 'momentos'}`);
  for (const e of eventos) {
    const li = nodo('li', `h-ev h-${e.clase}`);
    const t = nodo('time', null, fechaLarga(e.fecha));
    t.dateTime = e.fecha;
    const cuerpo = nodo('div');
    if (e.clase === 'pasos') {
      // Las etapas intermedias de un tramo ya cerrado (campamento 21): un renglón que se despliega con cada una y su fecha.
      const det = nodo('details'), sum = nodo('summary');
      sum.append(nodo('span', null, e.titulo), nodo('small', null, e.detalle.replace(/^Entre/, 'entre')));
      const ul = nodo('ul');
      for (const x of e.pasos) {
        const li2 = nodo('li');
        const tm = nodo('time', null, fechaLarga(x.fecha));
        tm.dateTime = x.fecha;
        const nombre = x.m >= 1e8 ? nombreHito(x.m) : `${nombreHito(x.m)} sats`;
        li2.append(nodo('b', null, nombre), tm);
        if (peli) li2.append(verEseDia(x.fecha, nombre));
        ul.append(li2);
      }
      det.append(sum, ul);
      cuerpo.append(det);
      li.append(t, cuerpo);
      lista.append(li);
      continue;
    }
    const tit = nodo('strong');
    if (e.clase === 'extra') tit.insertAdjacentHTML('beforeend', `${ico('rayo')} `);
    tit.append(document.createTextNode(e.titulo));
    cuerpo.append(tit);
    if (e.detalle) cuerpo.append(nodo('p', null, e.detalle));
    const msg = e.clase === 'hito' ? S.mensajes.find((x) => x.hito === e.m && !x.sellado)?.texto : null;
    if (msg) cuerpo.append(nodo('p', 'h-msg', `«${msg}»`)); // la frase que dejó el dueño en esa bandera (15A)
    // El libro de cumbre de ese campamento (19): quién firmó y el botón para abrirlo. Aquí siguen a mano los campamentos de abajo, que la
    // montaña deja de dibujar cuando el libro sube.
    const fs = e.clase === 'hito' && [1e5, 1e6, 1e7, 1e8, 1e9, 1e10, 1e11, 1e12].includes(e.m) ? firmasDe(S.firmas, e.m) : null;
    if (fs && (fs.length || R.sats >= e.m)) {
      const b = nodo('button', 'enlace h-firmas', `Libro de cumbre: ${textoFirmantes(fs).replace(/^./, (c) => c.toLowerCase())}`);
      b.type = 'button';
      b.addEventListener('click', () => document.dispatchEvent(new CustomEvent('libro:firmas', { detail: { hito: e.m, alcanzado: R.sats >= e.m } })));
      cuerpo.append(b);
    }
    if (peli && ['hito', 'etapa', 'paso'].includes(e.clase) && e.fecha) cuerpo.append(verEseDia(e.fecha, e.m >= 1e8 ? nombreHito(e.m) : `${nombreHito(e.m)} sats`));
    li.append(t, cuerpo);
    lista.append(li);
  }
  if (extrasOcultas) lista.insertBefore(nodo('li', 'h-mas', `Y ${extrasOcultas} compras extra más, más antiguas.`), lista.lastElementChild);
}
