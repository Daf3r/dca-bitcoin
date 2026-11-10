// Índice de secciones al lado, solo en pantallas muy anchas (el CSS lo esconde en el resto): resalta la sección que cruza la mitad de la
// pantalla y salta a la elegida. Los enlaces de secciones ocultas (reportes con menos de 3 compras…) no salen.
import { $, reducido } from './estado.js';

const SECCIONES = {
  escena: () => document.querySelector('.escena'),
  grafico: () => ['mercado', 'valor', 'costo-prom', 'sats-acum'].map($).find((el) => el && !el.hidden && el.offsetParent !== null),
  reportes: () => $('reportes'),
  compras: () => $('compras'),
};
const enlaces = () => [...document.querySelectorAll('#indice a[data-s]')];

/** Esconde los enlaces cuya sección no se ve ahora; la llama `pintar()`. */
export function actualizarIndice() {
  for (const a of enlaces()) {
    const el = SECCIONES[a.dataset.s]();
    a.hidden = !el || el.hidden;
  }
}

const visibles = new Map();
const marcar = () => {
  const activa = [...visibles.entries()].filter(([, v]) => v).map(([k]) => k)[0];
  for (const a of enlaces()) {
    if (a.dataset.s === activa) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  }
};
if ('IntersectionObserver' in window) {
  const obs = new IntersectionObserver((entradas) => {
    for (const e of entradas) visibles.set(e.target.dataset.indice, e.isIntersecting);
    marcar();
  }, { rootMargin: '-45% 0px -50% 0px' }); // la sección que cruza la mitad de la pantalla
  for (const [clave, ids] of [['escena', ['.escena']], ['grafico', ['#mercado', '#valor', '#costo-prom', '#sats-acum']], ['reportes', ['#reportes']], ['compras', ['#compras']]]) {
    for (const q of ids) { const el = document.querySelector(q); if (el) { el.dataset.indice = clave; obs.observe(el); } }
  }
}
$('indice').addEventListener('click', (e) => {
  const a = e.target.closest('a[data-s]');
  const el = a && SECCIONES[a.dataset.s]();
  if (!el) return;
  e.preventDefault();
  (el.querySelector('h1, h2') ?? el).scrollIntoView({ block: 'start', behavior: reducido() ? 'auto' : 'smooth' });
});
