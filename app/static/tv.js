import { $, R, S } from './estado.js';
import { corrimientoReloj, entero, fechaCorta, fechaEscrita, horaSV, medianocheSV, modoTele, muestrasSismo, rejilla, riel, sitioLibre, tarjetaFiesta, textoReloj, usd } from './lib.js';
import { sismografo } from './arte.js';
import { sinMovimiento } from './movimiento.js';
import { pintarMontana } from './pintar.js';

// Modo pantalla grande (idea 59): la montaña, el saldo y el último movimiento a pantalla completa, con letra grande y sin controles,
// para dejar la app en un televisor de casa. Se entra desde «Tu cuenta» o abriendo la dirección con `#tv` (el televisor inicia sesión una
// vez con una cuenta de lector y se queda ahí). Solo lectura: no pide nada nuevo al servidor; se actualiza sola cada minuto, como siempre.
// (Campamento 21B) La tele de la sala: un reloj, ninguna tarjeta sobre el sendero, «Tú» ni los rótulos (cada una se coloca donde cabe).
const raiz = document.documentElement;
export const enTV = () => raiz.dataset.tv === '1';
let bloqueo = null, reposo = null;

// El sismógrafo (campamento 15B, idea 55): una tira de papel con el precio en vivo de las últimas horas (se toma una muestra con cada precio
// nuevo, cada 30 s). A medianoche de El Salvador la tira se «arranca» y empieza otra. Solo muestra lo que pasó: nunca predice.
let muestras = [], ultimaMuestra = 0, tiraDesde = 0;
function pintarSismo() {
  const caja = $('tv-sismo');
  const antes = caja.hidden;
  if (!S.precio) { caja.hidden = true; if (!antes) programarColocar(); return; }
  const ahora = Date.now();
  const medianoche = medianocheSV(ahora);
  if (tiraDesde && medianoche > tiraDesde) { // pasó la medianoche: se arranca la tira
    muestras = [];
    caja.classList.remove('arranca'); void caja.offsetWidth; caja.classList.add('arranca');
  }
  tiraDesde = medianoche;
  if (S.precioTs && S.precioTs !== ultimaMuestra) { muestras.push({ t: ahora, p: S.precio }); ultimaMuestra = S.precioTs; if (muestras.length > 2000) muestras.shift(); }
  const m = muestrasSismo(muestras, ahora, { desdeMs: medianoche });
  caja.hidden = m.puntos.length < 2;
  if (caja.hidden !== antes) programarColocar();
  if (caja.hidden) return;
  caja.innerHTML = sismografo({ puntos: m.puntos, ancho: 600, alto: 120 });
  caja.setAttribute('aria-label', `Tira del precio de BTC desde la medianoche: ahora ${usd(m.ultima)}, entre ${usd(m.min)} y ${usd(m.max)}.`);
}

/** La fiesta de la tele (idea 5): al anotarse una compra, una tarjeta grande en la escena unos segundos (la montaña sube con su celebración). */
let fiestaTimer = 0;
export function fiestaTV(antes, despues, sats) {
  const t = tarjetaFiesta(antes, despues, sats);
  const caja = $('tv-fiesta');
  $('tvf-k').textContent = t.titulo;
  $('tvf-txt').textContent = t.texto;
  $('tvf-sub').textContent = t.sub;
  caja.classList.toggle('grande', t.grande);
  caja.classList.remove('compacta');
  delete caja.dataset.sitio; delete caja.dataset.x; delete caja.dataset.y;
  caja.hidden = false;
  colocarTarjetas(); // ya, antes de que se vea: nunca aparece encima del sendero
  caja.classList.remove('va'); void caja.offsetWidth; caja.classList.add('va');
  clearTimeout(fiestaTimer);
  fiestaTimer = setTimeout(() => { caja.hidden = true; delete caja.dataset.sitio; programarColocar(); }, t.grande ? 12_000 : 9_000);
}

// ------------------------------------------------------------------------- el reloj (campamento 21B, idea 15)
/**
 * La hora que dice el reloj de la tele: la de `libro.hora` si se fijó (para probar otra hora, como el cielo), si no, la real de El
 * Salvador. Nunca la del atardecer acelerado de las 18:00 (ese solo mueve el cielo: `libroCielo.hora()` la devolvería).
 */
export function horaReloj(ms = Date.now()) {
  let f = Number.NaN;
  try { f = Number.parseFloat(localStorage.getItem('libro.hora')); } catch { /* sin almacenamiento: la real */ }
  if (f >= 0 && f < 24) { const min = Math.round(f * 60); return { h: Math.floor(min / 60) % 24, m: min % 60 }; }
  const { h, m } = horaSV(ms);
  return { h, m };
}
let relojPintado = '';
function pintarReloj(ms = Date.now()) {
  const { h, m } = horaReloj(ms);
  const dia = window.libroCielo?.dia() ?? new Date(ms).toISOString().slice(0, 10);
  const clave = `${dia} ${h}:${m}`;
  if (clave === relojPintado) return;
  relojPintado = clave;
  const t = textoReloj(h, m);
  $('tvr-h').textContent = t.hora;
  $('tvr-ap').textContent = t.sufijo;
  $('tvr-f').textContent = fechaEscrita(dia, dia);
  $('tvr-t').setAttribute('datetime', `${dia}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
}

export function pintarTV() {
  if (!enTV()) return;
  pintarSismo();
  pintarReloj();
  // El nombre de la montaña (campamento 19), bajo la marca: lo que la familia ve en la sala.
  const nom = $('tv-nombre');
  nom.hidden = !S.montana;
  nom.textContent = S.montana ? `Montaña «${S.montana}»` : '';
  // El último movimiento: una etiqueta pequeña y el dato. El texto se lee igual que antes («Último movimiento: 13 nov · +31,795 sats…»).
  const u = R.items?.at(-1);
  $('tvu-k').textContent = u ? 'Último movimiento' : 'Todavía no hay movimientos.';
  $('tvu-k').append(...(u ? [Object.assign(document.createElement('span'), { className: 'sr', textContent: ': ' })] : []));
  $('tvu-v').textContent = u ? `${fechaCorta(u.fecha)} · ${u.tipo === 'venta' ? '−' : '+'}${entero(u.sats)} sats (${usd(u.monto)})${u.tipo === 'venta' ? ' · venta' : ''}` : '';
  $('tvu-v').hidden = !u;
  programarColocar();
}

// ------------------------------------------------------------------------- dónde va cada tarjeta (campamento 21B, idea 15)
// La escena se compone sola (la montaña, el saldo, el precio) y las tarjetas de la tele van encima, así que no pueden ir en un sitio fijo:
// en una pantalla 16:9 el pie es el arranque del sendero; en una vertical, la falda; con otra letra, «Vamos aquí» cambia de lado. Se mide lo
// dibujado (el trazo del sendero, «Tú», los rótulos, los hitos, el saldo y el precio) y cada tarjeta va al primer sitio libre de su lista
// de preferencias, dejando un margen. Si sigue libre donde estaba, no se mueve (nada salta). Si no cabe en ninguno, no sale: nunca tapa un dato.
const MARGEN = 16; // la separación mínima con lo que no se puede tapar
const R_SENDERO = 14; // medio ancho del camino con su talud (el ancho llega a 12 px abajo en escritorio)
const TARJETAS = ['tv-fiesta', 'tv-ultimo', 'tv-reloj', 'tv-sismo'];

const cajaDe = (el, base) => { const b = el.getBoundingClientRect(); return { x: b.left - base.left, y: b.top - base.top, w: b.width, h: b.height }; };

/** Lo que una tarjeta no puede tapar (`duros`) y lo que mejor no tapa si hay sitio en otra parte (`suaves`: el sol o la luna). */
export function obstaculosTV(base = document.querySelector('.escena').getBoundingClientRect()) {
  const duros = [], suaves = [];
  const svg = $('montana').querySelector('svg');
  const camino = svg?.querySelector('#m-sendero');
  if (camino) {
    // El sendero: muestras del trazo cada 10 px (`getPointAtLength` del sendero usa la tabla de montana.js: es barato).
    const m = camino.getScreenCTM(), L = camino.getTotalLength();
    if (m && L) {
      for (let l = 0; l <= L + 9; l += 10) {
        const p = camino.getPointAtLength(Math.min(l, L));
        const x = m.a * p.x + m.c * p.y + m.e - base.left, y = m.b * p.x + m.d * p.y + m.f - base.top;
        duros.push({ x: x - R_SENDERO, y: y - R_SENDERO, w: 2 * R_SENDERO, h: 2 * R_SENDERO });
      }
    }
    // «Tú», los rótulos (campamentos, cumbre, etapa, «hace 1 año», la placa de «Tú»), los hitos y la bandera de la meta.
    for (const el of svg.querySelectorAll('#m-etiquetas > *, #m-yo .yo-anillo, #m-eco .eco-fantasma, .campo .campo-ico, .campo .banderin')) duros.push(cajaDe(el, base));
    for (const el of svg.querySelectorAll('.sol .sol-disco, .luna .luna-sombra')) suaves.push(cajaDe(el, base)); // el disco, no su halo
  }
  // Lo que se lee arriba: la marca, el nombre de la montaña, el precio y el saldo.
  for (const el of document.querySelectorAll('.escena .marca, #tv-nombre:not([hidden]), #cotizacion, #t-saldo, #s-saldo-v, #s-valor')) duros.push(cajaDe(el, base));
  const vale = (o) => o.w > 0 && o.h > 0;
  return { duros: duros.filter(vale), suaves: suaves.filter(vale) };
}

/** Los sitios que prueba cada tarjeta, en orden: primero los que siguen la composición (bajo el saldo, junto al precio), luego cualquiera. */
function candidatos(id, caja, g) {
  const { W, H, borde, saldoB, cot, gap } = g;
  const L = Math.max(Math.round(borde / 2), g.L - caja.pad); // el texto de la tarjeta, alineado con el del saldo
  const Rr = cot.x + cot.w, yMax = H - borde - caja.h, xMax = W - borde - caja.w;
  const bajoSaldo = riel(L, saldoB + gap, 0, 12, { y2: yMax });
  const bajoPrecio = riel(Rr - caja.w, cot.y + cot.h + gap, 0, 12, { y2: yMax });
  const paso = Math.max(24, Math.round(Math.min(W, H) / 40));
  const todo = (ax, ay) => rejilla(ax, ay, { x1: borde, x2: xMax, y1: borde, y2: yMax, paso, ky: 0.6 });
  if (id === 'tv-reloj') {
    // Junto al precio, en la misma fila (la barra de arriba: marca … reloj · precio) y con su mismo fondo de cielo; si ahí no cabe (la
    // cumbre sube hasta esa fila), en la esquina de abajo a la derecha, como el reloj de un canal; si tampoco, bajo el precio o donde quepa.
    const x0 = cot.x - Math.round(gap * 0.6) - caja.w;
    return [...riel(x0, Math.max(8, cot.y + (cot.h - caja.h) / 2), -16, 0, { x1: Math.max(borde, x0 - caja.w * 0.6) }).map((c) => ({ ...c, donde: 'cielo' })),
      ...riel(Rr - caja.w, yMax, -16, 0, { x1: Math.max(borde, Rr - 2 * caja.w) }), ...bajoPrecio, ...todo(Rr - caja.w, yMax)];
  }
  if (id === 'tv-sismo') return [...bajoPrecio, ...bajoSaldo, ...todo(Rr - caja.w, H / 2)];
  // El último movimiento va con el saldo: debajo, alineado con él; si no, abajo a la izquierda o donde quepa. La fiesta ocupa su sitio
  // mientras dura (dice lo mismo, en grande) y, si no cabe ahí, el más cercano.
  return [...bajoSaldo, ...riel(L, yMax, 16, 0, { x2: xMax }), ...todo(L, saldoB + gap)];
}

let colocando = 0;
/**
 * Coloca las tarjetas visibles. Cada una va al mejor sitio libre de su lista; mientras «Tú» sube (los rótulos se quitan y se vuelven a
 * poner al llegar) las que ya tienen sitio no se mueven si siguen libres, para no ir y venir. Se llama sola cuando cambia algo.
 */
export function colocarTarjetas() {
  if (!enTV() || !S.cargado || dormida) return; // dormida, la escena no se dibuja: se coloca al despertar
  const escena = document.querySelector('.escena'), base = escena.getBoundingClientRect();
  const W = base.width, H = base.height;
  if (!W || !H) return;
  const subiendo = !$('montana').querySelector('#m-etiquetas > *');
  // La fiesta ocupa el sitio del último movimiento mientras dura (dice lo mismo, en grande); al acabar, vuelve la tarjeta con el dato nuevo.
  const fiesta = !$('tv-fiesta').hidden;
  const ultimo = $('tv-ultimo');
  if (fiesta) { ultimo.dataset.sitio = '0'; delete ultimo.dataset.x; delete ultimo.dataset.y; }
  const r = (id) => { const e = $(id); return e && !e.hidden && e.getClientRects().length ? cajaDe(e, base) : null; };
  const saldo = ['t-saldo', 's-saldo-v', 's-valor'].map(r).filter(Boolean);
  const cot = r('cotizacion') ?? { x: W - 24, y: 16, w: 0, h: 0 };
  const borde = Math.max(14, Math.round(Math.min(W, H) * 0.025));
  // `L`: donde empieza el texto del saldo («Saldo del libro»; la cifra grande asoma un poco a la izquierda por el dibujo de sus dígitos).
  const g = { W, H, borde, gap: Math.round(borde * 1.2), cot, L: saldo[0]?.x ?? borde, saldoB: saldo.length ? Math.max(...saldo.map((b) => b.y + b.h)) : H / 3 };
  const { duros, suaves } = obstaculosTV(base);
  const opts = { W, H, margen: MARGEN, borde: 6 }; // del borde de la pantalla basta con no salirse; los rieles ya dejan su margen
  const puestas = new Map();
  const colocar = (id) => {
    const el = $(id);
    if (el.hidden) { delete el.dataset.sitio; return true; }
    const caja = { w: el.offsetWidth, h: el.offsetHeight, pad: Number.parseFloat(getComputedStyle(el).paddingLeft) || 0 };
    const actual = subiendo && el.dataset.x != null ? [{ x: Number(el.dataset.x), y: Number(el.dataset.y), donde: el.dataset.donde }] : [];
    const otras = [...puestas.values()];
    const lista = [...actual, ...candidatos(id, caja, g)];
    const s = sitioLibre(caja, lista, [...duros, ...suaves, ...otras], opts) ?? sitioLibre(caja, lista, [...duros, ...otras], opts);
    if (!s) { el.dataset.sitio = '0'; delete el.dataset.x; delete el.dataset.y; puestas.delete(id); return false; }
    const nuevo = el.dataset.sitio !== '1';
    el.style.translate = `${Math.round(s.x)}px ${Math.round(s.y)}px`;
    el.dataset.x = String(s.x); el.dataset.y = String(s.y); el.dataset.sitio = '1';
    if (s.donde) el.dataset.donde = s.donde; else delete el.dataset.donde;
    // Moverse de un sitio a otro se anima (con efectos); la primera vez aparece ya en su sitio.
    if (nuevo) { delete el.dataset.asentada; requestAnimationFrame(() => { el.dataset.asentada = '1'; }); }
    puestas.set(id, { x: s.x, y: s.y, ...caja });
    return true;
  };
  // La fiesta va primero (es lo que importa en ese momento; el reloj y el sismógrafo se apartan) y, si no cabe entera, en su versión compacta.
  for (const id of fiesta ? ['tv-fiesta', 'tv-reloj', 'tv-sismo'] : ['tv-ultimo', 'tv-reloj', 'tv-sismo']) {
    if (!colocar(id) && id === 'tv-fiesta' && !$(id).classList.contains('compacta')) { $(id).classList.add('compacta'); colocar(id); }
  }
}
/** Junta los avisos de «algo cambió» de un mismo momento en una sola colocación. */
function programarColocar() {
  if (!enTV() || colocando) return;
  colocando = setTimeout(() => requestAnimationFrame(() => { colocando = 0; colocarTarjetas(); }), 60);
}
// La montaña se redibuja por su cuenta (cambio de tamaño, subida de «Tú» que quita y vuelve a poner los rótulos): se vuelve a mirar.
new MutationObserver(() => programarColocar()).observe($('montana'), { childList: true, subtree: true });
new ResizeObserver(() => programarColocar()).observe(document.querySelector('.escena'));
for (const id of TARJETAS) new ResizeObserver(() => programarColocar()).observe($(id));
document.fonts?.ready.then(() => programarColocar());

// ------------------------------------------------------------------------- la tele duerme (campamento 21B, idea 42)
// De 23:00 a 5:00 (hora de El Salvador) la tele se queda en reposo: casi negra, con la hora tenue y la luna de hoy, sin brillo fuerte
// (es una sala). La hora se corre unos píxeles cada 5 minutos para no marcar la pantalla. Despierta sola a las 5:00; un toque o una tecla
// la despiertan un minuto. «La tele duerme de noche: no» (en «Tu cuenta», por dispositivo) la deja despierta toda la noche.
// Mientras duerme la pantalla sigue encendida (`wakeLock`): si se soltara, el aparato apagaría la pantalla y a las 5:00 no podría
// encenderla solo. Casi negro gasta poco. Una compra de noche no la despierta (la montaña se pone al día sin fiesta).
const CLAVE_DUERME = 'libro.tv.duerme';
/** ¿Duerme la tele de noche en este dispositivo? Sí, salvo que se apagara (`libro.tv.duerme` = `0`). */
export const teleDuermeActiva = () => { try { return localStorage.getItem(CLAVE_DUERME) !== '0'; } catch { return true; } };
export function fijarTeleDuerme(si) {
  try { if (si) localStorage.removeItem(CLAVE_DUERME); else localStorage.setItem(CLAVE_DUERME, '0'); } catch { /* vale para esta visita */ }
  latir();
}
const DESPIERTA_UN_RATO = 60_000;
let dormida = false, despiertaHasta = 0, fundidoNoche = 0;
/** ¿Está dormida ahora la tele? (La fiesta de una compra de noche no la despierta: datos.js lo mira.) */
export const teleDormida = () => dormida;

/** La luna de hoy, pequeña y tenue: el disco apagado y la parte iluminada (semicírculo y media elipse, como en la escena; sin ids). */
function lunaReposo(fase) {
  const r = 10, k = Math.cos(2 * Math.PI * fase), rx = Math.abs(k) * r, barrido = k > 0 ? 0 : 1;
  const luz = `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${rx.toFixed(2)} ${r} 0 0 ${barrido} 0 ${-r}Z`;
  return `<svg viewBox="-13 -13 26 26" aria-hidden="true" focusable="false"><circle class="tvn-disco" r="${r}"/><path class="tvn-luz" d="${luz}"${fase > 0.5 ? ' transform="scale(-1 1)"' : ''}/></svg>`;
}
function pintarNoche(h, m) {
  const t = textoReloj(h, m);
  $('tvn-h').textContent = t.hora;
  $('tvn-ap').textContent = t.sufijo;
  const c = corrimientoReloj(h * 60 + m);
  $('tvn-caja').style.translate = `${c.x}px ${c.y}px`;
  const fase = window.libroCielo?.faseLunar?.() ?? 0.5;
  const luna = $('tvn-luna');
  if (luna.dataset.fase !== fase.toFixed(2)) { luna.dataset.fase = fase.toFixed(2); luna.innerHTML = lunaReposo(fase); }
}
function dormir(si) {
  const noche = $('tv-noche');
  if (si === dormida) return;
  clearTimeout(fundidoNoche);
  dormida = si;
  if (si) {
    // Se apaga: la pantalla se funde a negro y, ya a oscuras, la escena deja de dibujarse (no gasta nada mientras duerme).
    $('tv-fiesta').hidden = true;
    noche.hidden = false;
    void noche.offsetWidth;
    noche.classList.add('vis');
    fundidoNoche = setTimeout(() => { raiz.dataset.tvDuerme = '1'; }, sinMovimiento() ? 0 : 2600);
  } else {
    // Despierta: la escena vuelve a dibujarse (con la montaña al día: lo que llegó de noche, sin fiesta) y la noche se funde.
    delete raiz.dataset.tvDuerme;
    noche.classList.remove('vis');
    fundidoNoche = setTimeout(() => { if (!dormida) noche.hidden = true; }, sinMovimiento() ? 0 : 2600);
    if (S.cargado) pintarMontana(false);
    pintarTV();
  }
}

// ------------------------------------------------------------------------- el pulso de la tele (cada 5 s, solo en la tele)
let pulso = 0;
/** Mira la hora y decide qué enseña la tele (escena, marco o reposo). `ahoraMs` se puede pasar para probar. */
export function latir(ahoraMs = Date.now()) {
  if (!enTV() || document.visibilityState !== 'visible') return;
  pintarReloj(ahoraMs);
  const { h, m } = horaReloj(ahoraMs);
  if (despiertaHasta && ahoraMs >= despiertaHasta) despiertaHasta = 0; // el rato despierta ya pasó
  const estado = modoTele({ hora: h + m / 60, ahoraMs, duerme: teleDuermeActiva(), despiertaHasta, fiesta: !$('tv-fiesta').hidden, ritual: ritualEnCurso });
  dormir(estado.modo === 'duerme');
  if (dormida) pintarNoche(h, m);
}
/** Un toque o una tecla con la tele dormida la despiertan un minuto (mover el ratón no: un gato o un ratón que tiembla la encenderían). */
function despertarUnRato() {
  if (!enTV() || !dormida) return;
  despiertaHasta = Date.now() + DESPIERTA_UN_RATO;
  latir();
}

/** Los controles (salir) se ven unos segundos cuando alguien toca, mueve el ratón o usa el teclado. */
function mostrarControles() {
  raiz.dataset.tvActivo = '1';
  clearTimeout(reposo);
  reposo = setTimeout(() => { delete raiz.dataset.tvActivo; }, 4000);
}
async function mantenerDespierta() {
  try { bloqueo = await navigator.wakeLock?.request('screen'); } catch { /* sin soporte o sin permiso: la pantalla seguirá su ajuste */ }
}
/** Lo que corre solo mientras se ve la tele: el pulso del reloj, la pantalla despierta y la primera colocación. */
function arrancar() {
  if (!pulso) pulso = setInterval(latir, 5000);
  latir();
  mantenerDespierta();
  programarColocar();
}
export async function entrarTV({ pantallaCompleta = true } = {}) {
  raiz.dataset.tv = '1';
  document.dispatchEvent(new CustomEvent('libro:tv')); // en la tele no hay Diario a la vista: si se estaba leyendo, se calla
  if (location.hash !== '#tv') history.replaceState(null, '', `${location.pathname}${location.search}#tv`);
  window.scrollTo(0, 0);
  pintarTV();
  mostrarControles();
  if (pantallaCompleta) { try { await raiz.requestFullscreen?.(); } catch { /* el navegador no la deja: queda en la ventana */ } }
  arrancar();
}
export function salirTV() {
  delete raiz.dataset.tv;
  delete raiz.dataset.tvActivo;
  clearInterval(pulso); pulso = 0;
  clearTimeout(fundidoNoche); dormida = false; despiertaHasta = 0;
  delete raiz.dataset.tvDuerme;
  $('tv-noche').classList.remove('vis'); $('tv-noche').hidden = true;
  if (location.hash === '#tv') history.replaceState(null, '', `${location.pathname}${location.search}`);
  try { if (document.fullscreenElement) document.exitFullscreen(); } catch { /* ya salió */ }
  try { bloqueo?.release(); } catch { /* ya liberado */ }
  bloqueo = null;
}

// --------------------------------------------------- el atardecer acelerado (campamento 15B, idea 60)
// A las 18:00 de El Salvador la tele hace un atardecer de 20 segundos como ritual de cierre del día: el cielo pasa de la tarde a la noche
// y vuelve a la hora real. Una vez por día; solo en modo pantalla grande, con efectos «todos» o «esenciales» y sin forzar la hora a mano.
const CLAVE_RITUAL = 'libro.tv.atardecer';
const DURACION_RITUAL = 20_000;
let ritualEnCurso = false;
/** Corre el atardecer acelerado: de las 17:00 a las 19:30 en 17 s y de vuelta a la hora real en 3 s (a unos 12 cuadros por segundo). */
export function atardecerAcelerado() {
  const cielo = window.libroCielo;
  if (!cielo || ritualEnCurso) return false;
  ritualEnCurso = true;
  const real = cielo.hora();
  const t0 = performance.now();
  const paso = () => {
    const t = performance.now() - t0;
    if (!enTV() || t >= DURACION_RITUAL) { cielo.fijarHora(null); ritualEnCurso = false; return; }
    const ida = Math.min(1, t / 17_000);
    const vuelta = t > 17_000 ? (t - 17_000) / 3_000 : 0;
    const base = 17 + 2.5 * (ida < 1 ? ida * ida * (3 - 2 * ida) : 1); // 17:00 → 19:30, con arranque y frenado suaves
    cielo.fijarHora(base + (real - base) * (vuelta * vuelta * (3 - 2 * vuelta)));
    setTimeout(paso, 80);
  };
  paso();
  return true;
}
function vigilarAtardecer() {
  if (!enTV() || ritualEnCurso || document.visibilityState !== 'visible') return;
  const nivel = raiz.dataset.efectos;
  if (nivel === 'ninguno') return;
  const h = window.libroCielo?.hora();
  let hoy = null;
  try { hoy = localStorage.getItem(CLAVE_RITUAL); } catch { /* sin almacenamiento */ }
  const dia = window.libroCielo?.dia();
  if (h >= 18 && h < 18.05 && hoy !== dia) {
    try { localStorage.setItem(CLAVE_RITUAL, dia); } catch { /* vale esta vez */ }
    atardecerAcelerado();
  }
}
setInterval(vigilarAtardecer, 20_000);

$('tv-salir').addEventListener('click', salirTV);
for (const ev of ['pointermove', 'pointerdown', 'keydown', 'touchstart']) document.addEventListener(ev, () => enTV() && mostrarControles(), { passive: true });
for (const ev of ['pointerdown', 'keydown', 'touchstart']) document.addEventListener(ev, despertarUnRato, { passive: true });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && enTV() && !document.fullscreenElement) salirTV(); });
document.addEventListener('visibilitychange', () => { if (enTV() && document.visibilityState === 'visible') { mantenerDespierta(); latir(); programarColocar(); } });
window.addEventListener('hashchange', () => { if (location.hash === '#tv' && !enTV()) entrarTV({ pantallaCompleta: false }); else if (location.hash !== '#tv' && enTV()) salirTV(); });
// Abrir la dirección con #tv entra directo (sin pantalla completa: el navegador la pide siempre tras un toque). efectos.js ya dejó
// `data-tv` antes de pintar (sin un instante de la página normal); aquí arranca lo que corre en la tele.
if (location.hash === '#tv') { raiz.dataset.tv = '1'; arrancar(); }
