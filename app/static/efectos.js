// Cuánta animación quiere esta persona, aplicado ANTES de pintar (script clásico y bloqueante en <head>, como tema.js).
// Tres niveles efectivos, que el CSS y los módulos leen de `html[data-efectos]`:
//   «todos»       todo: los efectos ambientales (estrellas, niebla, parallax…) y los de la acción;
//   «esenciales»  solo lo que acompaña a una acción (la subida de «Tú», la celebración, el conteo), sin adornos;
//   «ninguno»     sin animación: se ve el estado final.
// La preferencia se recuerda por dispositivo: «auto» (por defecto) decide sola —«ninguno» si el sistema pide movimiento
// reducido, «esenciales» si el teléfono es modesto o pidió ahorrar datos, «todos» si no—, o una de las tres a mano.
// Además se pausa lo que no se ve: con la pestaña oculta (`data-oculta`) o con la escena fuera de la pantalla
// (`data-escena-fuera`), el CSS pone en pausa las animaciones, que retoman donde iban.
(() => {
  const CLAVE = 'libro.efectos';
  const NIVELES = ['todos', 'esenciales', 'ninguno'];
  const raiz = document.documentElement;
  const sistema = matchMedia('(prefers-reduced-motion: reduce)');
  const ahorro = matchMedia('(prefers-reduced-data: reduce)');

  const preferencia = () => {
    try {
      const v = localStorage.getItem(CLAVE);
      return NIVELES.includes(v) ? v : 'auto';
    } catch {
      return 'auto';
    }
  };
  /** Teléfono modesto: poca memoria o pocos núcleos, o la persona pidió ahorrar datos. Es una pista, no una certeza: la preferencia manda. */
  const ligero = () => {
    const c = navigator.connection;
    return Boolean(
      c?.saveData || ahorro.matches ||
      (navigator.deviceMemory && navigator.deviceMemory <= 2) ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2),
    );
  };
  const efectivo = () => {
    const pref = preferencia();
    if (pref !== 'auto') return pref;
    if (sistema.matches) return 'ninguno';
    return ligero() ? 'esenciales' : 'todos';
  };
  function aplicar() {
    const nivel = efectivo();
    const antes = raiz.dataset.efectos;
    raiz.dataset.efectos = nivel;
    if (ligero()) raiz.dataset.ligero = '1'; else delete raiz.dataset.ligero;
    if (antes && antes !== nivel) window.dispatchEvent(new CustomEvent('efectos', { detail: nivel }));
  }
  function fijar(pref) {
    try {
      if (NIVELES.includes(pref)) localStorage.setItem(CLAVE, pref);
      else localStorage.removeItem(CLAVE);
    } catch { /* sin almacenamiento: vale solo para esta visita */ }
    aplicar();
  }
  sistema.addEventListener('change', aplicar);
  ahorro.addEventListener('change', aplicar);
  aplicar();
  window.libroEfectos = { preferencia, efectivo, ligero, fijar };

  // Pausar lo que no se ve.
  const alVisibilidad = () => {
    if (document.visibilityState === 'hidden') raiz.dataset.oculta = '1'; else delete raiz.dataset.oculta;
  };
  document.addEventListener('visibilitychange', alVisibilidad);
  alVisibilidad();
  document.addEventListener('DOMContentLoaded', () => {
    const escena = document.querySelector('.escena');
    if (!escena || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting) delete raiz.dataset.escenaFuera; else raiz.dataset.escenaFuera = '1';
    }).observe(escena);
  });
})();
