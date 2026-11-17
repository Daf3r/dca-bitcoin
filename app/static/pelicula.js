// La película del ascenso (campamento 23, idea 29): «Tú» repite el camino del libro día por día, de la primera compra a hoy, sobre la
// montaña de hoy (la escala de hoy: no se rehace la de entonces). Dura 15 s y tiene un deslizador para ir a cualquier día; con efectos
// «ninguno» no hay reproducción: solo el deslizador. No cambia la hora del cielo. «Ver ese día» (en «Tu historia») la abre detenida en
// la fecha de una etapa. Las cuentas son de `lib.js` (`peliculaAscenso`, `diaPelicula`, `textosPelicula`); el dibujo, de `montana.js`.
//
// Una sola escena en el documento: la escena dibuja sus recortes y degradados con `url(#m-…)`, que el navegador busca en todo el
// documento (la primera que encuentra). Mientras la película está abierta, la escena de la página se vacía (`pintar.js` no la redibuja:
// `peliculaAbierta`) y al cerrar se vuelve a dibujar. Así tampoco hay nodos de más: la película no añade nada permanente a la escena.
import { PELICULA_MS, altitud, diaDeFecha, diaPelicula, entero, fechaLarga, hayAurora, hoyISO, mesesDelLibro, aniosDelLibro, peliculaAscenso, primeraCompra, textosPelicula } from './lib.js';
import { dibujarMontana, escalaDe, fotograma } from './montana.js';
import { $, R, S, reducido, vozLibro } from './estado.js';
import { pintarMontana } from './pintar.js';
import { enTV } from './tv.js';

const dlg = $('d-pelicula'), host = $('pe-montana'), rango = $('pe-rango'), bPlay = $('pe-play');
let abierta = false, jugando = false, raf = 0, ultimoT = null, P = null, dia = 0, ultimoDia = -1, altVis = 0, esc = null, abridor = null, arranque = 0;
let anchoDibujo = 0, altoDibujo = 0; // a qué tamaño se dibujó la montaña de la película (se redibuja si cambia: girar el teléfono)

/** ¿Está abierta? Mientras lo está, la escena de la página no se redibuja (`pintar.js: pintarMontana`). */
export const peliculaAbierta = () => abierta;
/** ¿Está corriendo? Mientras corre (15 s como mucho) no se refresca el precio: un repintado a mitad se notaría (`app.js`). */
export const reproduciendo = () => jugando;
/** ¿Hay película? Hace falta camino que recorrer: movimientos en dos días distintos por lo menos. */
export function hayPelicula() {
  const P0 = R?.items?.length ? peliculaAscenso(R.items, R.camino, hoyISO()) : null;
  return Boolean(P0 && P0.dias >= 1 && R.sats > 0);
}

const rotuloDe = (x) => (vozLibro() ? (x.hoy ? 'Vamos aquí' : 'Íbamos aquí') : 'Tú');

/** Lo que dice el día `x`: el rótulo, el saldo (con su tamaño, que baja con las cifras largas), lo que pasó y el deslizador. */
function escribir(x) {
  const t = textosPelicula(x, vozLibro());
  $('pe-fecha').textContent = t.rotulo;
  const cifra = entero(x.sats);
  $('pe-sats').textContent = cifra;
  $('pe-cap').style.setProperty('--n', String(cifra.length));
  $('pe-ev').textContent = t.evento;
  rango.value = String(x.d);
  rango.setAttribute('aria-valuetext', t.lectura);
  rango.style.setProperty('--p', (P.dias ? x.d / P.dias : 0).toFixed(4)); // lo recorrido, en naranja
  return t;
}

/** Coloca a «Tú» en el día `d`. `dt` (ms desde el fotograma anterior) hace que el punto se deslice; sin `dt`, salta y queda quieto. */
function pintarDia(d, dt = null) {
  const x = diaPelicula(P, d);
  if (x.d !== ultimoDia) { ultimoDia = x.d; escribir(x); }
  if (!esc) return x;
  const objetivo = altitud(x.sats, esc);
  // El punto sigue al saldo con un poco de retraso (un resorte sin rebote): las compras son escalones y así no salta de uno a otro.
  altVis = dt == null ? objetivo : altVis + (objetivo - altVis) * (1 - Math.exp(-dt / 120));
  if (dt == null || Math.abs(objetivo - altVis) < 1e-4) altVis = objetivo;
  const satsVis = altVis <= 0 ? 0 : altVis === objetivo ? x.sats : 10 ** (Math.log10(esc.base) + altVis * (Math.log10(esc.cima) - Math.log10(esc.base)));
  fotograma(host, satsVis, { compras: x.compras, quieto: dt == null, rotulo: rotuloDe(x) });
  return x;
}

function pintarBoton() {
  const fin = P && dia >= P.dias;
  bPlay.hidden = reducido(); // con efectos «ninguno» no hay reproducción: solo el deslizador
  bPlay.querySelector('use').setAttribute('href', jugando ? '#i-pausa' : '#i-reproducir');
  $('pe-play-t').textContent = jugando ? 'Pausar la película' : fin ? 'Ver la película otra vez' : 'Ver la película';
  bPlay.dataset.estado = jugando ? 'pausa' : fin ? 'otra' : 'ver';
}

function cuadro(t) {
  if (!jugando) return;
  // Se avanza por el tiempo acumulado entre fotogramas, con un tope de un cuarto de segundo: si el navegador deja de dibujar un rato, la
  // película no salta; en un aparato lento (pocos fotogramas por segundo) sigue durando sus 15 s.
  const dt = ultimoT == null ? 16 : Math.min(250, t - ultimoT);
  ultimoT = t;
  dia = Math.min(P.dias, dia + (dt * P.dias) / PELICULA_MS);
  pintarDia(dia, dt);
  if (dia >= P.dias) { detener(true); return; }
  raf = requestAnimationFrame(cuadro);
}
function jugar() {
  if (jugando || reducido() || !P) return;
  if (dia >= P.dias) { dia = 0; ultimoDia = -1; altVis = 0; pintarDia(0, null); }
  jugando = true;
  ultimoT = null;
  $('pe-sr').textContent = '';
  pintarBoton();
  raf = requestAnimationFrame(cuadro);
}
/** Detiene la película y deja a «Tú» quieto en su día exacto (con su rótulo); `aviso` lo dice a los lectores de pantalla. */
function detener(aviso = false) {
  clearTimeout(arranque);
  const corria = jugando;
  jugando = false;
  cancelAnimationFrame(raf);
  if (!abierta || !P) return;
  const x = pintarDia(Math.round(dia), null);
  dia = x.d;
  pintarBoton();
  if (aviso && corria) $('pe-sr').textContent = textosPelicula(x, vozLibro()).lectura;
}

/** Dibuja la montaña de hoy en la película (al abrir y si cambia el tamaño) y pone a «Tú» en el día de ahora. */
function dibujar() {
  const caja = host.getBoundingClientRect();
  const techo = Math.max(0, $('pe-cap').getBoundingClientRect().bottom - caja.top);
  const pie = Number.parseFloat(getComputedStyle(host).getPropertyValue('--pie')) || 40;
  const x = diaPelicula(P, dia), hoy = hoyISO();
  dibujarMontana(host, {
    pie, techo, libro: vozLibro(), sats: R.sats, meta: R.meta, etapa: R.etapa, inicio: x.sats, compras: R.nCompras, ventas: R.nVentas, tocable: false, pelicula: true,
    aurora: hayAurora(R.racha), personas: S.familia?.personas ?? 0, iniciales: S.familia?.iniciales ?? '', primera: primeraCompra(S.compras), meses: mesesDelLibro(S.compras, hoy), anios: aniosDelLibro(S.compras, hoy), rotulo: rotuloDe(x),
  });
  esc = escalaDe(host);
  anchoDibujo = Math.round(caja.width); altoDibujo = Math.round(caja.height);
  ultimoDia = -1;
  pintarDia(dia, null);
}
new ResizeObserver(() => {
  if (!abierta) return;
  const r = host.getBoundingClientRect();
  if (Math.abs(Math.round(r.width) - anchoDibujo) > 2 || Math.abs(Math.round(r.height) - altoDibujo) > 2) dibujar();
}).observe(host);

/**
 * Abre la película. Desde «Ver la película», empieza por la primera compra y corre sola (con movimiento); con `fecha` («Ver ese día»),
 * se abre detenida en ese día. `desde` es el botón que la abrió: el foco vuelve ahí al cerrar.
 */
export function abrirPelicula({ fecha = null, desde = null } = {}) {
  if (abierta || enTV() || !S.cargado) return;
  P = peliculaAscenso(R.items, R.camino, hoyISO());
  if (!P || P.dias < 1) return;
  abridor = desde ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
  dia = fecha ? diaDeFecha(P, fecha) : 0;
  altVis = 0;
  jugando = false;
  rango.max = String(P.dias);
  rango.value = String(dia);
  $('pe-desde').textContent = fechaLarga(P.desde);
  $('pe-sr').textContent = '';
  abierta = true; // antes de vaciar la escena de la página: desde aquí `pintarMontana` no la vuelve a dibujar
  $('montana').replaceChildren();
  dlg.showModal(); // antes de dibujar: la montaña se dibuja a la medida de su caja
  dibujar();
  pintarBoton();
  (bPlay.hidden ? rango : bPlay).focus();
  if (!fecha && !reducido()) arranque = setTimeout(jugar, 700); // un instante para ver el principio: la primera compra
}

bPlay.addEventListener('click', () => (jugando ? detener(true) : jugar()));
rango.addEventListener('input', () => {
  if (jugando) { jugando = false; cancelAnimationFrame(raf); }
  clearTimeout(arranque);
  dia = Number(rango.value);
  pintarDia(dia, null);
  pintarBoton();
});
$('pe-cerrar').addEventListener('click', () => dlg.close());
dlg.addEventListener('close', () => {
  detener(false);
  abierta = false;
  esc = null;
  host.replaceChildren();
  pintarMontana(false); // la escena de la página vuelve, a la medida de ahora
  abridor?.focus?.({ preventScroll: true });
  abridor = null;
});
// Con la pestaña oculta se detiene (y no avanza a escondidas); si cambian los efectos a «ninguno», solo queda el deslizador.
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && jugando) detener(false); });
window.addEventListener('efectos', () => { if (!abierta) return; if (reducido()) detener(false); pintarBoton(); });
document.addEventListener('libro:tv', () => { if (abierta) dlg.close(); });
