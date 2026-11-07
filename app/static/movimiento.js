// Lo que los módulos necesitan saber del nivel de efectos (ver efectos.js, que lo deja en `html[data-efectos]`).
/** «todos», «esenciales» o «ninguno». */
export const nivelEfectos = () => document.documentElement.dataset.efectos ?? 'todos';
/** Sin animación: se muestra directamente el estado final. */
export const sinMovimiento = () => nivelEfectos() === 'ninguno';
/** Adornos de ambiente (estrellas, niebla, parallax…): solo con «todos». */
export const conAmbiente = () => nivelEfectos() === 'todos';
