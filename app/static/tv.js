import { $, R, S } from './estado.js';
import { entero, fechaCorta, medianocheSV, muestrasSismo, tarjetaFiesta, usd } from './lib.js';
import { sismografo } from './arte.js';

// Modo pantalla grande (idea 59): la montaña, el saldo y el último movimiento a pantalla completa, con letra grande y sin controles,
// para dejar la app en un televisor de casa. Se entra desde «Tu cuenta» o abriendo la dirección con `#tv` (el televisor inicia sesión una
// vez con una cuenta de lector y se queda ahí). Solo lectura: no pide nada nuevo al servidor; se actualiza sola cada minuto, como siempre.
const raiz = document.documentElement;
export const enTV = () => raiz.dataset.tv === '1';
let bloqueo = null, reposo = null;

// El sismógrafo (campamento 15B, idea 55): una tira de papel con el precio en vivo de las últimas horas (se toma una muestra con cada precio
// nuevo, cada 30 s). A medianoche de El Salvador la tira se «arranca» y empieza otra. Solo muestra lo que pasó: nunca predice.
let muestras = [], ultimaMuestra = 0, tiraDesde = 0;
function pintarSismo() {
  const caja = $('tv-sismo');
  if (!S.precio) { caja.hidden = true; return; }
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
  caja.hidden = false;
  caja.classList.remove('va'); void caja.offsetWidth; caja.classList.add('va');
  clearTimeout(fiestaTimer);
  fiestaTimer = setTimeout(() => { caja.hidden = true; }, t.grande ? 12_000 : 9_000);
}

export function pintarTV() {
  if (!enTV()) return;
  pintarSismo();
  const u = R.items?.at(-1);
  $('tv-ultimo').textContent = u
    ? `Último movimiento: ${fechaCorta(u.fecha)} · ${u.tipo === 'venta' ? '−' : '+'}${entero(u.sats)} sats (${usd(u.monto)})${u.tipo === 'venta' ? ' · venta' : ''}`
    : 'Todavía no hay movimientos.';
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
export async function entrarTV({ pantallaCompleta = true } = {}) {
  raiz.dataset.tv = '1';
  if (location.hash !== '#tv') history.replaceState(null, '', `${location.pathname}${location.search}#tv`);
  window.scrollTo(0, 0);
  pintarTV();
  mostrarControles();
  if (pantallaCompleta) { try { await raiz.requestFullscreen?.(); } catch { /* el navegador no la deja: queda en la ventana */ } }
  mantenerDespierta();
}
export function salirTV() {
  delete raiz.dataset.tv;
  delete raiz.dataset.tvActivo;
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
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && enTV() && !document.fullscreenElement) salirTV(); });
document.addEventListener('visibilitychange', () => { if (enTV() && document.visibilityState === 'visible') mantenerDespierta(); });
window.addEventListener('hashchange', () => { if (location.hash === '#tv' && !enTV()) entrarTV({ pantallaCompleta: false }); else if (location.hash !== '#tv' && enTV()) salirTV(); });
// Abrir la dirección con #tv entra directo (sin pantalla completa: el navegador la pide siempre tras un toque).
if (location.hash === '#tv') raiz.dataset.tv = '1';
