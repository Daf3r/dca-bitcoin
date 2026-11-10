// Lo que los módulos necesitan saber del nivel de efectos (ver efectos.js, que lo deja en `html[data-efectos]`).
/** «todos», «esenciales» o «ninguno». */
export const nivelEfectos = () => document.documentElement.dataset.efectos ?? 'todos';
/** Sin animación: se muestra directamente el estado final. */
export const sinMovimiento = () => nivelEfectos() === 'ninguno';
/** Adornos de ambiente (estrellas, niebla, parallax…): solo con «todos». */
export const conAmbiente = () => nivelEfectos() === 'todos';
/**
 * Cambia la pantalla con la transición nativa del navegador (`document.startViewTransition`) donde existe y hay movimiento;
 * donde no, simplemente la aplica. `fn` es lo que cambia la pantalla (puede correr un instante después de la llamada).
 */
export function conTransicion(fn) {
  if (typeof document.startViewTransition !== 'function' || sinMovimiento() || document.visibilityState !== 'visible') { fn(); return; }
  try { document.startViewTransition(fn); } catch { fn(); }
}
