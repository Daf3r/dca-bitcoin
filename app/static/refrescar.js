// «Arrastra para actualizar»: con la página arriba del todo, tirar hacia abajo muestra un sol que sube y, al soltar
// pasado el umbral, vuelve a pedir precio, compras e histórico. La app instalada en iPhone no tiene botón de recargar.
// Solo toca CSS por variables (`--tira`) y por atributos; no mide nada ni cambia el layout.
import { avisar } from './avisar.js';
import { $, S, reducido } from './estado.js';
import { cargarCompras, cargarHistorico, consultarPrecio } from './datos.js';

const UMBRAL = 72; // px de tirón (ya amortiguado) para que cuente
const TOPE = 120;
let ocupado = false;

/** Vuelve a pedir todo lo vivo y confirma con un aviso breve. */
export async function refrescarTodo() {
  if (ocupado) return;
  ocupado = true;
  const sol = $('recarga');
  sol.dataset.estado = 'cargando';
  sol.style.setProperty('--tira', `${UMBRAL * 0.8}px`);
  try {
    await Promise.all([consultarPrecio(), cargarCompras(), S.cargado ? cargarHistorico() : null]);
    avisar(S.errorCarga ? 'No se pudo actualizar.' : 'Actualizado', null, true);
  } finally {
    sol.dataset.estado = 'listo';
    sol.style.setProperty('--tira', '0px');
    setTimeout(() => { sol.dataset.estado = ''; ocupado = false; }, reducido() ? 0 : 320);
  }
}

let y0 = null, tira = 0;
const hayCapaAbierta = () => !$('hoja').hidden || document.querySelector('dialog[open]');
document.addEventListener('touchstart', (e) => {
  y0 = null;
  if (ocupado || e.touches.length !== 1 || window.scrollY > 0 || hayCapaAbierta()) return;
  // Gráficos y campos se leen con el dedo: no son para tirar de la página.
  if (e.target.closest?.('.lienzo, .g-caja, input, textarea, [contenteditable]')) return;
  y0 = e.touches[0].clientY;
  tira = 0;
}, { passive: true });
document.addEventListener('touchmove', (e) => {
  if (y0 == null) return;
  const dy = e.touches[0].clientY - y0;
  if (window.scrollY > 0 || dy <= 0) { tira = 0; $('recarga').style.setProperty('--tira', '0px'); return; }
  tira = Math.min(TOPE, dy * 0.5);
  const sol = $('recarga');
  sol.style.setProperty('--tira', `${tira}px`);
  sol.dataset.estado = tira >= UMBRAL ? 'lista' : 'tirando';
}, { passive: true });
function soltar() {
  if (y0 == null) return;
  y0 = null;
  const sol = $('recarga');
  if (tira >= UMBRAL) refrescarTodo();
  else { sol.style.setProperty('--tira', '0px'); sol.dataset.estado = ''; }
  tira = 0;
}
document.addEventListener('touchend', soltar, { passive: true });
document.addEventListener('touchcancel', soltar, { passive: true });
