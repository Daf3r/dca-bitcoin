// Cuánta animación quiere esta persona, aplicado ANTES de pintar (script clásico y bloqueante en <head>, como tema.js).
// Tres niveles efectivos, que el CSS y los módulos leen de `html[data-efectos]`:
//   «todos»       todo: los efectos ambientales (estrellas, niebla, parallax…) y los de la acción;
//   «esenciales»  solo lo que acompaña a una acción (la subida de «Tú», la celebración, el conteo), sin adornos;
//   «ninguno»     sin animación: se ve el estado final.
// La preferencia se recuerda por dispositivo: «auto» (por defecto) decide sola —«ninguno» si el sistema pide movimiento
// reducido, «esenciales» si el teléfono es modesto o pidió ahorrar datos, «todos» si no—, o una de las tres a mano.
// Además se pausa lo que no se ve: con la pestaña oculta (`data-oculta`) o con la escena fuera de la pantalla
// (`data-escena-fuera`), el CSS pone en pausa las animaciones, que retoman donde iban; y, mientras se desliza, el ambiente de la
// escena (`data-desliza`, ver abajo).
(() => {
  const CLAVE = 'libro.efectos';
  const NIVELES = ['todos', 'esenciales', 'ninguno'];
  const raiz = document.documentElement;
  // (Campamento 17) La app sale con `<html data-pestanas>` ya puesto (es lo normal: por pestañas) para que la escena tenga su alto
  // definitivo desde el primer pintado; quien eligió «Todo junto» lo quita aquí, antes de pintar (pestanas.js lo mantiene después).
  // `data-boton`: en este dispositivo flota el botón «Anotar» (la última cuenta que entró aquí era la de quien anota; lo guarda
  // cuenta.js en `libro.rol`). Es solo una pista para el alto de la escena; quién puede escribir lo decide siempre el servidor.
  try {
    if (localStorage.getItem('libro.pestanas') === 'todo') raiz.removeAttribute('data-pestanas');
    const rol = localStorage.getItem('libro.rol');
    if (rol === 'admin') raiz.setAttribute('data-boton', '');
    // `data-lector`: aquí entró por última vez alguien que solo mira; la página le habla «del libro» desde el primer pintado.
    if (rol === 'lector') raiz.setAttribute('data-lector', '');
  } catch { /* sin almacenamiento: por pestañas y sin pista */ }
  // (Campamento 21B) La app abierta con `#tv` entra directo en la tele: se marca antes de pintar (si no, se vería un instante la página
  // normal). Solo en la app: la entrada (`/login#tv`, adonde lleva una sesión caducada) no es la tele.
  if (location.pathname === '/' && location.hash === '#tv') raiz.dataset.tv = '1';
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
    // (Rendimiento iPhone) Mientras se desliza con la escena a la vista, el ambiente que se repite sin fin (estrellas, nubes,
    // luciérnagas, humo…) se queda quieto (`data-desliza` en la escena; la lista está en styles.css) y retoma donde iba 200 ms después
    // del último desplazamiento. Safari pinta esas animaciones en el procesador: cada una repinta su trozo de la escena, y en cada
    // fotograma del desplazamiento eso se sumaba al resto. Lo que acompaña a una acción (la subida de «Tú», la celebración) no se pausa.
    let quieta = 0;
    const soltar = () => { delete escena.dataset.desliza; };
    addEventListener('scroll', () => {
      if (raiz.dataset.escenaFuera && !escena.dataset.desliza) return; // fuera de la vista ya está en pausa
      if (!escena.dataset.desliza) escena.dataset.desliza = '1';
      clearTimeout(quieta);
      quieta = setTimeout(soltar, 200);
    }, { passive: true });
  });
})();
