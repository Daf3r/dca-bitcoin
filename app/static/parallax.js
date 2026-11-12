// Parallax por capas y cielo que se funde con la página al bajar (solo con todos los efectos; ver efectos.js).
// Con el desplazamiento y, en escritorio, con el puntero, las capas de la escena (cielo, sierra lejana, sierra media) se
// mueven a distinta velocidad; la montaña, el sendero y los campamentos no se mueven (son los datos).
// Rendimiento: cada capa recibe su `transform` directamente (y el velo su `opacity`), sin pasar por variables CSS. Una variable
// CSS heredada obliga a recalcular el estilo de todos los nodos de la escena (unos 400) en cada fotograma del desplazamiento,
// y eso se nota sobre todo en iPhone. Los cambios se agrupan en un solo `requestAnimationFrame`.
import { conAmbiente } from './movimiento.js';

/** Cuánto se mueve cada capa: [píxeles con el puntero, fracción del desplazamiento]. Cada una va un 5 % más grande desde el centro. */
const CAPAS = { 'par-cielo': [5, 0.3], 'par-lejos': [9, 0.2], 'par-medio': [15, 0.1] };

export function instalarParallax() {
  const escena = document.querySelector('.escena');
  const host = document.getElementById('montana');
  if (!escena || !host) return;
  const velo = document.createElement('div');
  velo.className = 'escena-velo'; // el cielo se funde con la página al bajar: un velo del color del fondo
  velo.setAttribute('aria-hidden', 'true');
  escena.append(velo); // al final, como el antiguo ::after: queda sobre la montaña y bajo los textos (z-index 1)
  let pendiente = false;
  let px = 0; // posición horizontal del puntero en la escena, de −1 a 1
  const capas = () => host.querySelectorAll('.par');
  const aplicar = () => {
    pendiente = false;
    if (!conAmbiente()) { // fuera de «todos»: sin parallax ni velo
      for (const c of capas()) c.style.removeProperty('transform');
      velo.style.removeProperty('opacity');
      return;
    }
    const alto = escena.offsetHeight || 1;
    const y = Math.min(Math.max(window.scrollY, 0), alto);
    for (const c of capas()) {
      const clave = Object.keys(CAPAS).find((k) => c.classList.contains(k));
      if (!clave) continue;
      const [dx, dy] = CAPAS[clave];
      c.style.transform = `translate(${(-px * dx).toFixed(2)}px, ${(y * dy).toFixed(1)}px) scale(1.05)`;
    }
    velo.style.opacity = ((y / alto) * 0.7).toFixed(3);
  };
  const pedir = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(aplicar);
  };
  window.addEventListener('scroll', pedir, { passive: true });
  window.addEventListener('resize', pedir);
  window.addEventListener('efectos', pedir);
  // La escena se redibuja (otro ancho o alto): las capas nuevas reciben su transform sin esperar al siguiente desplazamiento.
  new MutationObserver(pedir).observe(host, { childList: true });
  escena.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !conAmbiente()) return;
    const r = escena.getBoundingClientRect();
    px = ((e.clientX - r.left) / (r.width || 1) - 0.5) * 2;
    pedir();
  });
  escena.addEventListener('pointerleave', () => { px = 0; pedir(); });
  pedir();
}
