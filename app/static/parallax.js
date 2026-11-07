// Parallax por capas y cielo que se funde con la página al bajar (solo con todos los efectos; ver efectos.js).
// Con el desplazamiento y, en escritorio, con el puntero, las capas de la escena (cielo, sierra lejana, sierra media) se
// mueven a distinta velocidad; la montaña, el sendero y los campamentos no se mueven (son los datos). Todo va por variables
// CSS en `.montana` (`--par-x`, `--par-y`) y en `.escena` (`--scroll-p`, 0 a 1): no se toca el layout ni se redibuja el SVG.
import { conAmbiente } from './movimiento.js';

export function instalarParallax() {
  const escena = document.querySelector('.escena');
  const host = document.getElementById('montana');
  if (!escena || !host) return;
  let pendiente = false;
  const aplicar = () => {
    pendiente = false;
    if (!conAmbiente()) return; // el CSS ya ignora las variables fuera de «todos»
    const alto = escena.offsetHeight || 1;
    const y = Math.min(Math.max(window.scrollY, 0), alto);
    host.style.setProperty('--par-y', y.toFixed(1));
    escena.style.setProperty('--scroll-p', (y / alto).toFixed(3));
  };
  const pedir = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(aplicar);
  };
  window.addEventListener('scroll', pedir, { passive: true });
  window.addEventListener('resize', pedir);
  window.addEventListener('efectos', pedir);
  escena.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !conAmbiente()) return;
    const r = escena.getBoundingClientRect();
    host.style.setProperty('--par-x', (((e.clientX - r.left) / (r.width || 1) - 0.5) * 2).toFixed(3));
  });
  escena.addEventListener('pointerleave', () => host.style.removeProperty('--par-x'));
  pedir();
}
