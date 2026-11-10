import { $, R } from './estado.js';
import { entero, fechaCorta, usd } from './lib.js';

// Modo pantalla grande (idea 59): la montaña, el saldo y el último movimiento a pantalla completa, con letra grande y sin controles,
// para dejar la app en un televisor de casa. Se entra desde «Tu cuenta» o abriendo la dirección con `#tv` (el televisor inicia sesión una
// vez con una cuenta de lector y se queda ahí). Solo lectura: no pide nada nuevo al servidor; se actualiza sola cada minuto, como siempre.
const raiz = document.documentElement;
export const enTV = () => raiz.dataset.tv === '1';
let bloqueo = null, reposo = null;

export function pintarTV() {
  if (!enTV()) return;
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
$('tv-salir').addEventListener('click', salirTV);
for (const ev of ['pointermove', 'pointerdown', 'keydown', 'touchstart']) document.addEventListener(ev, () => enTV() && mostrarControles(), { passive: true });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && enTV() && !document.fullscreenElement) salirTV(); });
document.addEventListener('visibilitychange', () => { if (enTV() && document.visibilityState === 'visible') mantenerDespierta(); });
window.addEventListener('hashchange', () => { if (location.hash === '#tv' && !enTV()) entrarTV({ pantallaCompleta: false }); else if (location.hash !== '#tv' && enTV()) salirTV(); });
// Abrir la dirección con #tv entra directo (sin pantalla completa: el navegador la pide siempre tras un toque).
if (location.hash === '#tv') raiz.dataset.tv = '1';
