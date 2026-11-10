// Entrada escalonada de las tarjetas al abrir (solo con efectos «todos»). Corre una sola vez y nunca deja nada oculto:
// la animación va de «un poco apagado» a «tal cual», y el atributo se retira solo.
import { conAmbiente } from './movimiento.js';

export function entradaTarjetas() {
  if (!conAmbiente()) return;
  const cuerpo = document.querySelector('.cuerpo');
  const hijos = [...cuerpo.querySelectorAll(':scope > :not([hidden]), :scope > .col-principal > :not([hidden]), :scope > .col-lateral > :not([hidden])')]
    .filter((el) => !el.matches('.anotar') && !el.querySelector('.anotar') && el.offsetParent !== null);
  hijos.slice(0, 9).forEach((el, i) => el.style.setProperty('--entra', String(i)));
  cuerpo.classList.add('entra');
  setTimeout(() => cuerpo.classList.remove('entra'), 1400);
}
