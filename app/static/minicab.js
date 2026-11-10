// Mini-cabecera: cuando el saldo grande sale por arriba de la pantalla, una franja fija deja a mano el saldo y el precio; al tocarla se sube.
// El texto lo pone `pintar.js: pintarMinicab`. Esto solo decide cuándo se ve (IntersectionObserver: nada se mide ni se lee del layout).
import { $, reducido } from './estado.js';

const raiz = document.documentElement;
const saldo = document.querySelector('.saldo');
if (saldo && 'IntersectionObserver' in window) {
  new IntersectionObserver(([e]) => {
    raiz.toggleAttribute('data-minicab', !e.isIntersecting && e.boundingClientRect.bottom < 0);
  }).observe(saldo);
}
$('minicab').addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducido() ? 'auto' : 'smooth' }));
